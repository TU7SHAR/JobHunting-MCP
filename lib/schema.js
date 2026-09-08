/**
 * Request/response schemas for the /api/match endpoint.
 *
 * We validate everything with zod so malformed input is rejected with a clear
 * 400 instead of reaching the model, and so the model's JSON output is checked
 * before we trust it.
 */

import { z } from "zod";

// ---- Input: what the client sends -----------------------------------------

export const candidateProfileSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  // Free-text or comma-separated list; we normalize downstream.
  skills: z.array(z.string().trim().min(1).max(80)).max(200).default([]),
  // Total years of professional experience the candidate actually has.
  experienceYears: z.number().min(0).max(60).default(0),
  // e.g. "Punjab, India" or "Remote". Optional.
  location: z.string().trim().max(160).optional(),
  openToRemote: z.boolean().default(true),
  // Short summaries of real projects/experience. Used only as grounding.
  summary: z.string().trim().max(6000).optional(),
});

export const matchRequestSchema = z.object({
  candidate: candidateProfileSchema,
  jobDescription: z.string().trim().min(20).max(20000),
});

// ---- Parsed resume: what the model returns from a resume ------------------
// This is a superset of candidateProfileSchema: it adds structured projects,
// experience and education that we extract from the resume for grounding.
// Everything must come from the resume text — the model is told not to invent.

export const experienceEntrySchema = z.object({
  title: z.string().trim().max(160).default(""),
  organization: z.string().trim().max(160).default(""),
  duration: z.string().trim().max(120).default(""),
  highlights: z.array(z.string().trim().max(400)).max(12).default([]),
});

export const projectEntrySchema = z.object({
  name: z.string().trim().max(160).default(""),
  description: z.string().trim().max(800).default(""),
  technologies: z.array(z.string().trim().max(80)).max(40).default([]),
});

export const educationEntrySchema = z.object({
  degree: z.string().trim().max(200).default(""),
  institution: z.string().trim().max(200).default(""),
  year: z.string().trim().max(40).default(""),
});

export const parsedResumeSchema = z.object({
  name: z.string().trim().max(120).default(""),
  email: z.string().trim().max(160).default(""),
  phone: z.string().trim().max(60).default(""),
  location: z.string().trim().max(160).default(""),
  targetRoles: z.array(z.string().trim().max(120)).max(20).default([]),
  skills: z.array(z.string().trim().max(80)).max(200).default([]),
  experienceYears: z.number().min(0).max(60).default(0),
  experience: z.array(experienceEntrySchema).max(30).default([]),
  projects: z.array(projectEntrySchema).max(30).default([]),
  education: z.array(educationEntrySchema).max(15).default([]),
  summary: z.string().trim().max(4000).default(""),
});

/**
 * Reduce a parsed resume to the candidate profile the match pipeline expects.
 * We synthesize `summary` from projects/experience if the model didn't give one.
 */
export function parsedResumeToCandidate(parsed) {
  const summaryParts = [];
  if (parsed.summary) summaryParts.push(parsed.summary);
  for (const p of parsed.projects || []) {
    if (p.name || p.description) {
      const tech = p.technologies?.length ? ` (${p.technologies.join(", ")})` : "";
      summaryParts.push(`Project: ${p.name}${tech}. ${p.description}`.trim());
    }
  }
  for (const e of parsed.experience || []) {
    if (e.title || e.organization) {
      summaryParts.push(`${e.title} at ${e.organization} (${e.duration}).`.trim());
    }
  }
  const summary = summaryParts.join("\n").slice(0, 6000);

  return {
    name: parsed.name || undefined,
    skills: parsed.skills || [],
    experienceYears: parsed.experienceYears || 0,
    location: parsed.location || undefined,
    openToRemote: true,
    summary: summary || undefined,
  };
}

// ---- Output: what the model must return -----------------------------------

export const matchResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  recommendation: z.enum(["apply", "consider", "skip"]),
  matchedSkills: z.array(z.string()).default([]),
  missingSkills: z.array(z.string()).default([]),
  concerns: z.array(z.string()).default([]),
  explanation: z.string().default(""),
});
