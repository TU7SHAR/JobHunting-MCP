/**
 * Unit tests for the deterministic scoring layer.
 * Run with: node --test
 * These tests never touch the model — they validate the code-only logic.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSkill,
  candidateSkillSet,
  deterministicSkillMatch,
  parseRequiredExperience,
  deterministicScore,
} from "../lib/scoring.js";

test("normalizeSkill lowercases and trims", () => {
  assert.equal(normalizeSkill("  React.js "), "react.js");
  assert.equal(normalizeSkill("Node.JS"), "node.js");
});

test("candidateSkillSet applies aliases", () => {
  const set = candidateSkillSet({ skills: ["JS", "TS", "Postgres"] });
  assert.ok(set.has("javascript"));
  assert.ok(set.has("typescript"));
  assert.ok(set.has("postgresql"));
});

test("deterministicSkillMatch finds matched and missing skills", () => {
  const candidate = { skills: ["Python", "React", "PostgreSQL"] };
  const jd = "We need Python, React, Docker and Kubernetes experience.";
  const { matched, missing } = deterministicSkillMatch(candidate, jd);
  assert.ok(matched.includes("python"));
  assert.ok(matched.includes("react"));
  assert.ok(missing.includes("docker"));
  assert.ok(missing.includes("kubernetes"));
});

test("parseRequiredExperience reads year requirements", () => {
  assert.equal(parseRequiredExperience("3+ years of experience"), 3);
  assert.equal(parseRequiredExperience("2-4 years"), 2);
  assert.equal(parseRequiredExperience("no experience required"), null);
});

test("deterministicScore penalizes experience gaps", () => {
  const candidate = { skills: ["Python"], experienceYears: 0, openToRemote: true };
  const strong = deterministicScore(candidate, "Python role, 0 years, entry level.");
  const gap = deterministicScore(candidate, "Python role requiring 5 years experience.");
  assert.ok(gap.score < strong.score);
  assert.equal(gap.experienceGapYears, 5);
});

test("deterministicScore stays within 0-100", () => {
  const candidate = {
    skills: ["Python", "React", "Next.js", "Node.js", "PostgreSQL"],
    experienceYears: 3,
    openToRemote: true,
  };
  const { score } = deterministicScore(candidate, "Python React Next.js remote role");
  assert.ok(score >= 0 && score <= 100);
});
