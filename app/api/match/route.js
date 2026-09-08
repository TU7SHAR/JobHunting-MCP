/**
 * POST /api/match
 * Body: { candidate: {...}, jobDescription: "..." }
 * Returns a validated match result, or a clear error status.
 */

import { NextResponse } from "next/server";
import { matchRequestSchema } from "@/lib/schema";
import { runMatch } from "@/lib/match";
import { OllamaError } from "@/lib/ollama";

// This route calls an external model server; keep it on the Node.js runtime.
export const runtime = "nodejs";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = matchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { candidate, jobDescription } = parsed.data;

  try {
    const result = await runMatch(candidate, jobDescription);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof OllamaError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
