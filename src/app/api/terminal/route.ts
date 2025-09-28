import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { createSession, getDefaultShell, getSession, withListener, writeInput, resizePty, killSession, getActiveSessionsCount, SESSION_TTL_MS, writeInputFiltered } from './sessions'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const json = await req.json().catch(() => ({} as any))
  const action = json?.action as string | undefined

  if (action === 'start') {
    // Basic per-user session limit to prevent abuse
    if (getActiveSessionsCount(user.id) >= 3) {
      return NextResponse.json({ error: 'too many sessions' }, { status: 429 })
    }
    // Load node-pty dynamically via eval so bundlers don't try to resolve it
    const dynamicImport = (path: string) => (eval('import')(path)) as Promise<any>
    const nodePty: any = await dynamicImport('node-pty').catch(() => null)
    if (!nodePty) {
      return NextResponse.json({
        error: 'node-pty is not available on this environment. Terminal feature is disabled.',
      }, { status: 500 })
    }

    const cols = Number(json?.cols ?? 80)
    const rows = Number(json?.rows ?? 24)
    const shell = getDefaultShell()

    const env = { ...process.env }
    // Ensure UTF-8 where possible
    env.LANG = env.LANG || 'en_US.UTF-8'
    // Sanitize CWD/env if needed (simple example: force to project root)
    const cwd = process.cwd()

    const pty = nodePty.spawn(shell.file, shell.args, {
      name: 'xterm-color',
      cols,
      rows,
      cwd,
      env,
    })
    const id = createSession(pty, user.id)
    return NextResponse.json({ id, ttlMs: SESSION_TTL_MS })
  }

  if (action === 'input') {
    const id = String(json?.id || '')
    const data = String(json?.data || '')
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
    try {
      const s = getSession(id)
      if (!s) return NextResponse.json({ error: 'not found' }, { status: 404 })
      if (s.ownerUserId !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      // Optional allow/deny lists via env
      const allowList = (process.env.TERM_ALLOW || '').split(',').map(s => s.trim()).filter(Boolean)
      const denyList = (process.env.TERM_DENY || '').split(',').map(s => s.trim()).filter(Boolean)
      writeInputFiltered(id, data, allowList.length ? allowList : null, denyList.length ? denyList : null)
      return NextResponse.json({ ok: true })
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
    }
  }

  if (action === 'resize') {
    const id = String(json?.id || '')
    const cols = Number(json?.cols)
    const rows = Number(json?.rows)
    if (!id || !Number.isFinite(cols) || !Number.isFinite(rows)) {
      return NextResponse.json({ error: 'missing id/cols/rows' }, { status: 400 })
    }
    try {
      const s = getSession(id)
      if (!s) return NextResponse.json({ error: 'not found' }, { status: 404 })
      if (s.ownerUserId !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      resizePty(id, cols, rows)
      return NextResponse.json({ ok: true })
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
    }
  }

  if (action === 'kill') {
    const id = String(json?.id || '')
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
    try {
      const s = getSession(id)
      if (!s) return NextResponse.json({ error: 'not found' }, { status: 404 })
      if (s.ownerUserId !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      killSession(id)
      return NextResponse.json({ ok: true })
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 })
    }
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}

export async function GET(req: NextRequest) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('unauthorized', { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') || ''
  if (!id || !getSession(id)) {
    return new Response('not found', { status: 404 })
  }
  const s = getSession(id)!
  if (s.ownerUserId !== user.id) {
    return new Response('forbidden', { status: 403 })
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder()
      const send = (chunk: string) => {
        // Server-Sent Events framing
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
      }
      const dispose = withListener(id, send)
      // Send a hello so client connects
      send('\u001b[0m')
      ;(controller as any)._dispose = dispose
    },
    cancel() {
      try { ((this as any)._dispose as () => void)?.() } catch {}
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    }
  })
}


