// Define minimal IPty interface locally to avoid build-time type dependency
export type IPty = {
  onData: (listener: (data: string) => void) => void
  onExit: (listener: (ev: { exitCode: number; signal?: number }) => void) => void
  write: (data: string) => void
  resize: (cols: number, rows: number) => void
  kill: () => void
}

export type Session = {
  id: string
  ownerUserId: string
  pty: IPty
  listeners: Set<(chunk: string) => void>
  createdAt: number
  lastActiveAt: number
  backlog: string[]
  inputBuffer: string
}

const sessions = new Map<string, Session>()

const CLEANUP_INTERVAL_MS = 60_000
export const SESSION_TTL_MS = 15 * 60_000

// Ensure single cleanup timer (across HMR) using globalThis flag
if (!(globalThis as any).__terminalCleanupStarted) {
  setInterval(() => {
    const now = Date.now()
    for (const [id, s] of sessions) {
      if (now - s.lastActiveAt > SESSION_TTL_MS) {
        try { s.pty.kill() } catch {}
        sessions.delete(id)
      }
    }
  }, CLEANUP_INTERVAL_MS).unref?.()
  ;(globalThis as any).__terminalCleanupStarted = true
}

function generateId(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

export function getDefaultShell(): { file: string; args: string[] } {
  if (process.platform === 'win32') {
    const powershell = 'powershell.exe'
    const cmd = process.env.ComSpec || 'C\\\Windows\\system32\\cmd.exe'
    // Prefer PowerShell if present
    return { file: powershell, args: ['-NoLogo'] }
  }
  const shell = process.env.SHELL || '/bin/bash'
  return { file: shell, args: ['-l'] }
}

export function createSession(pty: IPty, ownerUserId: string): string {
  const id = generateId()
  sessions.set(id, {
    id,
    ownerUserId,
    pty,
    listeners: new Set(),
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    backlog: [],
    inputBuffer: '',
  })
  // Fan-out PTY output to any attached listeners (e.g., SSE streams)
  pty.onData((data) => {
    const s = sessions.get(id)
    if (!s) return
    s.lastActiveAt = Date.now()
    // Backlog ring buffer (keep ~200 chunks)
    s.backlog.push(data)
    if ( s.backlog.length > 200 ) {
      s.backlog.splice(0, s.backlog.length - 200)
    }
    for (const l of s.listeners) {
      try { l(data) } catch {}
    }
  })
  pty.onExit(() => {
    const s = sessions.get(id)
    if (!s) return
    for (const l of s.listeners) {
      try { l('\r\n[process exited]\r\n') } catch {}
    }
    sessions.delete(id)
  })
  return id
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id)
}

export function withListener(id: string, listener: (chunk: string) => void): () => void {
  const s = sessions.get(id)
  if (!s) return () => {}
  // Send backlog first
  if (s.backlog.length > 0) {
    try {
      for (const chunk of s.backlog) listener(chunk)
    } catch {}
  }
  s.listeners.add(listener)
  return () => { s.listeners.delete(listener) }
}

export function writeInput(id: string, data: string) {
  const s = sessions.get(id)
  if (!s) throw new Error('session not found')
  s.lastActiveAt = Date.now()
  s.pty.write(data)
}

export function resizePty(id: string, cols: number, rows: number) {
  const s = sessions.get(id)
  if (!s) throw new Error('session not found')
  s.pty.resize(Math.max(1, cols), Math.max(1, rows))
}

export function killSession(id: string) {
  const s = sessions.get(id)
  if (!s) return
  try { s.pty.kill() } catch {}
  sessions.delete(id)
}

export function getActiveSessionsCount(ownerUserId: string): number {
  let n = 0
  for (const s of sessions.values()) {
    if (s.ownerUserId === ownerUserId) n++
  }
  return n
}

export function writeInputFiltered(
  id: string,
  data: string,
  allowList: string[] | null,
  denyList: string[] | null,
): { forwarded: boolean; message?: string } {
  const s = sessions.get(id)
  if (!s) throw new Error('session not found')

  s.lastActiveAt = Date.now()

  // If no filtering configured, forward directly
  if ((!allowList || allowList.length === 0) && (!denyList || denyList.length === 0)) {
    s.pty.write(data)
    return { forwarded: true }
  }

  // Accumulate full lines to check commands
  s.inputBuffer += data
  const lines = s.inputBuffer.split(/\r?\n/)
  s.inputBuffer = lines.pop() || ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) { s.pty.write(line + '\r\n'); continue }
    const firstToken = trimmed.split(/\s+/)[0]
    if (denyList && denyList.includes(firstToken)) {
      // Deny
      const warn = `\r\n[blocked]: ${firstToken} is not allowed\r\n`
      for (const l of s.listeners) { try { l(warn) } catch {} }
      continue
    }
    if (allowList && allowList.length > 0 && !allowList.includes(firstToken)) {
      const warn = `\r\n[blocked]: ${firstToken} is not in allow-list\r\n`
      for (const l of s.listeners) { try { l(warn) } catch {} }
      continue
    }
    s.pty.write(line + '\r\n')
  }

  return { forwarded: true }
}

export function killAllSessions() {
  for (const [id, s] of sessions) {
    try { s.pty.kill() } catch {}
    sessions.delete(id)
  }
}

// Best-effort cleanup on process signals
try {
  process.on('SIGINT', () => { killAllSessions(); process.exit(0) })
  process.on('SIGTERM', () => { killAllSessions(); process.exit(0) })
} catch {}


