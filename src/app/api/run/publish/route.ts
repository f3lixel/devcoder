import { NextRequest } from "next/server";
import type { RunEvent } from "../stream/route";
import { publishRunEvent } from "../stream/route";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const json = (await req.json()) as Partial<RunEvent>;
    if (!json || !json.runId || !json.type) {
      return Response.json({ error: "Missing runId or type" }, { status: 400 });
    }
    const event: RunEvent = {
      id: json.id ?? crypto.randomUUID(),
      runId: json.runId,
      type: json.type,
      message: json.message,
      filePath: json.filePath,
      toolName: json.toolName,
      timestamp: json.timestamp ?? Date.now(),
    };
    publishRunEvent(event);
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e?.message || "bad request" }, { status: 400 });
  }
}


