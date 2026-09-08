/**
 * Central configuration for JobPilot.
 *
 * All model-connection details are read from environment variables so the same
 * code runs unchanged on the Oracle VM (localhost Ollama) or on Vercel (Ollama
 * exposed via an authenticated HTTPS reverse proxy). See `.env.example`.
 */

export const config = {
  // Where the Ollama server lives. Trailing slash is stripped for safety.
  ollamaBaseUrl: (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, ""),

  // Model tag. Must already be pulled on the Ollama server.
  ollamaModel: process.env.OLLAMA_MODEL || "qwen2.5:3b",

  // Request timeout in milliseconds. CPU inference on the free tier is slow.
  ollamaTimeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS || 120000),

  // Lower temperature keeps scoring consistent between runs.
  ollamaTemperature: Number(process.env.OLLAMA_TEMPERATURE || 0.2),

  // Optional bearer token for a reverse proxy in front of Ollama.
  ollamaAuthToken: (process.env.OLLAMA_AUTH_TOKEN || "").trim(),
};
