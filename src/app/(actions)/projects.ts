"use server";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/slug";
import { supabaseService } from "@/lib/supabase/service";

export async function createProject(_: any, formData: FormData) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };
  const name = String(formData.get("name") || "Unbenannt");
  const slug = `${slugify(name)}-${Math.random().toString(36).slice(2,6)}`;
  // UUID-Logik: Profile-UUID des aktuellen Users ermitteln und im Projekt speichern
  const { data: profile } = await supabase.from('profiles').select('uuid').eq('id', user.id).single();
  const user_uuid = profile?.uuid;
  if (!user_uuid) return { error: "missing_user_uuid" };
  const { data, error } = await supabase
    .from("projects")
    .insert({ owner_id: user.id, user_uuid, name, slug, meta: {} })
    .select("id")
    .single();
  if (error) return { error: error.message };

  // STORAGE VARIANT CONFIG: set to 'A' (per-project bucket) or 'B' (global bucket with folders)
  const STORAGE_VARIANT = process.env.NEXT_PUBLIC_STORAGE_VARIANT || 'B';
  const svc = supabaseService();
  try {
    if (STORAGE_VARIANT === 'A') {
      // Variante A: eigener Bucket pro Projekt
      // Bucket-Name: project-{projectId}
      const bucketId = `project-${data.id}`;
      // Create bucket if not exists
      await svc.storage.createBucket(bucketId, { public: false });
      // Basisstruktur anlegen (Ordner via zero-byte uploads)
      await svc.storage.from(bucketId).upload(`code/.keep`, new Blob([""], { type: 'text/plain' }), { upsert: true });
      await svc.storage.from(bucketId).upload(`assets/.keep`, new Blob([""], { type: 'text/plain' }), { upsert: true });
      await svc.storage.from(bucketId).upload(`exports/.keep`, new Blob([""], { type: 'text/plain' }), { upsert: true });
      // Policies werden per SQL/Migration empfohlen; hier nur Hinweis:
      // TODO: Add bucket-specific RLS policies to restrict to project owner via projects.user_uuid
    } else {
      // Variante B: globaler Bucket 'projects' und Ordner projects/{projectId}/
      const bucketId = 'projects';
      // Ensure bucket exists (migration also does this)
      try { await svc.storage.createBucket(bucketId, { public: false }); } catch {}
      const base = `${data.id}/`;
      await svc.storage.from(bucketId).upload(`${base}code/.keep`, new Blob([""], { type: 'text/plain' }), { upsert: true });
      await svc.storage.from(bucketId).upload(`${base}assets/.keep`, new Blob([""], { type: 'text/plain' }), { upsert: true });
      await svc.storage.from(bucketId).upload(`${base}exports/.keep`, new Blob([""], { type: 'text/plain' }), { upsert: true });
      // Policies sind in Migration 20250909094500_storage_buckets_policies.sql hinterlegt
    }
  } catch {}
  // Seed default files for the new project so it's immediately persisted under the user's ID
  try {
    const defaultFiles: Array<{ path: string; content: string }> = [
      {
        path: '/App.js',
        content: `import React, { useState } from 'react';\nimport './styles.css';\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n  return (\n    <div className="App">\n      <h1>React + Sandpack</h1>\n      <p>Counter: {count}</p>\n      <button onClick={() => setCount(count + 1)}>Increment</button>\n    </div>\n  );\n}`,
      },
      {
        path: '/index.js',
        content: `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nconst root = ReactDOM.createRoot(document.getElementById('root'));\nroot.render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n`,
      },
      {
        path: '/styles.css',
        content: `.App {\n  font-family: system-ui, sans-serif;\n  text-align: center;\n  padding: 2rem;\n}\n\nbutton {\n  background: #0070f3;\n  color: white;\n  border: none;\n  padding: 0.5rem 1rem;\n  border-radius: 0.25rem;\n  font-size: 1rem;\n  cursor: pointer;\n  margin-top: 1rem;\n}\n\nbutton:hover {\n  background: #0051cc;\n}\n`,
      },
      {
        path: '/public/index.html',
        content: `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>React App</title>\n  </head>\n  <body>\n    <div id="root"></div>\n  </body>\n</html>\n`,
      },
    ];
    const rows = defaultFiles.map((f) => ({ project_id: data.id, path: f.path, content: f.content }));
    await supabase.from('files').upsert(rows, { onConflict: 'project_id,path' });
  } catch {}
  redirect(`/projects?projectId=${data.id}`);
}



