"use client";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function useAuthGuard() {
  const supabase = supabaseBrowser();
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: unknown | null } }) => setIsAuthed(!!user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt: "SIGNED_IN" | "SIGNED_OUT" | "USER_UPDATED" | "PASSWORD_RECOVERY" | "TOKEN_REFRESHED" | "USER_DELETED" | "MFA_CHALLENGE_VERIFIED" | "MFA_CHALLENGE_FAILED" | "MFA_ENROLLMENT_ATTEMPTED" | "MFA_ENROLLMENT_COMPLETED" | "MFA_ENROLLMENT_FAILED", session: { user?: unknown } | null) => {
      setIsAuthed(!!session?.user);
      if (session?.user) setIsOpen(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const requireAuth = useCallback(async () => {
    const { data: { user } }: { data: { user: unknown | null } } = await supabase.auth.getUser();
    if (!user) {
      setIsOpen(true);
      return false;
    }
    return true;
  }, []);

  return { isOpen, setIsOpen, isAuthed, requireAuth };
}


