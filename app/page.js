"use client";

import { useState } from "react";
import "./globals.css";

const SAMPLE_SKILLS = "Python, JavaScript, React, Next.js, Flask, Node.js, RAG, LLM, PostgreSQL, MongoDB";

export default function Home() {
  const [name, setName] = useState("");
  const [skills, setSkills] = useState(SAMPLE_SKILLS);
  const [experienceYears, setExperienceYears] = useState(1);
  const [location, setLocation] = useState("Punjab, India");
  const [openToRemote, setOpenToRemote] = useState(true);
  const [summary, setSummary] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

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
        Score a candidate profile against a job description using a self-hosted
        Qwen model.
      </p>

      <div className="grid">
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Candidate</h3>

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
          <h3 style={{ marginTop: 0 }}>Job description</h3>
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
