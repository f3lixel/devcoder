export async function parseNDJSON(
  body: ReadableStream<Uint8Array> | null | undefined,
  onEvent: (obj: any) => void,
  signal?: AbortSignal
) {
  if (!body) return
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  try {
    while (true) {
      if (signal?.aborted) break
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let idx: number
      while ((idx = buf.indexOf('\n')) >= 0 || (idx = buf.indexOf('\r\n')) >= 0) {
        const line = buf.slice(0, idx).trim()
        buf = buf.slice(idx + 1)
        if (!line) continue
        try {
          const obj = JSON.parse(line)
          onEvent(obj)
        } catch {
          // ignore non-JSON line
        }
      }
    }
    // flush tail
    const tail = buf.trim()
    if (tail) {
      try { onEvent(JSON.parse(tail)) } catch {}
    }
  } catch {
    // swallow read errors (stream aborted, etc.)
  }
}





