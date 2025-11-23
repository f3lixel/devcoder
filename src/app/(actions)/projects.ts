"use server";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/slug";
import { supabaseService } from "@/lib/supabase/service";

type SeedFile = { path: string; content: string };

async function loadTemplateFromStorage(prefix: string = 'templates/next12'): Promise<SeedFile[]> {
  const svc = supabaseService();
  const bucket = 'project-files';
  const manifestPath = `${prefix}/manifest.json`;
  const { data: manifestObj, error: manifestErr } = await svc.storage.from(bucket).download(manifestPath);
  if (manifestErr || !manifestObj) {
    return [];
  }
  const manifestText = await manifestObj.text();
  const manifest = JSON.parse(manifestText) as { files: string[] };
  const files: SeedFile[] = [];
  for (const rel of manifest.files) {
    const fileKey = `${prefix}/${rel}`;
    const { data, error } = await svc.storage.from(bucket).download(fileKey);
    if (error || !data) continue;
    const content = await data.text();
    files.push({ path: `/${rel}`, content });
  }
  return files;
}

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
      const bucketId = `project-${data.id}`;
      await svc.storage.createBucket(bucketId, { public: false });
      await svc.storage.from(bucketId).upload(`code/.keep`, new Blob([""], { type: 'text/plain' }), { upsert: true });
      await svc.storage.from(bucketId).upload(`assets/.keep`, new Blob([""], { type: 'text/plain' }), { upsert: true });
      await svc.storage.from(bucketId).upload(`exports/.keep`, new Blob([""], { type: 'text/plain' }), { upsert: true });
    } else {
      const bucketId = 'projects';
      try { await svc.storage.createBucket(bucketId, { public: false }); } catch {}
      const base = `${data.id}/`;
      await svc.storage.from(bucketId).upload(`${base}code/.keep`, new Blob([""], { type: 'text/plain' }), { upsert: true });
      await svc.storage.from(bucketId).upload(`${base}assets/.keep`, new Blob([""], { type: 'text/plain' }), { upsert: true });
      await svc.storage.from(bucketId).upload(`${base}exports/.keep`, new Blob([""], { type: 'text/plain' }), { upsert: true });
    }
  } catch {}

  // Seed: aus Storage-Template lesen
  try {
    let defaultFiles: Array<{ path: string; content: string }> = [];
    try {
      defaultFiles = await loadTemplateFromStorage('templates/next12');
    } catch {}

    if (defaultFiles.length === 0) {
      // Fallback: minimales React-Template für Sandpack
      defaultFiles = [
        {
          path: '/package.json',
          content: JSON.stringify(
            {
              name: 'sandpack-react-starter',
              private: true,
              version: '0.1.0',
              dependencies: {
                react: '18.2.0',
                'react-dom': '18.2.0',
              },
            },
            null,
            2
          ),
        },
        {
          path: '/styles.css',
          content: `body{margin:0;font-family:Inter,system-ui,sans-serif;background:#050505;color:#f5f5f5;}\nmain{max-width:960px;margin:0 auto;padding:64px 24px;}\nsection{border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:32px;background:rgba(255,255,255,0.02);}\na,button{cursor:pointer}\n`,
        },
        {
          path: '/src/App.jsx',
          content: `import './styles.css'\n\nexport default function App(){\n  return (\n    <main>\n      <section>\n        <p className='eyebrow'>Sandpack React</p>\n        <h1>Willkommen im Browser-Playground</h1>\n        <p>Bearbeite Dateien in der Sidebar und beobachte sofort die Vorschau.</p>\n      </section>\n    </main>\n  )\n}\n`,
        },
        {
          path: '/src/main.jsx',
          content: `import React from 'react'\nimport { createRoot } from 'react-dom/client'\nimport App from './App'\n\nconst root = createRoot(document.getElementById('root'))\nroot.render(<React.StrictMode><App /></React.StrictMode>)\n`,
        },
        {
          path: '/public/index.html',
          content: `<!DOCTYPE html>\n<html lang=\"de\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n    <title>Sandpack React Starter</title>\n  </head>\n  <body>\n    <div id=\"root\"></div>\n  </body>\n</html>\n`,
        },
      ];
    }

    const rows = defaultFiles.map((f) => ({ project_id: data.id, path: f.path, content: f.content }));
    await supabase.from('files').upsert(rows, { onConflict: 'project_id,path' });
  } catch {}
  redirect(`/projects?projectId=${data.id}`);
}



