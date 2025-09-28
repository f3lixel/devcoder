import { describe, it, expect } from 'vitest'
import { fileProgressReducer, type FileEvent } from '@/lib/file-events'

describe('fileProgressReducer', () => {
  it('handles file.start', () => {
    const evt: FileEvent = { type: 'file.start', payload: { path: 'a.ts', kind: 'ts' } }
    const next = fileProgressReducer({}, evt)
    expect(next['a.ts']).toBeTruthy()
    expect(next['a.ts'].status).toBe('writing')
    expect(next['a.ts'].kind).toBe('ts')
  })

  it('accumulates bytes on chunk', () => {
    const s1 = fileProgressReducer({}, { type: 'file.start', payload: { path: 'a.ts', kind: 'ts' } })
    const s2 = fileProgressReducer(s1, { type: 'file.chunk', payload: { path: 'a.ts', bytes: 100 } })
    const s3 = fileProgressReducer(s2, { type: 'file.chunk', payload: { path: 'a.ts', bytes: 50 } })
    expect(s3['a.ts'].bytes).toBe(150)
    expect(s3['a.ts'].status).toBe('writing')
  })

  it('marks done with final bytes', () => {
    const s1 = fileProgressReducer({}, { type: 'file.start', payload: { path: 'a.ts' } })
    const s2 = fileProgressReducer(s1, { type: 'file.chunk', payload: { path: 'a.ts', bytes: 100 } })
    const s3 = fileProgressReducer(s2, { type: 'file.done', payload: { path: 'a.ts', bytes: 120 } })
    expect(s3['a.ts'].status).toBe('done')
    expect(s3['a.ts'].bytes).toBe(120)
  })

  it('marks error with message', () => {
    const s1 = fileProgressReducer({}, { type: 'file.start', payload: { path: 'a.ts' } })
    const s2 = fileProgressReducer(s1, { type: 'file.error', payload: { path: 'a.ts', message: 'fail' } })
    expect(s2['a.ts'].status).toBe('error')
    expect(s2['a.ts'].message).toBe('fail')
  })
})





