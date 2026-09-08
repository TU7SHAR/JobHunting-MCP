/**
 * Thin client for talking to the self-hosted Ollama server (the same model
 * used by ai-audio-support: qwen2.5:3b). All Ollama wire details live here.
 *
 * We use the non-streaming /api/chat call with `format: "json"` so the model
 * returns a single JSON object we can validate. Streaming is intentionally not
 * used here because we need the whole object before trusting it.
 */

import { config } from "./config.js";

/** Build headers, adding a bearer token only if one is configured. */
function buildHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (config.ollamaAuthToken) {
    headers["Authorization"] = `Bearer ${config.ollamaAuthToken}`;
  }
  return headers;
}

/**
 * Send a chat request and return the raw assistant text.
 * `messages` is an array of { role, content }.
 * `json` requests JSON-formatted output from Ollama.
 */
export async function chat(messages, { json = false } = {}) {
  const payload = {
    model: config.ollamaModel,
    messages,
    stream: false,
    options: { temperature: config.ollamaTemperature },
  };
  if (json) payload.format = "json";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.ollamaTimeoutMs);

  let resp;
  try {
    resp = await fetch(`${config.ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new OllamaError("Model request timed out", 504);
    }
    throw new OllamaError(`Cannot reach model server: ${err.message}`, 502);
  }
  clearTimeout(timer);

  if (!resp.ok) {
    throw new OllamaError(`Model server returned ${resp.status}`, 502);
  }

  const data = await resp.json();
  return (data?.message?.content || "").trim();
}

/** Check that the Ollama server is up and the configured model is present. */
export async function health() {
  const result = { reachable: false, modelPresent: false, model: config.ollamaModel };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const resp = await fetch(`${config.ollamaBaseUrl}/api/tags`, {
      headers: buildHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) return result;
    const data = await resp.json();
    result.reachable = true;
    const names = (data?.models || []).map((m) => m?.name || "");
    result.modelPresent = names.some(
      (n) => n === config.ollamaModel || n.startsWith(config.ollamaModel),
    );
  } catch {
    clearTimeout(timer);
  }
  return result;
}

/** Custom error carrying an HTTP status so the route can map it cleanly. */
export class OllamaError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = "OllamaError";
    this.status = status;
  }
}
