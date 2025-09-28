'use client'

import { useEffect, useRef, useState } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'

type TerminalPaneProps = {
  listFiles: () => Array<{ path: string }>
  readFile: (path: string) => string | undefined
  writeFile: (path: string, content: string) => void
  onOpenFile?: (path: string) => void
  className?: string
}

export default function TerminalPane({ listFiles, readFile, writeFile, onOpenFile, className }: TerminalPaneProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const disposedRef = useRef<boolean>(false)
  const sessionIdRef = useRef<string | null>(null)
  const sseRef = useRef<EventSource | null>(null)
  const reconnectRef = useRef<{ attempts: number; timer: any } | null>(null)
  const [mode, setMode] = useState<'backend' | 'simulated' | null>(null)

  useEffect(() => {
    if (!ref.current) return
    
    const term = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: 'Geist Mono, ui-monospace, monospace',
      fontSize: 12,
      theme: {
        background: 'rgba(0,0,0,0)',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selectionBackground: 'rgba(255, 255, 255, 0.3)',
      },
    })
    
    terminalRef.current = term
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(ref.current)
    const safeFit = () => {
      if (!ref.current || disposedRef.current) return
      const rect = ref.current.getBoundingClientRect()
      if (rect.width < 5 || rect.height < 5) return
      try { fit.fit() } catch {}
    }
    // Delay initial fit until after paint to ensure renderer dimensions exist
    requestAnimationFrame(() => requestAnimationFrame(safeFit))

    // Stabilize sizing: observe container size changes
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => {
        safeFit()
      })
      ro.observe(ref.current)
      resizeObserverRef.current = ro
    }

    // Try backend PTY first, fall back to simulated if unavailable
    let cleanupBackend: (() => void) | null = null
    const startBackend = async () => {
      try {
        const res = await fetch('/api/terminal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start', cols: term.cols, rows: term.rows })
        })
        if (!res.ok) throw new Error('start failed')
        const json = await res.json()
        const id = String(json?.id || '')
        if (!id) throw new Error('no id')
        sessionIdRef.current = id

        // Stream output
        const es = new EventSource(`/api/terminal?id=${encodeURIComponent(id)}`)
        sseRef.current = es
        setMode('backend')
        es.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data) as string
            term.write(data)
          } catch {
            term.write(ev.data || '')
          }
        }
        es.onerror = () => {
          // If backend stream cannot be established, fallback to simulated terminal
          try { sseRef.current?.close() } catch {}
          sseRef.current = null
          if (cleanupBackend) { try { cleanupBackend() } catch {} }
          setupSimulatedTerminal()
          setMode('simulated')
        }

        // Send input to backend
        const onData = term.onData(async (data) => {
          const idNow = sessionIdRef.current
          if (!idNow) return
          try {
            await fetch('/api/terminal', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'input', id: idNow, data })
            })
          } catch {}
        })

        // Resize handling
        const onResize = term.onResize(async ({ cols, rows }) => {
          const idNow = sessionIdRef.current
          if (!idNow) return
          try {
            await fetch('/api/terminal', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'resize', id: idNow, cols, rows })
            })
          } catch {}
        })

        cleanupBackend = () => {
          try { onData.dispose() } catch {}
          try { onResize.dispose() } catch {}
          const idNow = sessionIdRef.current
          if (idNow) {
            fetch('/api/terminal', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'kill', id: idNow })
            }).catch(() => {})
          }
          sessionIdRef.current = null
          try { sseRef.current?.close() } catch {}
          sseRef.current = null
        }
      } catch {
        setupSimulatedTerminal()
      }
    }

    startBackend()

    function setupSimulatedTerminal() {
      const pwd = { current: '/' }

      const prompt = () => {
        term.write(`\r\n$ `)
      }

      const print = (text: string) => term.write(text.replace(/\n/g, '\r\n'))

      const resolvePath = (p: string) => {
        if (!p) return pwd.current
        if (p.startsWith('/')) return p
        const base = pwd.current.endsWith('/') ? pwd.current.slice(0, -1) : pwd.current
        const parts = (base + '/' + p).split('/').filter(Boolean)
        const stack: string[] = []
        for (const part of parts) {
          if (part === '.') continue
          if (part === '..') { stack.pop(); continue }
          stack.push(part)
        }
        return '/' + stack.join('/')
      }

      const help = () => {
        print('\nCommands: ls, cat <path>, touch <path>, echo "text" > <path>, cd <path>, open <path>, help')
        print('\nNote: Real npm/node commands are not supported in this terminal.')
      }

      const run = (line: string) => {
        const input = line.trim()
        if (!input) return
        const append = (s: string) => print('\n' + s)
        const [cmd, ...rest] = input.split(' ')
        if (cmd === 'help') { help(); return }
        if (cmd === 'ls') {
          const files = listFiles()
          append(files.map(f => f.path).join('\n'))
          return
        }
        if (cmd === 'cat') {
          const p = resolvePath(rest.join(' '))
          const content = readFile(p)
          append(content ?? 'No such file')
          return
        }
        if (cmd === 'touch') {
          const p = resolvePath(rest.join(' '))
          writeFile(p, readFile(p) ?? '')
          append(`created ${p}`)
          return
        }
        if (cmd === 'echo') {
          const joined = rest.join(' ')
          const m = joined.match(/^\"([\s\S]*)\"\s*>\s*(.+)$/)
          if (m) {
            const text = m[1]
            const p = resolvePath(m[2])
            writeFile(p, text)
            append(`wrote ${p}`)
          } else {
            append(joined)
          }
          return
        }
        if (cmd === 'cd') {
          const p = resolvePath(rest.join(' '))
          pwd.current = p
          append(p)
          return
        }
        if (cmd === 'open') {
          const p = resolvePath(rest.join(' '))
          onOpenFile?.(p)
          append(`opened ${p}`)
          return
        }
        
        // If backend PTY is active, input handler already forwards data, but
        // in fallback mode we cannot execute real package manager commands.
        if (['npm', 'node', 'npx', 'yarn', 'pnpm'].includes(cmd)) {
          append(`${cmd}: real commands require backend PTY.`)
          return
        }
        
        append(`Unknown command: ${cmd}`)
      }

      print('Terminal ready. Type "help" for commands.')
      prompt()
      let buffer = ''
      const onData = term.onData(data => {
        for (const ch of data) {
          const code = ch.charCodeAt(0)
          if (code === 13) { // Enter
            run(buffer)
            buffer = ''
            prompt()
          } else if (code === 127) { // Backspace
            if (buffer.length > 0) {
              buffer = buffer.slice(0, -1)
              term.write('\b \b')
            }
          } else {
            buffer += ch
            term.write(ch)
          }
        }
      })
    }

    const onResizeWindow = () => { safeFit() }
    window.addEventListener('resize', onResizeWindow)

    return () => {
      window.removeEventListener('resize', onResizeWindow)
      if (resizeObserverRef.current && ref.current) {
        try { resizeObserverRef.current.unobserve(ref.current) } catch {}
      }
      try { sseRef.current?.close() } catch {}
      sseRef.current = null
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current.timer)
        reconnectRef.current = null
      }
      const idNow = sessionIdRef.current
      if (idNow) {
        fetch('/api/terminal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'kill', id: idNow })
        }).catch(() => {})
      }
      sessionIdRef.current = null
      disposedRef.current = true
      term.dispose()
    }
  }, [listFiles, readFile, writeFile, onOpenFile])

  return (
    <div className={className}>
      {mode === 'simulated' && (
        <div className="absolute top-2 right-2 text-[11px] bg-zinc-900/70 px-2 py-1 rounded">
          Using simulated terminal (no real shell)
        </div>
      )}
      <div ref={ref} className="h-full w-full" />
    </div>
  )
}


