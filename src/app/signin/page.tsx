"use client";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SignInContent() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const sp = useSearchParams();
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evt: "SIGNED_IN" | "SIGNED_OUT" | "USER_UPDATED" | "PASSWORD_RECOVERY" | "TOKEN_REFRESHED" | "USER_DELETED" | "MFA_CHALLENGE_VERIFIED" | "MFA_CHALLENGE_FAILED" | "MFA_ENROLLMENT_ATTEMPTED" | "MFA_ENROLLMENT_COMPLETED" | "MFA_ENROLLMENT_FAILED") => {
      if (evt === "SIGNED_IN") router.replace(sp.get("redirect") || "/dashboard");
    });
    return () => subscription.unsubscribe();
  }, [router, sp, supabase]);

  return (
    <div className="mx-auto max-w-sm py-10">
      <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={["google","github"]} />
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-sm py-10">Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
}



