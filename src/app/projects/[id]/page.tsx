import { supabaseServer } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import ProjectWorkspace from "@/components/ProjectWorkspace";

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: project } = await supabase.from("projects").select("*").eq("id", params.id).single();
  if (!project) notFound();
  return (
    <div className="max-w-[1400px] mx-auto p-6 h-[calc(100vh-64px)]">
      <h1 className="text-2xl font-semibold">{project.name}</h1>
      <p className="text-sm text-muted-foreground">Projekt-ID: {project.id}</p>
      {/* Connect Supabase Button: sends projectId in state via server connect route */}
      <div className="mt-6">
        <Link
          href={`/api/auth/connect/supabase?projectId=${encodeURIComponent(params.id)}`}
          className="inline-flex items-center gap-2 rounded-full bg-white/10 text-white border border-white/20 backdrop-blur-md px-4 h-9 transition-colors hover:bg-white/15 hover:border-white/30"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 109 113" className="h-4 w-4" aria-hidden>
            <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(#a)"/>
            <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(#b)" fillOpacity=".2"/>
            <path d="M45.317 2.07103C48.1765 -1.53037 53.9745 0.442937 54.0434 5.041L54.4849 72.2922H9.83113C1.64038 72.2922 -2.92775 62.8321 2.1655 56.4175L45.317 2.07103Z" fill="#3ECF8E"/>
            <defs>
              <linearGradient id="a" x1="53.9738" y1="54.974" x2="94.1635" y2="71.8295" gradientUnits="userSpaceOnUse"><stop stopColor="#249361"/><stop offset="1" stopColor="#3ECF8E"/></linearGradient>
              <linearGradient id="b" x1="36.1558" y1="30.578" x2="54.4844" y2="65.0806" gradientUnits="userSpaceOnUse"><stop/><stop offset="1" stopOpacity="0"/></linearGradient>
            </defs>
          </svg>
          Connect Supabase
        </Link>
      </div>
      <div className="mt-6 h-[70vh]">
        <ProjectWorkspace projectId={params.id} />
      </div>
    </div>
  );
}



