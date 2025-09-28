"use client";
import { useFormState } from "react-dom";
import { createProject } from "@/app/(actions)/projects";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import AuthPopup from "@/components/AuthPopup";
type CreateProjectState = { error?: string } | null;
export default function StartProject() {
  const [state, action] = useFormState<CreateProjectState, FormData>(createProject as any, null);
  const router = useRouter();
  const sp = useSearchParams();
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (state?.error === "not_authenticated") {
      setShowAuth(true);
    }
  }, [state, router]);
  return (
    <>
      <form action={action} className="flex gap-2">
        <input name="name" placeholder="Projektname" className="border rounded px-3 py-2" />
        <button className="rounded bg-black text-white px-3 py-2" type="submit">Starten</button>
        {state?.error && state.error !== "not_authenticated" && (
          <span className="text-red-500 text-sm">{state.error}</span>
        )}
      </form>
      <AuthPopup
        open={showAuth}
        onClose={() => setShowAuth(false)}
        redirectToUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/projects`}
      />
    </>
  );
}


