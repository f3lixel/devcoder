export async function generateProjectNameFromPrompt(prompt: string): Promise<string> {
  const baseFallback = localHeuristicName(prompt);
  try {
    const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-gateway`;
    const res = await fetch(fnUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `Generate a short, catchy project name (2-4 words, Title Case, no quotes) for: ${prompt}. Respond with the name only.`,
        model: 'qwen/qwen3-next-80b-a3b-thinking'
      }),
    });
    if (!res.ok) return baseFallback;
    if (!res.body) {
      const text = await res.text();
      const name = (text || "").split(/\r?\n/)[0]?.trim();
      const cleaned = (name || baseFallback).replace(/^[\"'`]|[\"'`]$/g, "").slice(0, 60);
      return cleaned || baseFallback;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let collected = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // The ai-gateway now returns plain text tokens; accumulate directly
      const chunkText = decoder.decode(value, { stream: true });
      collected += chunkText;
      // Retain existing SSE parser fallback for robustness (in case headers change)
      buffer += chunkText;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const t = line.trim();
        if (t.startsWith("data:")) {
          const payload = t.slice(5).trim();
          if (payload && payload !== "[DONE]") {
            try {
              const json = JSON.parse(payload);
              const tok: string = json?.choices?.[0]?.delta?.content || "";
              if (tok) collected += tok;
            } catch {
              // ignore non-JSON chunks
            }
          }
        }
      }
    }
    const name = (collected || "").split(/\r?\n/)[0]?.trim();
    if (!name) return baseFallback;
    const cleaned = name.replace(/^[\"'`]|[\"'`]$/g, "").slice(0, 60);
    return cleaned || baseFallback;
  } catch {
    return baseFallback;
  }
}

function localHeuristicName(prompt: string): string {
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const stop = new Set([
    "the",
    "a",
    "an",
    "and",
    "to",
    "for",
    "of",
    "with",
    "in",
    "on",
    "app",
    "project",
  ]);
  const candidates = words.filter((w) => !stop.has(w));
  const pick = (arr: string[], n: number) => arr.slice(0, n).map(capitalize);
  const parts = pick(candidates.length ? candidates : words, 3);
  const fallback = parts.length ? parts.join(" ") : "New Project";
  return fallback
    .replace(/\bai\b/gi, "AI")
    .replace(/\bui\b/gi, "UI")
    .replace(/\bapi\b/gi, "API");
}

function capitalize(s: string): string {
  return s.slice(0, 1).toUpperCase() + s.slice(1);
}


