import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { resolveStorageTarget } from "../../../../../../lib/storage";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  // owner check
  const { data: project } = await supabase.from('projects').select('id, owner_id').eq('id', params.id).single();
  if (!project || project.owner_id !== user.id) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { path, content, contentType } = await req.json();
  if (typeof path !== 'string' || typeof content !== 'string') return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  const target = resolveStorageTarget(params.id);
  const svc = supabaseService();
  const fullPath = `${target.basePath}${path}`.replace(/\/+/, '/');
  const blob = new Blob([content], { type: contentType || 'application/octet-stream' });
  const { error } = await svc.storage.from(target.bucket).upload(fullPath, blob, { upsert: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, bucket: target.bucket, path: fullPath });
}


