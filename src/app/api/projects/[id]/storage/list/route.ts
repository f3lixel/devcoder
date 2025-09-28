import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { resolveStorageTarget } from "../../../../../../lib/storage";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  // owner check
  const { data: project } = await supabase.from('projects').select('id, owner_id').eq('id', params.id).single();
  if (!project || project.owner_id !== user.id) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const svc = supabaseService();
  const target = resolveStorageTarget(params.id);
  const path = target.basePath;
  const { data: files, error } = await svc.storage.from(target.bucket).list(path, { limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ files: files ?? [] });
}


