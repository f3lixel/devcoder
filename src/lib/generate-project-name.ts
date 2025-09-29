export async function generateProjectNameFromPrompt(prompt: string): Promise<string> {
  // AI functionality disabled - using local heuristic only
  return localHeuristicName(prompt);
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


