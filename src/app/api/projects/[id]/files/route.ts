import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  // Verify ownership
  const { data: project } = await supabase.from("projects").select("id, owner_id").eq("id", params.id).single();
  if (!project || project.owner_id !== user.id) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: files, error } = await supabase.from("files").select("id, path, content, updated_at").eq("project_id", params.id).order("path");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ files: files ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  // Verify ownership
  const { data: project } = await supabase.from("projects").select("id, owner_id").eq("id", params.id).single();
  if (!project || project.owner_id !== user.id) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const payload = await req.json();
  const files = (payload?.files as Array<{ path: string; content: string }>) ?? [];
  if (!Array.isArray(files) || files.length === 0) return NextResponse.json({ ok: true, upserted: 0 });

  // Upsert each file
  const rows = files.map((f) => ({ project_id: params.id, path: f.path, content: f.content }));
  const { error } = await supabase.from("files").upsert(rows, { onConflict: "project_id,path" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, upserted: rows.length });
}


