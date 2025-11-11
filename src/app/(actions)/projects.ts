"use server";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/slug";
import { supabaseService } from "@/lib/supabase/service";

type SeedFile = { path: string; content: string };

async function loadTemplateFromStorage(prefix: string = 'templates/next16'): Promise<SeedFile[]> {
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
      defaultFiles = await loadTemplateFromStorage('templates/next16');
    } catch {}

    if (defaultFiles.length === 0) {
      // Fallback: minimales Next-Template, Nodebox-kompatibel
      defaultFiles = [
        {
          path: '/package.json',
          content: JSON.stringify(
            {
              name: 'next-nodebox-app',
              private: true,
              version: '0.0.0',
              scripts: { dev: 'next dev', start: 'next start' },
              dependencies: {
                '@next/swc-wasm-nodejs': '12.1.6',
                next: '12.1.6',
                react: '18.2.0',
                'react-dom': '18.2.0',
              },
            },
            null,
            2
          ),
        },
        {
          path: '/next.config.js',
          content: `/** @type {import('next').NextConfig} */\nconst nextConfig = {\n  reactStrictMode: true,\n};\nmodule.exports = nextConfig;\n`,
        },
        {
          path: '/pages/_app.jsx',
          content: `import '../styles/globals.css'\n\nexport default function MyApp({ Component, pageProps }) {\n  return <Component {...pageProps} />\n}\n`,
        },
        {
          path: '/styles/globals.css',
          content: `html,body{padding:0;margin:0}*{box-sizing:border-box}\n:root{--bg:#0b0b0b;--fg:#eaeaea;--muted:#9aa0a6;--primary:#7c3aed}\nbody{background:var(--bg);color:var(--fg);font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif}\na{color:inherit;text-decoration:none}\n.container{max-width:960px;margin:0 auto;padding:32px}\n.btn{display:inline-flex;align-items:center;gap:8px;background:var(--primary);color:#fff;border:0;border-radius:10px;padding:10px 14px;cursor:pointer}\n.card{background:#111;border:1px solid #222;border-radius:14px;padding:20px}\n.hint{color:var(--muted);font-size:12px}\n`,
        },
        {
          path: '/pages/index.jsx',
          content: `export default function Homepage({ name }) {\n  return (\n    <main className="container">\n      <h1 style={{fontSize:32,marginBottom:8}}>Next.js + Nodebox</h1>\n      <p className="hint" style={{marginBottom:16}}>SSR-Beispiel mit getServerSideProps</p>\n      <div className="card" style={{marginTop:16}}>\n        <p>Hallo, {name}!</p>\n        <p>Diese Seite läuft komplett im Browser via Nodebox-Next.</p>\n        <a className="btn" href="/api/hello">API testen</a>\n      </div>\n    </main>\n  );\n}\n\nexport function getServerSideProps() {\n  return {\n    props: {\n      name: 'Next.js'\n    }\n  };\n}\n`,
        },
        {
          path: '/pages/api/hello.js',
          content: `export default function handler(req, res) {\n  res.status(200).json({ message: 'Hello from Next.js API route!' });\n}\n`,
        },
      ];
    }

    const rows = defaultFiles.map((f) => ({ project_id: data.id, path: f.path, content: f.content }));
    await supabase.from('files').upsert(rows, { onConflict: 'project_id,path' });
  } catch {}
  redirect(`/projects?projectId=${data.id}`);
}



