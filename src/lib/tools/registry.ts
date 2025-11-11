import type { PostgrestSingleResponse } from "@supabase/supabase-js";

export type SearchFileHit = {
  path: string;
  excerpt?: string;
};

export type GrepHit = {
  path: string;
  line: number;
  match: string;
  before?: string;
  after?: string;
};

export interface SupabaseLike {
  from(table: string): any;
}

function buildExcerpt(content: string, query: string, max = 180): string | undefined {
  if (!content) return undefined;
  const q = query.slice(0, 80);
  const idx = content.toLowerCase().indexOf(q.toLowerCase());
  const start = Math.max(0, idx - Math.floor(max / 2));
  const end = Math.min(content.length, start + max);
  const slice = content.slice(start, end).replace(/\s+/g, " ").trim();
  return slice || undefined;
}

export async function readFile(
  supabase: SupabaseLike,
  projectId: string,
  path: string
): Promise<{ path: string; content: string } | null> {
  const p = String(path || "").trim();
  const pid = String(projectId || "").trim();
  if (!p || !pid) return null;
  const req = supabase
    .from("files")
    .select("path, content")
    .eq("project_id", pid)
    .eq("path", p)
    .limit(1);
  const res: PostgrestSingleResponse<{ path: string; content: string }[]> = await req;
  if ((res as any)?.error) return null;
  const rows = (res as any)?.data ?? [];
  if (!rows.length) return null;
  return { path: rows[0].path, content: String(rows[0].content || "") };
}

export async function searchFile(
  supabase: SupabaseLike,
  projectId: string,
  query: string,
  limit = 100
): Promise<SearchFileHit[]> {
  const q = String(query || "").trim();
  if (!q) return [];

  const ilike = `%${q}%`;
  const req = supabase
    .from("files")
    .select("path, content")
    .eq("project_id", projectId)
    .or(`path.ilike.${ilike},content.ilike.${ilike}`)
    .limit(Math.max(1, Math.min(limit, 500)));

  const res: PostgrestSingleResponse<{ path: string; content: string }[]> = await req;
  if ((res as any)?.error) return [];

  const rows = (res as any)?.data ?? [];
  return rows.map((r: any) => ({
    path: r.path,
    excerpt: buildExcerpt(String(r.content || ""), q),
  }));
}

function makeRegex(pattern: string | RegExp): RegExp | null {
  try {
    if (pattern instanceof RegExp) return pattern;
    const p = String(pattern || "").trim();
    if (!p) return null;
    return new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  } catch {
    return null;
  }
}

export async function grepProject(
  supabase: SupabaseLike,
  projectId: string,
  pattern: string | RegExp,
  opts: { limitFiles?: number; limitHitsPerFile?: number; prefilterQuery?: string } = {}
): Promise<GrepHit[]> {
  const regex = makeRegex(pattern);
  if (!regex) return [];

  const limitFiles = Math.max(1, Math.min(opts.limitFiles ?? 120, 500));
  const limitHits = Math.max(1, Math.min(opts.limitHitsPerFile ?? 3, 20));

  const preQ = String(opts.prefilterQuery || "").trim() || (typeof pattern === "string" ? pattern : "");
  const ilike = preQ ? `%${preQ}%` : null;
  let req = supabase.from("files").select("path, content").eq("project_id", projectId).limit(limitFiles);
  if (ilike) {
    req = req.or(`path.ilike.${ilike},content.ilike.${ilike}`);
  }
  const res: PostgrestSingleResponse<{ path: string; content: string }[]> = await req;
  if ((res as any)?.error) return [];

  const rows = ((res as any)?.data ?? []) as Array<{ path: string; content: string }>;
  const hits: GrepHit[] = [];

  for (const row of rows) {
    const content = String(row.content || "");
    if (!content) continue;
    const lines = content.split(/\r?\n/);
    let found = 0;
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      if (regex.test(ln)) {
        hits.push({
          path: row.path,
          line: i + 1,
          match: ln,
          before: i > 0 ? lines[i - 1] : undefined,
          after: i + 1 < lines.length ? lines[i + 1] : undefined,
        });
        found += 1;
        if (found >= limitHits) break;
      }
    }
  }

  return hits;
}


