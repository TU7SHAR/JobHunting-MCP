/**
 * Deterministic scoring helpers.
 *
 * Design principle (from the project plan): do NOT ask a small 3B model to do
 * things plain code does reliably. Exact skill overlap, experience gaps and
 * location fit are computed here in code. The model is used only for semantic
 * relevance and human-readable explanation.
 */

/** Normalize a skill/token for comparison: lowercase, trimmed, punctuation-light. */
export function normalizeSkill(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Common aliases so "js" matches "javascript", etc. Extend as needed.
const ALIASES = {
  js: "javascript",
  ts: "typescript",
  "next": "next.js",
  nextjs: "next.js",
  node: "node.js",
  nodejs: "node.js",
  postgres: "postgresql",
  postgre: "postgresql",
  "rest": "rest api",
  llms: "llm",
};

function canonical(skill) {
  const n = normalizeSkill(skill);
  return ALIASES[n] || n;
}

/**
 * Extract candidate skill tokens from an array plus optional summary text.
 * Returns a Set of canonical skill strings.
 */
export function candidateSkillSet(candidate) {
  const set = new Set();
  for (const s of candidate.skills || []) {
    const c = canonical(s);
    if (c) set.add(c);
  }
  return set;
}

/**
 * Pull likely required skills out of a job description by matching against the
 * candidate's known skills AND a small built-in tech vocabulary. This is a
 * lightweight, deterministic pass — the model refines relevance later.
 *
 * Returns { matched: string[], missing: string[] } where matched/missing are
 * relative to what the JD appears to ask for.
 */
export function deterministicSkillMatch(candidate, jobDescription) {
  const jd = normalizeSkill(jobDescription);
  const candSkills = candidateSkillSet(candidate);

  // Which of the candidate's skills are explicitly named in the JD?
  const matched = [];
  for (const skill of candSkills) {
    // word-ish containment; skills like "c++" and "node.js" contain symbols
    if (jd.includes(skill)) matched.push(skill);
  }

  // Detect required skills the candidate lacks, from a common vocabulary.
  const VOCAB = [
    "python", "javascript", "typescript", "react", "next.js", "node.js",
    "flask", "django", "fastapi", "express", "rest api", "graphql",
    "postgresql", "mysql", "mongodb", "redis", "docker", "kubernetes",
    "aws", "gcp", "azure", "llm", "rag", "langchain", "mcp",
    "celery", "git", "linux", "tailwind", "html", "css",
  ];
  const missing = [];
  for (const term of VOCAB) {
    if (jd.includes(term) && !candSkills.has(term)) missing.push(term);
  }

  return { matched: dedupe(matched), missing: dedupe(missing) };
}

function dedupe(arr) {
  return Array.from(new Set(arr));
}

/**
 * Parse a minimum-experience requirement from the JD, e.g. "3+ years",
 * "2-4 years", "minimum 5 years". Returns the minimum in years or null.
 */
export function parseRequiredExperience(jobDescription) {
  const text = String(jobDescription || "").toLowerCase();
  // Match patterns like "3+ years", "3-5 years", "3 to 5 years", "min 3 years"
  const m = text.match(/(\d+)\s*(?:\+|to|-|–)?\s*(\d+)?\s*(?:\+)?\s*years?/);
  if (!m) return null;
  const low = Number(m[1]);
  return Number.isFinite(low) ? low : null;
}

/**
 * Compute a deterministic partial score (0-100) plus structured signals.
 * The model may adjust the final narrative but this anchors the numbers.
 */
export function deterministicScore(candidate, jobDescription) {
  const { matched, missing } = deterministicSkillMatch(candidate, jobDescription);
  const requiredYears = parseRequiredExperience(jobDescription);

  // Skill component (max 60): ratio of matched to (matched + missing).
  const totalSignals = matched.length + missing.length;
  const skillRatio = totalSignals === 0 ? 0.5 : matched.length / totalSignals;
  const skillPoints = Math.round(skillRatio * 60);

  // Experience component (max 25).
  let experiencePoints = 25;
  let experienceGapYears = 0;
  if (requiredYears != null && candidate.experienceYears < requiredYears) {
    experienceGapYears = requiredYears - candidate.experienceYears;
    // Lose ~8 points per missing year, floored at 0.
    experiencePoints = Math.max(0, 25 - experienceGapYears * 8);
  }

  // Location component (max 15). Remote-friendly candidate rarely blocked.
  let locationPoints = 15;
  const jd = normalizeSkill(jobDescription);
  const wantsOnsite = /on[- ]?site|in office|relocat/.test(jd);
  if (wantsOnsite && !candidate.openToRemote) locationPoints = 8;

  const score = Math.min(100, skillPoints + experiencePoints + locationPoints);

  return {
    score,
    matchedSkills: matched,
    missingSkills: missing,
    requiredYears,
    experienceGapYears,
  };
}
