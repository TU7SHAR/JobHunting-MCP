# Commands & File Reference

Documents what each command and key file in JobPilot does.

## npm scripts

| Command | What it does |
|---------|--------------|
| `npm install` | Installs dependencies (Next.js, React, zod, eslint). |
| `npm run dev` | Starts the local dev server at `http://localhost:3000`. |
| `npm run build` | Production build; also runs lint + type checks. Fails the build on errors. |
| `npm start` | Serves the production build (after `npm run build`). |
| `npm run lint` | Runs `next lint` (eslint). |
| `npm test` | Runs `node --test` — deterministic scoring unit tests, no model required. |

## Key files

| Path | Purpose |
|------|---------|
| `lib/config.js` | Reads all model-connection env vars. Single source of config. |
| `lib/scoring.js` | Deterministic, code-only scoring (skills/experience/location). |
| `lib/ollama.js` | Ollama HTTP client (`/api/chat`, `/api/tags`) + `OllamaError`. |
| `lib/schema.js` | zod validation for request input and model output. |
| `lib/match.js` | Match pipeline orchestration + the model system prompt. |
| `app/api/match/route.js` | `POST /api/match` handler. |
| `app/api/health/route.js` | `GET /api/health` handler. |
| `app/page.js` | Browser UI (candidate form, job description, result card). |
| `app/layout.js` | Root HTML layout + metadata. |
| `app/globals.css` | Styling. |
| `tests/scoring.test.js` | Unit tests for `lib/scoring.js`. |
| `.env.example` | Template for environment configuration. |

## Environment variables

| Var | Default | Meaning |
|-----|---------|---------|
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Ollama server URL. |
| `OLLAMA_MODEL` | `qwen2.5:3b` | Model tag (must be pulled on the server). |
| `OLLAMA_TIMEOUT_MS` | `120000` | Request timeout in ms. |
| `OLLAMA_TEMPERATURE` | `0.2` | Sampling temperature (lower = more consistent). |
| `OLLAMA_AUTH_TOKEN` | (blank) | Bearer token for a reverse proxy in front of Ollama. |
