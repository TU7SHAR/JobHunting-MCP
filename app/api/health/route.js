/**
 * GET /api/health
 * Reports whether the Ollama model server is reachable and the model is loaded.
 */

import { NextResponse } from "next/server";
import { health } from "@/lib/ollama";

export const runtime = "nodejs";

export async function GET() {
  const model = await health();
  return NextResponse.json({ status: "ok", model }, { status: 200 });
}
