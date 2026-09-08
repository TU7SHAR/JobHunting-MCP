/**
 * Unit tests for the resume-parsing pure logic (no model, no file I/O).
 * Run with: node --test
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { parsedResumeToCandidate, parsedResumeSchema } from "../lib/schema.js";
import { coerceParsedResume } from "../lib/resume-parse.js";

test("parsedResumeToCandidate maps core fields", () => {
  const parsed = parsedResumeSchema.parse({
    name: "Tushar Gautam",
    skills: ["Python", "React"],
    experienceYears: 2,
    location: "Punjab, India",
    projects: [
      { name: "Bubbl", description: "RAG chatbot", technologies: ["Flask", "PostgreSQL"] },
    ],
    experience: [
      { title: "Intern", organization: "Acme", duration: "2024", highlights: [] },
    ],
  });
  const candidate = parsedResumeToCandidate(parsed);
  assert.equal(candidate.name, "Tushar Gautam");
  assert.deepEqual(candidate.skills, ["Python", "React"]);
  assert.equal(candidate.experienceYears, 2);
  assert.equal(candidate.location, "Punjab, India");
  assert.ok(candidate.summary.includes("Bubbl"));
  assert.ok(candidate.summary.includes("Intern at Acme"));
});

test("parsedResumeToCandidate handles an empty resume", () => {
  const parsed = parsedResumeSchema.parse({});
  const candidate = parsedResumeToCandidate(parsed);
  assert.equal(candidate.name, undefined);
  assert.deepEqual(candidate.skills, []);
  assert.equal(candidate.experienceYears, 0);
  assert.equal(candidate.summary, undefined);
});

test("coerceParsedResume normalizes loose types", () => {
  const coerced = coerceParsedResume({
    name: 123,
    skills: "not-an-array",
    experienceYears: "3",
    projects: [{ name: "X", technologies: null }],
  });
  assert.equal(coerced.name, "123");
  assert.deepEqual(coerced.skills, []);
  assert.equal(coerced.experienceYears, 3);
  assert.deepEqual(coerced.projects[0].technologies, []);
  // Must still validate against the schema after coercion.
  assert.ok(parsedResumeSchema.safeParse(coerced).success);
});

test("coerceParsedResume clamps experienceYears to valid range", () => {
  assert.equal(coerceParsedResume({ experienceYears: 999 }).experienceYears, 60);
  assert.equal(coerceParsedResume({ experienceYears: -5 }).experienceYears, 0);
  assert.equal(coerceParsedResume({ experienceYears: "abc" }).experienceYears, 0);
});
