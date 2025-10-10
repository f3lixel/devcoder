import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildHeaders() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY is missing');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`,
    'HTTP-Referer': process.env.APP_URL ?? 'http://localhost:3000',
    'X-Title': 'felixel-dev',
  };
  return headers;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const goal: string = String(body?.goal ?? '').trim();
    const system: string | undefined = typeof body?.system === 'string' ? body.system : undefined;
    if (!goal) {
      return new Response(JSON.stringify({ error: 'goal required' }), { status: 400 });
    }

    const modelEnv = (process.env.OPENROUTER_MODEL_ID || '').trim();
    const headers = buildHeaders();

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (system && system.trim()) messages.push({ role: 'system', content: system.trim() });
    messages.push({ role: 'user', content: goal });

    // Prefer user-provided model, then qwen/qwen3-coder-flash, then safe fallbacks
    const tryModels = [modelEnv, 'qwen/qwen3-coder-flash', 'qwen/qwen2.5-7b-instruct', 'openai/gpt-4o-mini'].filter(Boolean);
    let upstream: Response | null = null;
    let lastDetail = '';
    for (const candidate of tryModels) {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify({ model: candidate, stream: true, messages }),
      });
      if (res.ok && res.body) { upstream = res; break; }
      const text = await res.text().catch(() => '');
      lastDetail = text || `status=${res.status}`;
      // If invalid model, try next candidate automatically
      if (text.includes('not a valid model')) continue;
      // If quota or auth error, stop early
      if (res.status === 401 || res.status === 403 || res.status === 429) break;
    }

    if (!upstream || !upstream.body) {
      return new Response(JSON.stringify({ error: 'upstream_failed', detail: lastDetail }), { status: 502 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (obj: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        const reader = upstream.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(':')) continue;
              if (!trimmed.startsWith('data: ')) continue;
              const data = trimmed.slice(6);
              if (data === '[DONE]') { send({ type: 'done' }); controller.close(); return; }
              try {
                const evt = JSON.parse(data);
                const delta = evt?.choices?.[0]?.delta;
                const text = delta?.content;
                if (typeof text === 'string' && text.length) {
                  send({ type: 'token', text });
                }
              } catch {
                // ignore non-json lines
              }
            }
          }
          send({ type: 'done' });
          controller.close();
        } catch (e: any) {
          const detail: any = { message: e?.message || 'stream_failed' };
          try { console.error('[api/ai] stream error', e); } catch {}
          send({ type: 'error', message: 'stream_failed', detail });
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


