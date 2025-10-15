import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AnyObj = Record<string, any>;

function getAiRouteUrl() {
  // ruft die existierende AI-Route innerhalb derselben App auf
  return new URL('/api/ai', process.env.APP_URL ?? 'http://localhost:3000').toString();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as AnyObj));

    // Call existing AI streaming route
    const upstreamRes = await fetch(getAiRouteUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!upstreamRes.ok || !upstreamRes.body) {
      const text = await upstreamRes.text().catch(() => '');
      return new Response(JSON.stringify({ error: 'upstream_failed', detail: text || upstreamRes.status }), { status: 502 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (obj: AnyObj) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        const reader = upstreamRes.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        // accumulated holds earlier chunks so we can detect full <file> blocks
        let accumulated = '';

        // helper to detect <file> tags and emit file events
        const tryEmitFilesFromAccumulated = async () => {
          const fileRegex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;
          let match;
          while ((match = fileRegex.exec(accumulated)) !== null) {
            const path = match[1];
            const content = match[2];
            await send({ type: 'file', path, content });
            await send({ type: 'file-progress', current: 1, total: 1, fileName: path });
          }
          // optional: trim accumulated to keep memory small (keep last 10k chars)
          if (accumulated.length > 20000) accumulated = accumulated.slice(-15000);
        };

        try {
          await send({ type: 'start', message: 'Starting AI stream' });

          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // upstream may send SSE-style lines, or raw JSON-lines; split by newline
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || '';

            for (const raw of lines) {
              const line = raw.trim();
              if (!line) continue;
              // strip optional "data:" prefix (SSE)
              const payload = line.startsWith('data:') ? line.slice(5).trim() : line;

              if (!payload) continue;

              // Try parse JSON first
              let parsed: any = null;
              try { parsed = JSON.parse(payload); } catch { parsed = null; }

              if (parsed) {
                // If upstream already emits structured tokens, respect and re-emit richer event types
                if (parsed.type === 'token' && typeof parsed.text === 'string') {
                  accumulated += parsed.text;
                  await send({ type: 'stream', raw: true, text: parsed.text });
                } else if (parsed.choices) {
                  // OpenRouter/OpenAI style chunk
                  const delta = parsed.choices?.[0]?.delta;
                  const content = delta?.content;
                  if (typeof content === 'string' && content.length) {
                    accumulated += content;
                    await send({ type: 'stream', raw: false, text: content });
                  }
                } else if (parsed.type === 'done' || parsed.type === 'end' || payload === '[DONE]') {
                  await send({ type: 'complete', message: 'Upstream signaled done' });
                } else {
                  // forward meta-ish events
                  await send({ type: 'meta', payload: parsed });
                }
              } else {
                // non-JSON text -> treat as stream text
                accumulated += payload;
                await send({ type: 'stream', raw: false, text: payload });
              }

              // Attempt to parse complete <file> blocks in accumulated text
              await tryEmitFilesFromAccumulated();
            }
          }

          // flush remainder in buffer
          if (buffer.trim()) {
            const tail = buffer.trim();
            try {
              const parsedTail = JSON.parse(tail);
              if (parsedTail?.type === 'done' || tail === '[DONE]') {
                await send({ type: 'complete', message: 'Upstream complete (tail)' });
              } else {
                await send({ type: 'meta', payload: parsedTail });
              }
            } catch {
              accumulated += tail;
              await send({ type: 'stream', raw: false, text: tail });
              await tryEmitFilesFromAccumulated();
            }
          }

          await send({ type: 'complete', message: 'Stream finished' });
          controller.close();
        } catch (err: any) {
          console.error('[apply-ai-code-stream] stream error', err);
          await send({ type: 'error', message: 'stream_failed', detail: String(err?.message || err) });
          controller.close();
        }
      },
      cancel() {
        // client aborted stream
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('[apply-ai-code-stream] fatal', err);
    return new Response(JSON.stringify({ error: err?.message || 'failed' }), { status: 500 });
  }
}