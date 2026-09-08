# Architecture — JobPilot v0.1

## Overview

JobPilot is a Next.js (App Router) application. It has a browser UI and two API
routes that run on the Node.js runtime. It reuses the same self-hosted Qwen
model (`qwen2.5:3b` via Ollama) as the `ai-audio-support` project.

```
Browser (app/page.js)
      │  POST /api/match
      ▼
Next.js API route (app/api/match/route.js)
      │  validate input (lib/schema.js)
      ▼
Match pipeline (lib/match.js)
      ├── deterministic scoring (lib/scoring.js)   ← code only
      └── semantic pass + explanation (lib/ollama.js → Ollama /api/chat)
      │  validate output (lib/schema.js)
      ▼
JSON result → browser
```

## Why deterministic + model

A 3B CPU model is unreliable for exact facts. So:

- **Code decides** literal skill overlap, experience-gap math, location fit.
  These anchor the numeric score.
- **The model decides** semantic relevance ("is this candidate's RAG project
  relevant to this LLM role?") and writes the human explanation. It may adjust
  the anchored score by at most 15 points.

## Files

| File | Responsibility |
|------|----------------|
| `lib/config.js` | Reads env vars (Ollama URL, model, timeout, temperature, auth token). |
| `lib/schema.js` | zod schemas for request input and model output. |
| `lib/scoring.js` | Deterministic skill/experience/location scoring. Pure functions. |
| `lib/ollama.js` | Thin Ollama `/api/chat` + `/api/tags` client. All wire details here. |
| `lib/match.js` | Orchestrates deterministic → model → validation. System prompt lives here. |
| `app/api/match/route.js` | `POST /api/match` HTTP handler + error mapping. |
| `app/api/health/route.js` | `GET /api/health` — model reachability. |
| `app/page.js` | Client UI: candidate form + job description + result card. |

## Security decisions

- **Ollama is never exposed raw.** It has no auth. On Vercel we require an
  HTTPS reverse proxy with a bearer token (`OLLAMA_AUTH_TOKEN`).
- **The job description is untrusted.** It is fenced in the prompt and the model
  is told to ignore instructions inside it (prompt-injection defense).
- **The model must not invent candidate facts.** Enforced by the system prompt.
- **Model output is validated** with zod before being returned; on failure we
  fall back to the deterministic result and flag it as `degraded`.

## Not in v0.1 (intentionally deferred)

Speech, chat history, web search, Redis/Celery, browser automation, PostgreSQL
persistence, and the MCP server layer. These come in later PRs once the core
match pipeline is reliable.
