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
