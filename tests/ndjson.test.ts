import { describe, it, expect, vi } from 'vitest'
import { parseNDJSON } from '@/lib/ndjson'

function streamFromStrings(lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    start(controller) {
      lines.forEach((l, i) => {
        controller.enqueue(encoder.encode(l))
        if (i < lines.length - 1) controller.enqueue(encoder.encode('\n'))
      })
      controller.close()
    }
  })
}

describe('parseNDJSON', () => {
  it('parses JSON objects by line and emits them', async () => {
    const events: any[] = []
    const body = streamFromStrings([
      JSON.stringify({ type: 'file.start', payload: { path: 'a.ts' } }),
      JSON.stringify({ type: 'file.done', payload: { path: 'a.ts' } })
    ])
    await parseNDJSON(body, (obj) => events.push(obj))
    expect(events.length).toBe(2)
    expect(events[0].type).toBe('file.start')
    expect(events[1].type).toBe('file.done')
  })
})





