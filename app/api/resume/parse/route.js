/**
 * POST /api/resume/parse
 *
 * Accepts either:
 *   - multipart/form-data with a `file` field (PDF / DOCX / TXT), or
 *   - application/json with `{ "text": "...resume text..." }`
 *
 * Returns: { parsed: <parsedResumeSchema>, candidate: <candidateProfile> }
 * so the UI can show the full structured resume AND prefill the match form.
 */

import { NextResponse } from "next/server";
import { extractResumeText, ExtractError } from "@/lib/resume-extract";
import { parseResume } from "@/lib/resume-parse";
import { parsedResumeToCandidate } from "@/lib/schema";
import { OllamaError } from "@/lib/ollama";

export const runtime = "nodejs";
// Resume parsing on a CPU model can take a while; allow a generous window.
export const maxDuration = 120;

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

export async function POST(request) {
  const contentType = request.headers.get("content-type") || "";

  let resumeText;

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!file || typeof file.arrayBuffer !== "function") {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      const bytes = await file.arrayBuffer();
      if (bytes.byteLength > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: "File too large (max 8 MB)" }, { status: 413 });
      }
      const buffer = Buffer.from(bytes);
      resumeText = await extractResumeText(buffer, file.name || "", file.type || "");
    } else {
      // Assume JSON with pasted text.
      let body;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
      const text = String(body?.text || "").trim();
      if (text.length < 30) {
        return NextResponse.json(
          { error: "Resume text is too short. Paste the full resume." },
          { status: 400 },
        );
      }
      resumeText = text.slice(0, 40000);
    }
  } catch (err) {
    if (err instanceof ExtractError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Could not read the upload" }, { status: 400 });
  }

  try {
    const parsed = await parseResume(resumeText);
    const candidate = parsedResumeToCandidate(parsed);
    return NextResponse.json({ parsed, candidate }, { status: 200 });
  } catch (err) {
    if (err instanceof OllamaError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
