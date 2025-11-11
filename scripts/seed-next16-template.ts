import { createClient } from '@supabase/supabase-js';

const OWNER = 'siddharthamaity';
const REPO = 'nextjs-16-starter-shadcn';
const REF = 'main';
const BUCKET = 'project-files';
const TEMPLATE_PREFIX = 'templates/next16';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) {
    throw new Error('Missing SUPABASE credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key);
}

function isTextPath(p: string): boolean {
  const lower = p.toLowerCase();
  const allowExact = new Set([
    '.gitignore', '.npmrc', '.nvmrc', '.prettierignore', '.editorconfig',
    'dockerfile', 'dockerfile.bun', 'license', 'license.md', 'readme', 'readme.md',
  ]);
  if (allowExact.has(lower)) return true;
  const textExt = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.mdx', '.txt', '.css', '.scss', '.sass', '.less',
    '.html', '.svg', '.env', '.env.example', '.mjs', '.cjs', '.yml', '.yaml', '.mjs', '.tsconfig', '.mjs',
  ]);
  const idx = lower.lastIndexOf('.');
  if (idx >= 0) {
    const ext = lower.slice(idx);
    return textExt.has(ext);
  }
  return false;
}

async function fetchTree(): Promise<Array<{ path: string; type: string }>> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'felixel-dev-seeder',
  };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const treeUrl = `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${encodeURIComponent(REF)}?recursive=1`;
  const res = await fetch(treeUrl, { headers });
  if (!res.ok) throw new Error(`GitHub tree fetch failed: ${res.status} ${res.statusText}`);
  const json: any = await res.json();
  return json.tree || [];
}

async function fetchRaw(path: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${encodeURIComponent(REF)}/${path}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'felixel-dev-seeder' } });
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return await res.text();
}

async function main() {
  const supabase = getSupabase();
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = (buckets || []).some((b) => b.name === BUCKET);
  if (!exists) {
    await supabase.storage.createBucket(BUCKET, { public: false });
  }

  const tree = await fetchTree();
  const textFiles = tree.filter((e) => e.type === 'blob' && isTextPath(e.path));

  const uploaded: string[] = [];
  for (const entry of textFiles) {
    const content = await fetchRaw(entry.path);
    const storagePath = `${TEMPLATE_PREFIX}/${entry.path}`;
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, new Blob([content], { type: 'text/plain' }), { upsert: true });
    if (error) {
      console.error(`❌ Upload error for ${entry.path}:`, error.message);
      continue;
    }
    uploaded.push(entry.path);
    console.log(`✅ Uploaded: ${entry.path}`);
  }

  // Write manifest
  const manifest = JSON.stringify({ repo: `${OWNER}/${REPO}`, ref: REF, files: uploaded }, null, 2);
  await supabase.storage.from(BUCKET).upload(`${TEMPLATE_PREFIX}/manifest.json`, new Blob([manifest], { type: 'application/json' }), { upsert: true });
  console.log(`📦 Manifest written (${uploaded.length} files).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
