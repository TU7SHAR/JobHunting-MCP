# Agent Activity Log

A running record of every change, per the project's living-documentation rule.

---

## 2026-09-08 — JobPilot v0.1 MVP scaffold

**Supposed to do:** Build the first iteration of the job-hunting agent in the
`TU7SHAR/JobHunting-MCP` repo, reusing the same Oracle-hosted Qwen model as
`ai-audio-support`, using an easily hostable stack (Next.js/Vercel).

**How the agent interpreted it:** Deliver the reliable-first slice agreed on
earlier — `candidate profile + job description → deterministic + model scoring →
validated structured result` — as a single Next.js app so it deploys to Vercel
with no separate server. Model access stays behind the app (Ollama never exposed
directly). Defer PostgreSQL, job discovery, resume tailoring, and MCP servers to
later PRs, each as its own new branch + PR.

**What the agent did / changed:**
- Scaffolded a Next.js 15 (App Router) project: `package.json`, `next.config.mjs`,
  `jsconfig.json`, `.gitignore`, `.env.example`.
- `lib/config.js`: env-driven Ollama config (URL, model, timeout, temperature,
  optional bearer token for a reverse proxy).
- `lib/scoring.js`: deterministic skill matching (with aliases), experience-gap
  parsing, location fit, and a 0–100 anchor score. Pure functions.
- `lib/ollama.js`: async `fetch` client for Ollama `/api/chat` (non-streaming,
  `format: json`) and `/api/tags` health, with timeout + typed `OllamaError`.
- `lib/schema.js`: zod schemas for request input and model output.
- `lib/match.js`: orchestration + system prompt enforcing "never invent facts"
  and prompt-injection defense; validates model output and falls back to the
  deterministic result on invalid JSON.
- `app/api/match/route.js`, `app/api/health/route.js`: HTTP handlers.
- `app/page.js`, `app/layout.js`, `app/globals.css`: candidate form + result UI.
- `tests/scoring.test.js`: 6 unit tests for the deterministic layer (no model).
- `docs/architecture.md`, this log, and `commands/` documentation.
- Updated `README.md` (replaced the placeholder).

**Files affected:** all files listed above (new repo, first real commit set).

**Impact:** `npm test` passes (6/6). `npm run build` compiles successfully.
The app is Vercel-deployable; the only external dependency is an Ollama server
reachable via `OLLAMA_BASE_URL`. No secrets committed. Establishes the
foundation for later discovery/matching/application PRs.

**Verification:** `node --test` → 6 pass / 0 fail. `next build` → compiled
successfully, routes `/`, `/api/health`, `/api/match` generated.


---

## 2026-09-08 — Resume intake (upload + parse)

**Supposed to do:** Let the user provide their resume (upload or paste) and turn
it into the structured candidate profile that feeds the match pipeline.

**How the agent interpreted it:** Build a resume-intake feature on top of PR #1:
server-side text extraction (PDF/DOCX/TXT) + a Qwen-backed structured parse that
is strictly grounded (no invented facts), returning a profile the existing
`/api/match` form can consume directly. Ship as its own new branch
(`feat/resume-intake`) and a new PR, per the branch/PR rule.

**What the agent did / changed:**
- Added deps: `pdf-parse` and `mammoth` (pure-JS, serverless-safe).
- `lib/resume-extract.js`: `extractResumeText(buffer, filename, mimetype)` for
  PDF/DOCX/TXT/MD, whitespace cleanup, 40k-char cap, `ExtractError`, and a
  scanned/image-PDF guard. Imports `pdf-parse/lib/pdf-parse.js` to avoid the
  package's debug-on-import bug.
- `lib/schema.js`: added `parsedResumeSchema` (name/email/phone/location/
  targetRoles/skills/experienceYears/experience[]/projects[]/education[]/summary)
  and `parsedResumeToCandidate()` to reduce it to the candidate profile.
- `lib/resume-parse.js`: `parseResume(text)` calls Qwen with a strict
  no-fabrication JSON prompt, validates with zod, and `coerceParsedResume()`
  normalizes minor type slips before a retry.
- `app/api/resume/parse/route.js`: accepts multipart file (8 MB cap) or JSON
  `{text}`, returns `{parsed, candidate}`. `maxDuration=120`.
- `app/page.js`: new "1. Your resume" panel (upload + paste) that auto-fills the
  candidate form; panels renumbered; sample defaults removed.
- `tests/resume.test.js`: 4 unit tests for the pure mapping/coercion logic.

**Files affected:** `package.json`, `package-lock.json`, `lib/resume-extract.js`,
`lib/resume-parse.js`, `lib/schema.js`, `app/api/resume/parse/route.js`,
`app/page.js`, `tests/resume.test.js`, docs and commands.

**Impact:** Resume now becomes the source of truth for the candidate profile.
`npm test` → 10/10 pass. `npm run build` → compiles; `/api/resume/parse` route
present. No secrets committed; resume text is treated as untrusted input.

**Verification:** `node --test` → 10 pass / 0 fail. `next build` → success with
routes `/`, `/api/health`, `/api/match`, `/api/resume/parse`.


---

## 2026-09-08 — Oracle Ollama tunnel setup + docs

**Supposed to do:** Connect JobPilot to the user's existing Oracle-hosted Qwen
model so the app can actually run.

**How the agent interpreted it:** Verify a live connection to the model and
document the exact working setup, then wire the config guidance into the repo.
No hardcoded ephemeral URL (it changes on restart).

**What happened / verified:**
- User ran `cloudflared tunnel --url http://localhost:11434` on the Oracle VM.
- Hit two real issues, both resolved: (1) Ollama returned `403` through the
  tunnel until started with `OLLAMA_ORIGINS='*'` and `OLLAMA_HOST=0.0.0.0:11434`;
  (2) the manually-run server (user `ubuntu`) had an empty model store, fixed by
  `ollama pull qwen2.5:3b`.
- Confirmed end-to-end through the tunnel: `/api/tags` lists `qwen2.5:3b` and
  `/api/chat` returned a real completion (HTTP 200).

**What the agent changed:**
- Added `docs/oracle-ollama-setup.md` — the full working recipe (three-terminal
  manual setup, the 403/origins fix, the per-user model-store gotcha, verify
  commands, a persistent systemd variant, and the named-tunnel + auth note).
- Updated `README.md` "Connecting to the Oracle-hosted model" section.
- Updated `.env.example` with the tunnel example and the OLLAMA_ORIGINS caveat.

**Files affected:** `docs/oracle-ollama-setup.md`, `README.md`, `.env.example`.

**Impact:** The model connection is proven working. Users can reproduce it. No
secret or ephemeral URL committed. For local dev / Vercel, set OLLAMA_BASE_URL to
the current tunnel URL; for a lasting setup, use a named tunnel + token proxy.
