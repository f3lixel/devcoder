'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import SandboxPlayground from '@/components/SandboxPlayground'
import type { SandpackProviderProps } from '@codesandbox/sandpack-react'

type FileRow = { path: string; content: string }

export default function ProjectWorkspace({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<SandpackProviderProps['files']>({})
  const [loaded, setLoaded] = useState(false)

  const storageKey = useMemo(() => `project:${projectId}:files:v1`, [projectId])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      // try local cache first
      try {
        const raw = localStorage.getItem(storageKey)
        if (raw) {
          const cached = JSON.parse(raw) as SandpackProviderProps['files']
          if (!cancelled) setFiles(cached)
        }
      } catch {}
      // then fetch from API
      try {
        const res = await fetch(`/api/projects/${projectId}/files`, { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to load files')
        const data = await res.json()
        const next: SandpackProviderProps['files'] = {}
        const list = (data?.files as FileRow[]) || []
        if (list.length > 0) {
          for (const f of list) next[f.path] = f.content ?? ''
          if (!cancelled) setFiles(next)
          try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch {}
        }
      } catch {}
      if (!cancelled) setLoaded(true)
    }
    load()
    return () => { cancelled = true }
  }, [projectId, storageKey])

  useEffect(() => {
    if (!loaded) return
    try { localStorage.setItem(storageKey, JSON.stringify(files)) } catch {}
  }, [files, loaded, storageKey])

  const saveQueueRef = (globalThis as any).__saveQueueRef || { current: null as any }
  ;(globalThis as any).__saveQueueRef = saveQueueRef

  const flushSave = useCallback(async (batched: Record<string, string>) => {
    const payload = { files: Object.entries(batched).map(([path, content]) => ({ path, content })) }
    await fetch(`/api/projects/${projectId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  }, [projectId])

  const debouncedSave = useCallback((path: string, code: string) => {
    if (!saveQueueRef.current) saveQueueRef.current = { map: {} as Record<string, string>, t: null as any }
    saveQueueRef.current.map[path] = code
    if (saveQueueRef.current.t) clearTimeout(saveQueueRef.current.t)
    saveQueueRef.current.t = setTimeout(async () => {
      const batch = { ...saveQueueRef.current.map }
      saveQueueRef.current.map = {}
      await flushSave(batch)
    }, 600)
  }, [flushSave])

  const handleFileChange = useCallback((path: string, code: string) => {
    setFiles(prev => ({ ...prev, [path]: code }))
    debouncedSave(path, code)
  }, [debouncedSave])

  if (!loaded) return <div className="h-full w-full" />

  return (
    <SandboxPlayground files={files} onFilesChange={handleFileChange} />
  )
}


