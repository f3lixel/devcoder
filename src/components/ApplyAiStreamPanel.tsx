import React, { useMemo } from 'react';
import { useApplyAiStream } from '@/lib/hooks/useApplyAiStream';
import { extractFilesFromStream } from '@/lib/streamParser';

export const ApplyAiStreamPanel: React.FC<{ payload?: any }> = ({ payload }) => {
  const { events, start, stop } = useApplyAiStream();

  const combinedStream = useMemo(() => extractFilesFromStream(events.filter(e => e.type === 'stream').map((e: any) => e.text).join(''))?.map(f => f.content).join('') || events.filter(e => e.type === 'stream').map((e: any) => e.text).join(''), [events]);

  const files = useMemo(() => extractFilesFromStream(combinedStream), [combinedStream]);

  return (
    <div className="p-4 border rounded bg-white">
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => start('/api/apply-ai-code-stream', payload)}
          className="px-3 py-1 bg-blue-600 text-white rounded"
        >
          Start
        </button>
        <button onClick={() => stop()} className="px-3 py-1 bg-gray-200 rounded">
          Stop
        </button>
      </div>

      <div style={{ maxHeight: 240, overflow: 'auto', background: '#0b0b0b', color: '#eee', padding: 8, borderRadius: 6 }}>
        {events.map((ev, i) => {
          if ((ev as any).type === 'stream') {
            return <pre key={i} style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{(ev as any).text}</pre>;
          }
          if ((ev as any).type === 'file') {
            return <div key={i} style={{ color: '#9fd' }}>File: {(ev as any).path}</div>;
          }
          if ((ev as any).type === 'file-progress') {
            return <div key={i} style={{ color: '#9ee' }}>Progress: {(ev as any).fileName} ({(ev as any).current}/{(ev as any).total})</div>;
          }
          if ((ev as any).type === 'step' || (ev as any).type === 'meta') {
            return <div key={i} style={{ color: '#ffd' }}>{JSON.stringify(ev)}</div>;
          }
          if ((ev as any).type === 'error') {
            return <div key={i} style={{ color: '#f88' }}>ERROR: {(ev as any).message || JSON.stringify(ev)}</div>;
          }
          return <div key={i}>{JSON.stringify(ev)}</div>;
        })}
      </div>

      <div className="mt-3">
        <div className="font-medium">Erkannte Dateien ({files.length}):</div>
        <ul>
          {files.map(f => <li key={f.path} className="text-sm"><strong>{f.path}</strong></li>)}
        </ul>

        <div className="mt-2">
          <div className="font-medium">Letzte Code-Snippets (gekürzt):</div>
          <pre style={{ maxHeight: 160, overflow: 'auto', background: '#111', color: '#9cf', padding: 8, borderRadius: 6 }}>
            {combinedStream.slice(-3000) || '—'}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default ApplyAiStreamPanel;