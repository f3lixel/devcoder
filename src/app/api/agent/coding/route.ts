import { NextRequest } from 'next/server';
import { mastra } from '@/mastra';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const projectId: string = String(body?.projectId || '');
    const goal: string | undefined = typeof body?.goal === 'string' ? body.goal : undefined;
    if (!projectId) {
      return new Response(JSON.stringify({ error: 'projectId required' }), { status: 400 });
    }

    // Stream minimal progress; Mastra exposes a step stream on agent.run/stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (obj: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        send({ type: 'status', message: 'Agent startet…' });
        send({ type: 'token', text: `Projekt aktiviert: ${projectId}\n` });

        try {
          const iterator = await (mastra as any).agents.codingAgent.stream({
            input: goal || 'Improve the project based on best practices.',
            context: { projectId },
          });

          for await (const event of iterator) {
            // Pass through basic statuses; map to our UI schema
            if (event?.type === 'step:start') {
              send({ type: 'stepStart', id: event.id || 'step' });
            } else if (event?.type === 'step:complete') {
              send({ type: 'stepDone', id: event.id || 'step' });
            } else if (event?.type === 'status' && typeof event.message === 'string') {
              send({ type: 'token', text: `${event.message}\n` });
            } else if (event?.type === 'text' && typeof event.text === 'string') {
              send({ type: 'token', text: event.text });
            } else if (event?.type === 'tool:result' && event?.toolId === 'writeProjectFiles') {
              const paths = Array.isArray(event?.result?.filesWritten) ? event.result.filesWritten : [];
              send({ type: 'files', paths });
            }
          }

          send({ type: 'done' });
          controller.close();
        } catch (e: any) {
          const msg = e?.message || 'agent_failed';
          send({ type: 'token', text: `Fehler: ${msg}\n` });
          send({ type: 'error', message: msg });
          controller.close();
        }
      },
      cancel() {},
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'failed' }), { status: 500 });
  }
}


