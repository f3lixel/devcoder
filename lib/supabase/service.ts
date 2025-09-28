import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Service Client (server-only)
 * Uses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to manage Storage and admin tasks.
 */
export function supabaseService() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}


