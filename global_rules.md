# Global Rules for This Codebase

Diese Datei definiert verbindliche Regeln, Konventionen und Integrationshinweise, damit AI-gestützte IDEs (oder andere Tools) die Codebase konsistent, sicher und im Sinne des Projekts bedienen können.

## Projektüberblick
- Framework: Next.js (App Router)
- Sprache: TypeScript/React (Client + Server Components)
- Styling: Tailwind CSS, shadcn/ui Variants, eigene ai-elements Komponenten
- UI-Patterns: Chat-Interface mit Reasoning-Badge (ausklappbar), getrennte Chat-Bubbles
- Daten/Backend:
  - Aktuell zwei Wege für AI-Streaming vorhanden, aber produktiv genutzt wird die Next.js API-Route `src/app/api/chat/route.ts`.
  - Supabase ist integriert (Client/Server Helpers vorhanden), Edge Function `ai-gateway` existiert weiterhin, wird aber aktuell nicht mehr vom Chat genutzt.

## Verzeichnisse (relevant)
- `src/components/AIChat.tsx`: Haupt-Chatoberfläche inkl. Streaming-Client, Reasoning-Darstellung und Nachrichtenliste
- `src/app/api/chat/route.ts`: Server-Streaming-Route (SSE) zur AI (OpenRouter)
- `src/components/ai-elements/`: UI-Komponenten (Message, Reasoning, Response)
- `src/components/ui/shadcn-io/ai/`: ältere UI-Komponenten (nicht bevorzugt für neue Features)
- `src/lib/ai-service.ts`: Kontext- und Code-Generierungslogik (für Code-Mode; aktuell Chat nutzt /api/chat)
- `supabase/functions/ai-gateway/`: Edge Function für AI-Streaming (historisch, optional)
- `src/lib/supabase/*`: Supabase-Client/Server/Service Helpers

## AI-Streaming Architektur (aktiv)
- Client: `AIChat.tsx` ruft `POST /api/chat` mit `{ messages: UIMessage[] }` auf.
- Server: `src/app/api/chat/route.ts` proxyt zu OpenRouter als SSE (Content-Type: `text/event-stream`).
- Modell: `qwen/qwen3-next-80b-a3b-thinking` (Reasoning aktiviert: `include_reasoning: true`, `reasoning: { effort: 'medium' }`).
- Events (Server → Client):
  - `{"type":"token","text":string}` → sichtbarer Antworttext (assistant bubble)
  - `{"type":"reasoning","text":string}` → nur im ausklappbaren Reasoning-Badge (Thinking)
  - `{"type":"status"|"stepStart"|"stepDone"|"done"}` → Live-Status/Schritte (UI-Progress)

## Chat-UI Regeln
- Nachrichtenstruktur in `AIChat.tsx`: Array von Objekten `{ id, role, content, reasoning?, files?, commands?, progress? }`.
- Reasoning-Text NICHT in der sichtbaren Antwort wiederholen. Anzeige nur im ausklappbaren Badge über der Assistant-Bubble.
- Die finale AI-Antwort wird als eigene Chat-Bubble (`Message` → `MessageContent`) gerendert.
- Während Streaming: Typing/Token-Append über `appendToAssistant`, Reasoning-Append über `appendToReasoning`.
- Thinking-Badge Position: direkt vor der korrespondierenden Assistant-Bubble (oberhalb, ohne grauen Kasten).

## UI-Komponenten (verbindlich)
- Chat-Bubbles: `src/components/ai-elements/message.tsx`
  - Import: `import { Message, MessageAvatar, MessageContent } from '@/components/ai-elements/message'`
  - Varianten: `variant="contained" | "flat"` (default `contained`). Padding konsistent `px-4 py-3` bei `contained`.
- Reasoning: `src/components/ai-elements/reasoning.tsx`
  - `Reasoning`, `ReasoningTrigger`, `ReasoningContent`
  - Auto-Open während Streaming; nach Ende auto-close (verzögert). Nur für Thinking-Text.
- Markdown/Streaming-Render: `src/components/ai-elements/response.tsx` (nutzt `Streamdown`).

## Streaming-Client (SSE Parsing)
- Parser erwartet `text/event-stream` mit `\n\n`-getrennten Events und `data:`-Zeilen.
- JSON-Event payload wird per `type` geswitcht (siehe Events oben). Fallback: ignoriert Non-JSON Daten.
- Bei plain Text Response (kein SSE): gesamter Text wird als Antwortinhalt gesetzt, anschließend Dateiextraktion aus Text.

## Sicherheits- und Secrets-Regeln
- API Keys: liegen in Umgebungsvariablen (z. B. `OPENROUTER_API_KEY`). Niemals in Client-Bundles oder Logs ausgeben.
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` sind öffentlich; Service Keys niemals clientseitig nutzen.
- Edge Function (`ai-gateway`) akzeptiert CORS, aber ist optional; produktiver Pfad ist `/api/chat`.

## Entwicklungsregeln
- Keine unaufgeforderten strukturellen Änderungen an Public Interfaces der UI-Komponenten.
- Code-Stil: gut lesbare Namen, frühzeitige Returns, wenig tiefe Verschachtelung, keine redundanten Kommentare.
- Tailwind: keine ungleichmäßigen Paddings für Chat-Bubbles; `py-3` in Row, `py-3 px-4` in Bubble.
- Thinking-Text nie doppelt darstellen.

## Fehlerbehebung (typische Stolpersteine)
- „Reasoning fehlt“: Prüfen, ob Server-Events `type=reasoning` ankommen; wenn nicht, sendet Provider kein Reasoning für das Modell/Prompt.
- „Keine Tokens im Chat“: Prüfen, ob `Content-Type` der Antwort `text/event-stream` ist; sonst plain Text Pfad.
- „Zu hohe Bubbles“: `prose`-Klasse kann Margins hinzufügen; bei Bedarf `prose-p:my-0` etc. ergänzen.

## Erweiterungen / Alternativpfade
- Supabase Edge Function `supabase/functions/ai-gateway/index.ts`: SSE-Proxy mit gleicher Typisierung (token/reasoning/status/stepStart/stepDone/done). Aktuell nicht vom Chat genutzt, aber funktionsfähig.
- `src/lib/ai-service.ts`: Für Code-Generierungen mit Datei-Extraktion. Sollte nicht parallel zum Chat-Flow mischen, es sei denn, bewusst Code-Mode.

## Beiträge/Änderungen durch AIs
- Vor Änderungen im Chat-Flow: sicherstellen, dass Reasoning-Badge weiterhin ausschließlich den Thinking-Text trägt.
- Beim Ersetzen von Komponenten: bitte `ai-elements`-Varianten bevorzugen.
- Beim Hinzufügen von neuen Streaming-Modellen: Events kompatibel halten (mindestens `token`, optional `reasoning`).

## Minimalbeispiel: Client-Aufruf
```ts
await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: [{ role: 'user', content: 'Hallo!' }] })
});
```

## Minimalbeispiel: Event-Objekte (SSE)
```json
{"type":"status","message":"Analysiere Prompt…"}
{"type":"stepStart","id":"generate"}
{"type":"reasoning","text":"Denke über Plan nach…"}
{"type":"token","text":"Hallo! Wie kann ich helfen?"}
{"type":"stepDone","id":"generate"}
{"type":"done"}
```

---
Diese Regeln sind verbindlich für AI-gestützte Änderungen. Bei Abweichungen bitte vorab begründen und die Auswirkungen auf den Chat-Flow (insbesondere Reasoning-Darstellung) dokumentieren.
