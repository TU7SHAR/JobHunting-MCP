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

// ---- Output: what the model must return -----------------------------------

export const matchResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  recommendation: z.enum(["apply", "consider", "skip"]),
  matchedSkills: z.array(z.string()).default([]),
  missingSkills: z.array(z.string()).default([]),
  concerns: z.array(z.string()).default([]),
  explanation: z.string().default(""),
});
