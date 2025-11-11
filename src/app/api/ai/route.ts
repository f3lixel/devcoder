import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { parseIntent } from '@/lib/intent/parser';
import { grepProject, searchFile, readFile } from '@/lib/tools/registry';

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
    const projectId: string | undefined = typeof body?.projectId === 'string' ? body.projectId : undefined;
    const memory: string | undefined = typeof body?.memory === 'string' ? body.memory : undefined;
    if (!goal) {
      return new Response(JSON.stringify({ error: 'goal required' }), { status: 400 });
    }

    const modelEnv = (process.env.OPENROUTER_MODEL_ID || '').trim();
    const headers = buildHeaders();

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    const todoProtocol = `You are integrated into a Next.js coding app that parses special fenced tool blocks.

Protocol for a visible To-do plan in the chat UI:
- Emit a first high-level plan immediately as a fenced block:
  \`\`\`tool: todo-plan
  {"plan": {"phase": "running", "progress": {"done": 0, "total": N}, "steps": [
    {"id": "s1", "type": "analyze", "label": "Analyze repository", "state": "pending"},
    {"id": "s2", "type": "create", "label": "Add route", "path": "/src/app/contact/page.tsx", "state": "pending"}
  ]}}
  \`\`\`
- While working, update using deltas with the same tool header. Examples:
  - Mark a step pending/done/error:
    \`\`\`tool: todo-plan
    {"delta": {"updateStep": {"id": "s1", "state": "done"}, "progress": {"done": 1}}}
    \`\`\`
  - Upsert or replace steps:
    \`\`\`tool: todo-plan
    {"delta": {"upsertStep": {"id": "s3", "type": "edit", "label": "Wire UI", "path": "/src/components/NewAIChat.tsx", "state": "pending"}}}
    \`\`\`
- Keep narrative reasoning outside of these blocks. Do not include prose in tool fences. Use concise IDs like s1, s2.
- When all done, send: {"delta": {"phase": "complete"}} in a final block.
Additional coding rules:
- Write only selective edits (no full file rewrites). Use context anchors with: // ... existing code ...
- For each changed file, emit a single fenced code block with a clear path header (e.g., path:/src/file.tsx).
`;

    if (system && system.trim()) messages.push({ role: 'system', content: system.trim() });
    messages.push({ role: 'system', content: todoProtocol });
    if (memory && memory.trim()) {
      messages.push({ role: 'system', content: `Session memory (compressed):\n${memory.slice(-1500)}` });
    }

    // Intent parsing + Supabase-backed context (best effort)
    let contextSummary = '';
    try {
      const intent = parseIntent(goal);
      if (projectId) {
        const supabase = await supabaseServer();
        // RLS will gate access; proceed best-effort even if unauthenticated
        const tasks = intent.toolPlan.map(async (t) => {
          if (t.name === 'searchFile') {
            const query = String(t.params?.query || goal).slice(0, 120);
            const hits = await searchFile(supabase as any, projectId, query, 80);
            return { type: 'searchFile' as const, hits };
          }
          if (t.name === 'grepProject') {
            const pre = String(t.params?.pattern || goal).slice(0, 120);
            const hits = await grepProject(supabase as any, projectId, pre, { prefilterQuery: pre, limitFiles: 80, limitHitsPerFile: 2 });
            return { type: 'grepProject' as const, hits };
          }
          return null;
        });
        const results = (await Promise.allSettled(tasks)).flatMap((r) =>
          r.status === 'fulfilled' && r.value ? [r.value] : []
        );
        const lines: string[] = [];
        const candidatePaths = new Set<string>();
        for (const r of results) {
          if (r.type === 'searchFile') {
            const sample = r.hits.slice(0, 12);
            if (sample.length) {
              lines.push(`SearchFile (top ${sample.length}):`);
              for (const h of sample) {
                lines.push(`- ${h.path}${h.excerpt ? ` — ${h.excerpt}` : ''}`);
                candidatePaths.add(h.path);
              }
            }
          } else if (r.type === 'grepProject') {
            const sample = r.hits.slice(0, 12);
            if (sample.length) {
              lines.push(`GrepProject (top ${sample.length}):`);
              for (const h of sample) {
                const snippet = [h.before, h.match, h.after].filter(Boolean).join(' ⏐ ');
                lines.push(`- ${h.path}:${h.line} — ${snippet}`);
                candidatePaths.add(h.path);
              }
            }
          }
        }
        contextSummary = lines.join('\n').slice(0, 4000);

        // Prefer full Markdown docs for context if available
        const mdCandidates = Array.from(candidatePaths).filter((p) => /\.mdx?$/.test(p));
        if (mdCandidates.length) {
          const pick = mdCandidates.slice(0, 3);
          const docs = await Promise.all(
            pick.map(async (p) => (await readFile(supabase as any, projectId, p)) || null)
          );
          const parts: string[] = [];
          let budget = 4000; // limit added doc text
          for (const doc of docs.filter(Boolean) as Array<{ path: string; content: string }>) {
            let chunk = String(doc.content || '').trim();
            if (!chunk) continue;
            if (chunk.length > budget) chunk = chunk.slice(0, budget);
            parts.push(`${doc.path}\n\`\`\`markdown\n${chunk}\n\`\`\``);
            budget -= chunk.length;
            if (budget <= 512) break;
          }
          if (parts.length) {
            messages.push({ role: 'system', content: `Documentation excerpts:\n\n${parts.join('\n\n')}` });
          }
        }
      }
    } catch {
      // ignore context errors
    }

    if (contextSummary) {
      messages.push({ role: 'system', content: `Repository context (read-only):\n${contextSummary}` });
    }
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


