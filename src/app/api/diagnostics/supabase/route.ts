import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const env = {
    urlPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    servicePresent: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };

  const result: any = { env };

  // Try server client (auth-bound) just to ensure SDK works
  try {
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    result.serverClientOk = true;
    result.userBound = Boolean(user);
  } catch (e: any) {
    result.serverClientOk = false;
    result.serverError = e?.message ?? String(e);
  }

  // Prefer service role for a definitive DB check (bypasses RLS)
  if (env.servicePresent) {
    try {
      const svc = supabaseService();
      const { count, error } = await svc.from("projects").select("id", { count: "exact", head: true });
      if (error) throw error;
      const { data: sample } = await svc.from("projects").select("id, owner_id, name").order("created_at", { ascending: false }).limit(5);
      result.serviceQueryOk = true;
      result.projectsCount = count ?? null;
      result.sample = sample ?? [];
    } catch (e: any) {
      result.serviceQueryOk = false;
      result.serviceError = e?.message ?? String(e);
    }
  } else {
    result.serviceQueryOk = false;
    result.serviceError = "SUPABASE_SERVICE_ROLE_KEY not set";
  }

  return NextResponse.json(result, { status: 200 });
}




