"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AuthSync() {
  useEffect(() => {
    const supabase = supabaseBrowser();
    const sync = async (accessToken?: string | null, refreshToken?: string | null) => {
      try {
        await fetch("/api/auth/sync", { 
          method: "POST", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ access_token: accessToken ?? null, refresh_token: refreshToken ?? null }) 
        });
      } catch {}
    };

    // initial sync in case we already have a session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: { access_token: string; refresh_token: string } | null } }) => {
      if (session) sync(session.access_token, session.refresh_token);
      else sync(null, null);
    });

    const auth = (supabase as any)?.auth;
    if (auth && typeof auth.onAuthStateChange === 'function') {
      const { data } = auth.onAuthStateChange((_evt: "SIGNED_IN" | "SIGNED_OUT" | "USER_UPDATED" | "PASSWORD_RECOVERY" | "TOKEN_REFRESHED" | "USER_DELETED" | "MFA_CHALLENGE_VERIFIED" | "MFA_CHALLENGE_FAILED" | "MFA_ENROLLMENT_ATTEMPTED" | "MFA_ENROLLMENT_COMPLETED" | "MFA_ENROLLMENT_FAILED", session: { access_token?: string; refresh_token?: string } | null) => {
        // whenever auth state changes, attempt to sync cookie/session with server
        sync(session?.access_token, session?.refresh_token);
      });
      const subscription = data?.subscription;
      return () => {
        try { subscription?.unsubscribe(); } catch {}
      };
    }
    // Fallback: no subscription in mock mode
    return () => {};
  }, []);

  return null;
}


