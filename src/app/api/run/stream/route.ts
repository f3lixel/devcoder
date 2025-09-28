import type { NextRequest } from "next/server";

export type RunEvent = {
  id: string;
  runId: string;
  type: string;
  message?: string;
  filePath?: string;
  toolName?: string;
  timestamp: number;
};

let listeners: Array<(e: RunEvent) => void> = [];

export function publishRunEvent(e: RunEvent) {
  for (const l of listeners) {
    try { l(e) } catch {}
  }
}

export async function GET(_req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const send = (e: RunEvent) => {
        const line = `data: ${JSON.stringify(e)}\n\n`;
        controller.enqueue(new TextEncoder().encode(line));
      };
      listeners.push(send);
    },
    cancel() {
      listeners = [];
    }
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    }
  });
}


