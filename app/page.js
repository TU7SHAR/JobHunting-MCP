"use client";

import { useState } from "react";
import "./globals.css";

export default function Home() {
  const [name, setName] = useState("");
  const [skills, setSkills] = useState("");
  const [experienceYears, setExperienceYears] = useState(0);
  const [location, setLocation] = useState("");
  const [openToRemote, setOpenToRemote] = useState(true);
  const [summary, setSummary] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // Resume intake state
  const [resumeText, setResumeText] = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [resumeStatus, setResumeStatus] = useState("");

  /** Apply a parsed candidate profile returned by /api/resume/parse. */
  function applyCandidate(candidate, parsed) {
    if (candidate.name) setName(candidate.name);
    if (Array.isArray(candidate.skills)) setSkills(candidate.skills.join(", "));
    if (typeof candidate.experienceYears === "number")
      setExperienceYears(candidate.experienceYears);
    if (candidate.location) setLocation(candidate.location);
    if (typeof candidate.openToRemote === "boolean") setOpenToRemote(candidate.openToRemote);
    if (candidate.summary) setSummary(candidate.summary);

    const bits = [];
    if (parsed?.skills?.length) bits.push(`${parsed.skills.length} skills`);
    if (parsed?.projects?.length) bits.push(`${parsed.projects.length} projects`);
    if (parsed?.experience?.length) bits.push(`${parsed.experience.length} roles`);
    if (parsed?.education?.length) bits.push(`${parsed.education.length} education`);
    setResumeStatus(
      `Parsed${parsed?.name ? ` ${parsed.name}'s` : ""} resume — ${bits.join(", ") || "profile filled"}. Review below before scoring.`,
    );
  }

  async function handleUpload(file) {
    if (!file) return;
    setResumeError("");
    setResumeStatus("");
    setResumeLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/resume/parse", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) setResumeError(data.error || "Could not parse the resume");
      else applyCandidate(data.candidate, data.parsed);
    } catch (e) {
      setResumeError("Network error: " + e.message);
    } finally {
      setResumeLoading(false);
    }
  }

  async function handleParseText() {
    setResumeError("");
    setResumeStatus("");
    setResumeLoading(true);
    try {
      const res = await fetch("/api/resume/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: resumeText }),
      });
      const data = await res.json();
      if (!res.ok) setResumeError(data.error || "Could not parse the resume");
      else applyCandidate(data.candidate, data.parsed);
    } catch (e) {
      setResumeError("Network error: " + e.message);
    } finally {
      setResumeLoading(false);
    }
  }

  async function handleMatch() {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate: {
            name: name || undefined,
            skills: skills
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            experienceYears: Number(experienceYears) || 0,
            location: location || undefined,
            openToRemote,
            summary: summary || undefined,
          },
          jobDescription,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Request failed");
      } else {
        setResult(data);
      }
    } catch (e) {
      setError("Network error: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h1>JobPilot</h1>
      <p className="subtitle">
        Upload your resume, then score it against a job description using a
        self-hosted Qwen model.
      </p>

      <div className="panel" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>1. Your resume</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Upload a PDF / DOCX / TXT, or paste the text. It fills the candidate
          form below. Nothing is invented — only what your resume states.
        </p>

        <label>Upload file</label>
        <input
          type="file"
          accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={(e) => handleUpload(e.target.files?.[0])}
          disabled={resumeLoading}
        />

        <label>…or paste resume text</label>
        <textarea
          rows={5}
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          placeholder="Paste your full resume text here…"
        />
        <button
          onClick={handleParseText}
          disabled={resumeLoading || resumeText.trim().length < 30}
        >
          {resumeLoading ? "Parsing…" : "Parse pasted text"}
        </button>

        {resumeError && <div className="error">{resumeError}</div>}
        {resumeStatus && (
          <p className="muted" style={{ color: "var(--good)" }}>{resumeStatus}</p>
        )}
      </div>

      <div className="grid">
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>2. Candidate profile</h3>

          <label>Name (optional)</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />

          <label>Skills (comma separated)</label>
          <textarea rows={3} value={skills} onChange={(e) => setSkills(e.target.value)} />

          <label>Years of experience</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={experienceYears}
            onChange={(e) => setExperienceYears(e.target.value)}
          />

          <label>Location</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} />

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              style={{ width: "auto" }}
              checked={openToRemote}
              onChange={(e) => setOpenToRemote(e.target.checked)}
            />
            Open to remote
          </label>

          <label>Profile summary / real projects (optional grounding)</label>
          <textarea
            rows={4}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="e.g. Built a multi-tenant RAG chatbot with Flask, PostgreSQL, Redis/Celery..."
          />
        </div>

        <div className="panel">
          <h3 style={{ marginTop: 0 }}>3. Job description</h3>
          <label>Paste the full job description</label>
          <textarea
            rows={16}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job posting here..."
          />
          <button onClick={handleMatch} disabled={loading || jobDescription.trim().length < 20}>
            {loading ? "Scoring…" : "Score this job"}
          </button>
          {error && <div className="error">{error}</div>}
        </div>
      </div>

      {result && (
        <div className="panel" style={{ marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div className="score">{result.score}</div>
            <span className={`pill ${result.recommendation}`}>{result.recommendation}</span>
            {result.degraded && (
              <span className="muted">(deterministic fallback — model output was invalid)</span>
            )}
          </div>

          {result.matchedSkills?.length > 0 && (
            <>
              <label>Matched</label>
              <div className="tags">
                {result.matchedSkills.map((s) => (
                  <span key={s} className="tag good">
                    ✓ {s}
                  </span>
                ))}
              </div>
            </>
          )}

          {result.missingSkills?.length > 0 && (
            <>
              <label>Gaps</label>
              <div className="tags">
                {result.missingSkills.map((s) => (
                  <span key={s} className="tag bad">
                    ✗ {s}
                  </span>
                ))}
              </div>
            </>
          )}

          {result.concerns?.length > 0 && (
            <>
              <label>Concerns</label>
              <ul className="muted">
                {result.concerns.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </>
          )}

          {result.explanation && (
            <>
              <label>Why</label>
              <p>{result.explanation}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
