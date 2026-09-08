# JobHunting-MCP — JobPilot

Personal AI job agent. The first milestone (this repo's MVP) scores a candidate
profile against a job description using a **self-hosted Qwen model** (the same
`qwen2.5:3b` served by Ollama that powers the `ai-audio-support` project).

The app is a single **Next.js** application so it deploys to **Vercel** in one
click. Deterministic code handles exact skill/experience/location matching; the
model is used only for semantic relevance and a plain-language explanation.

## Flow

```
candidate profile + job description
            │
   deterministic scoring (code)      lib/scoring.js
            │
   Qwen semantic pass (Ollama)       lib/ollama.js + lib/match.js
            │
   validated JSON result (zod)       lib/schema.js
            │
            ▼
      { score, recommendation, matchedSkills,
        missingSkills, concerns, explanation }
```

## Run locally

```bash
npm install
cp .env.example .env.local   # then edit OLLAMA_BASE_URL / OLLAMA_MODEL
npm run dev                  # http://localhost:3000
```

Requires an Ollama server with the model pulled:

```bash
ollama pull qwen2.5:3b
```

## API

- `POST /api/resume/parse` — upload a resume file (`multipart/form-data`, field
  `file`; PDF/DOCX/TXT, max 8 MB) **or** post JSON `{ "text": "..." }`. Returns
  `{ parsed, candidate }`: a structured resume plus a ready-to-use candidate
  profile. The model extracts only what the resume states — it never invents.
- `POST /api/match` — body `{ candidate, jobDescription }`, returns a match result.
- `GET /api/health` — reports Ollama reachability and whether the model is loaded.

## Flow in the UI

1. **Upload/paste your resume** → it fills the candidate profile.
2. Review/edit the profile.
3. Paste a job description → score it.

## Deploying to Vercel

The frontend + API routes deploy directly. **The one thing Vercel cannot reach
is a `localhost` Ollama on your Oracle VM.** Choose one:

1. **Run JobPilot on the Oracle VM too** and set `OLLAMA_BASE_URL=http://127.0.0.1:11434`.
2. **Deploy on Vercel** and expose Ollama through an authenticated HTTPS reverse
   proxy (Caddy/Nginx/Cloudflare Tunnel). Set `OLLAMA_BASE_URL` to that HTTPS URL
   and `OLLAMA_AUTH_TOKEN` to the proxy's bearer token. Never expose raw Ollama
   (it has no authentication).

Set the same env vars from `.env.example` in the Vercel project settings.

## Tests

```bash
npm test   # node --test, deterministic scoring only (no model needed)
```

## Roadmap

This is v0.1. Planned follow-ups (each in its own PR): PostgreSQL persistence,
job discovery, resume tailoring, cover letters, human-approval application flow,
and the MCP server layer.

See [`docs/`](./docs) for architecture and the agent activity log.
