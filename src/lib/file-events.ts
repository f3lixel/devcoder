import { File, FileCode, FileJson, FileText, FileType, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'

export type FileStatus = 'writing' | 'done' | 'error'

export interface FileProgress {
  path: string
  kind?: string
  status: FileStatus
  bytes?: number
  message?: string
  updatedAt?: number
}

export type FileEvent =
  | { type: 'file.start'; payload: { path: string; kind?: string } }
  | { type: 'file.chunk'; payload: { path: string; bytes?: number } }
  | { type: 'file.done';  payload: { path: string; bytes?: number } }
  | { type: 'file.error'; payload: { path: string; message?: string } }

export function fileProgressReducer(
  state: Record<string, FileProgress>,
  evt: FileEvent
): Record<string, FileProgress> {
  const next = { ...state }
  const now = Date.now()
  switch (evt.type) {
    case 'file.start': {
      const { path, kind } = evt.payload
      next[path] = { path, kind, status: 'writing', bytes: 0, updatedAt: now }
      return next
    }
    case 'file.chunk': {
      const { path, bytes = 0 } = evt.payload
      if (!next[path]) {
        next[path] = { path, status: 'writing', bytes: 0, updatedAt: now }
      }
      next[path] = { ...next[path], bytes: (next[path].bytes || 0) + (bytes || 0), updatedAt: now }
      return next
    }
    case 'file.done': {
      const { path, bytes } = evt.payload
      if (!next[path]) {
        next[path] = { path, status: 'done', updatedAt: now }
      }
      next[path] = { ...next[path], status: 'done', bytes: bytes ?? next[path].bytes, updatedAt: now }
      return next
    }
    case 'file.error': {
      const { path, message } = evt.payload
      if (!next[path]) {
        next[path] = { path, status: 'error', updatedAt: now }
      }
      next[path] = { ...next[path], status: 'error', message, updatedAt: now }
      return next
    }
    default:
      return state
  }
}

export function iconForKind(kind?: string) {
  const k = (kind || '').toLowerCase()
  if (k === 'ts' || k === 'tsx') return FileType
  if (k === 'js' || k === 'jsx') return FileCode
  if (k === 'json') return FileJson
  if (k === 'css' || k === 'scss') return FileType
  if (k === 'md' || k === 'mdx') return FileText
  return File
}

export function basenameTruncated(path: string): string {
  if (!path) return ''
  // middle truncation helper, returns e.g. src/.../component.tsx for long paths
  const max = 42
  if (path.length <= max) return path
  const parts = path.split('/')
  if (parts.length <= 2) return path.slice(0, 20) + '…' + path.slice(-18)
  const first = parts[0]
  const last = parts[parts.length - 1]
  const mid = '…/'
  const remain = max - first.length - mid.length - last.length
  if (remain <= 0) return path.slice(0, 20) + '…' + path.slice(-18)
  return `${first}/${mid}${last}`
}

export function isFileEvent(obj: any): obj is FileEvent {
  return obj && typeof obj.type === 'string' && (
    obj.type === 'file.start' || obj.type === 'file.chunk' || obj.type === 'file.done' || obj.type === 'file.error'
  )
}





