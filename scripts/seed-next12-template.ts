import { createClient } from '@supabase/supabase-js'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative, sep } from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Fehlende Supabase-Umgebungsvariablen (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)')
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const BUCKET = 'project-files'
const TEMPLATE_PREFIX = 'templates/next12'
const TEMPLATE_DIR = join(process.cwd(), 'templates', 'next12')

interface TemplateFile {
  path: string
  content: string
}

function toPosixPath(p: string) {
  return p.split(sep).join('/')
}

function collectFiles(dir: string, base: string = dir): TemplateFile[] {
  const entries: TemplateFile[] = []
  const items = readdirSync(dir)
  for (const item of items) {
    const absolute = join(dir, item)
    const rel = toPosixPath(relative(base, absolute))
    const stats = statSync(absolute)
    if (stats.isDirectory()) {
      entries.push(...collectFiles(absolute, base))
      continue
    }
    const content = readFileSync(absolute, 'utf8')
    entries.push({ path: rel, content })
  }
  return entries
}

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = (buckets || []).some((bucket) => bucket.name === BUCKET)
  if (!exists) {
    await supabase.storage.createBucket(BUCKET, { public: false })
  }
}

async function uploadTemplate() {
  console.log('⏫ Lade Sandpack-React-Template in Supabase Storage…')
  await ensureBucket()

  const files = collectFiles(TEMPLATE_DIR)
  console.log(`➡️  ${files.length} Dateien gefunden`)

  const storage = supabase.storage.from(BUCKET)
  let uploaded = 0
  let failed = 0

  for (const file of files) {
    const storagePath = `${TEMPLATE_PREFIX}/${file.path}`
    const payload = Buffer.from(file.content, 'utf8')
    const { error } = await storage.upload(storagePath, payload, {
      contentType: 'text/plain',
      upsert: true,
    })
    if (error) {
      failed++
      console.error(`✖️  Upload fehlgeschlagen (${file.path}):`, error.message)
    } else {
      uploaded++
      console.log(`✓ ${file.path}`)
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    files: files.map((file) => file.path)
  }
  await storage.upload(
    `${TEMPLATE_PREFIX}/manifest.json`,
    Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'),
    {
      contentType: 'application/json',
      upsert: true,
    }
  )
  console.log('🗂️  Manifest aktualisiert')

  console.log(`🏁 Fertig! Erfolgreich: ${uploaded}, Fehler: ${failed}`)
}

uploadTemplate().catch((error) => {
  console.error(error)
  process.exit(1)
})
