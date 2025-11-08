import { NextRequest } from 'next/server';
import { streamAiChat } from '@/mastra/workflows/ai-chat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const goal: string = String(body?.goal ?? '').trim();
    const system: string | undefined = typeof body?.system === 'string' ? body.system : undefined;
    const projectId: string | undefined = typeof body?.projectId === 'string' ? body.projectId : undefined;
    if (!goal) {
      return new Response(JSON.stringify({ error: 'goal required' }), { status: 400 });
    }

    // Stream tokens from Mastra's codingAgent via our workflow helper
    const agentStream = await streamAiChat({ goal, system, projectId });

    const textStream = agentStream.textStream as AsyncIterable<string>;
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (obj: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        try {
          for await (const chunk of textStream) {
            if (typeof chunk === 'string' && chunk.length) {
              send({ type: 'token', text: chunk });
            }
          }
          send({ type: 'done' });
          controller.close();
        } catch (e: any) {
          send({ type: 'error', message: 'stream_failed', detail: { message: e?.message || 'failed' } });
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
