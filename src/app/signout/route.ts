import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/signin", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
}



