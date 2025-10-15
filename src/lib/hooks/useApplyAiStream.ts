import { useRef, useState, useCallback } from 'react';

export type StreamEvent =
  | { type: 'start'; message?: string }
  | { type: 'stream'; text: string; raw?: boolean }
  | { type: 'file'; path: string; content: string }
  | { type: 'file-progress'; current: number; total: number; fileName: string }
  | { type: 'meta'; payload: any }
  | { type: 'complete'; message?: string; results?: any }
  | { type: 'error'; message?: string; detail?: any }
  | { type: string; [k: string]: any };

export function useApplyAiStream() {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const controllerRef = useRef<AbortController | null>(null);

  const start = useCallback(async (url = '/api/apply-ai-code-stream', body?: any) => {
    // stop existing
    controllerRef.current?.abort();
    controllerRef.current = new AbortController();

    setEvents([]);

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: controllerRef.current.signal,
      });
    } catch (e: any) {
      setEvents(prev => [...prev, { type: 'error', message: 'network_error', detail: String(e?.message || e) }]);
      return;
    }

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      setEvents(prev => [...prev, { type: 'error', message: 'upstream_failed', detail: text || res.status }]);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // SSE-style messages separated by \n\n
        let idx;
        while ((idx = buf.indexOf('\n\n')) !== -1) {
          const raw = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 2);
          if (!raw) continue;
          const cleaned = raw.replace(/^data:\s*/, '');
          try {
            const parsed = JSON.parse(cleaned);
            setEvents(prev => [...prev, parsed]);
          } catch {
            setEvents(prev => [...prev, { type: 'stream', text: cleaned }]);
          }
        }
      }

      // flush tail
      if (buf.trim()) {
        const cleaned = buf.trim().replace(/^data:\s*/, '');
        try {
          const parsed = JSON.parse(cleaned);
          setEvents(prev => [...prev, parsed]);
        } catch {
          setEvents(prev => [...prev, { type: 'stream', text: cleaned }]);
        }
      }
    } catch (e: any) {
      setEvents(prev => [...prev, { type: 'error', message: e?.message || 'stream_error' }]);
    } finally {
      controllerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  return { events, start, stop };
}