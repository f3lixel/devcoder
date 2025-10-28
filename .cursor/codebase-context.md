# Codebase Context: felixel-dev (DevCoder)

## 🎯 Projektübersicht
- **Name**: felixel-dev (DevCoder) - AI-powered Chat-Tool
- **Framework**: Next.js 15.5 (App Router, Turbopack)
- **Sprache**: TypeScript + React 19
- **Styling**: Tailwind CSS 4 + Shadcn UI
- **Backend**: Next.js Server Components + SSE Streaming
- **AI-Provider**: OpenRouter (Qwen3-Next-80B-A3B mit Reasoning)
- **Datenbank**: Supabase (Auth, Datenpeicherung)
- **Code-Ausführung**: Monaco Editor, Sandpack, xterm (Terminal)
- **State Management**: Zustand 5

---

## 📁 Verzeichnisstruktur (Key Paths)

```
src/
├── app/
│   ├── api/
│   │   └── chat/route.ts          # Server-Streaming zur OpenRouter (HAUPTPFAD)
│   └── (layout/pages)             # Next.js Pages
├── components/
│   ├── Assistant.tsx              # Haupt-Chat-Komponente (SSE-Handling)
│   ├── ai-elements/               # Chat-UI-Komponenten (verbindlich)
│   │   ├── message.tsx            # Message-Bubbles (user/assistant)
│   │   ├── reasoning.tsx          # Thinking-Badge (ausklappbar)
│   │   ├── response.tsx           # Markdown/Streamdown-Renderer
│   │   └── (weitere)
│   ├── ui/
│   │   └── shadcn-io/             # Shadcn UI Components
│   └── (sonstige Komponenten)
├── lib/
│   ├── ai-service.ts              # AI-Kontext/Code-Generierung (disabled)
│   ├── supabase/                  # Supabase Client/Server/Service
│   └── (utilities)
├── hooks/                         # Custom React Hooks
├── mastra/                        # Mastra AI Framework Integration
└── types/                         # TypeScript Definitionen
```

---

## 🤖 AI-Streaming Architektur (PRODUKTIV)

### Fluss:
1. **Client** (`Assistant.tsx`):
   - Nutzer gibt Nachricht ein
   - `POST /api/chat` mit `{ messages: UIMessage[] }`
   - Erwartet `Content-Type: text/event-stream`

2. **Server** (`src/app/api/chat/route.ts`):
   - Proxyt zu OpenRouter
   - Modell: `qwen/qwen3-next-80b-a3b-thinking`
   - Reasoning aktiviert: `include_reasoning: true`, `reasoning: { effort: 'medium' }`
   - Streamt SSE-Events zurück

### SSE-Event-Format (Server → Client):
```json
{"type":"status","message":"Analysiere Prompt…"}
{"type":"stepStart","id":"generate"}
{"type":"reasoning","text":"Denke über Architektur nach…"}
{"type":"token","text":"Hier ist der Antworttext…"}
{"type":"stepDone","id":"generate"}
{"type":"done"}
```

### Client-Parser (Assistant.tsx):
- Liest `text/event-stream`
- Events nach `type` verarbeiten:
  - `token`: Append zu `assistantMessage.content`
  - `reasoning`: Append zu `assistantMessage.reasoning`
  - `status`: UI-Feedback
  - `stepStart/Done`: Progress-Tracking
  - `done`: Streaming beendet

---

## 🎨 UI-Komponenten-Regeln (VERBINDLICH)

### Message-Bubbles
```tsx
import { Message, MessageAvatar, MessageContent } from '@/components/ai-elements/message'

<Message>
  <MessageAvatar role="user" />
  <MessageContent variant="contained">
    {text}
  </MessageContent>
</Message>
```
- Varianten: `contained` (Standard) | `flat`
- Padding: `px-4 py-3` bei `contained`

### Reasoning-Badge (Thinking)
```tsx
import { Reasoning, ReasoningTrigger, ReasoningContent } from '@/components/ai-elements/reasoning'

<Reasoning>
  <ReasoningTrigger>Show Thinking</ReasoningTrigger>
  <ReasoningContent>{reasoningText}</ReasoningContent>
</Reasoning>
```
- **Wichtig**: Reasoning-Text NICHT in Chat-Bubble wiederholen
- Auto-Open während Streaming, Auto-Close nach Ende
- Position: direkt vor korrespondierender Assistant-Bubble

### Markdown/Response-Rendering
```tsx
import { Response } from '@/components/ai-elements/response'

<Response content={streamedText} />
```
- Nutzt Streamdown für Markdown-Rendering
- KaTeX für Math-Rendering
- Syntax-Highlighting mit Shiki

---

## 🔒 Sicherheits-Konventionen

- **API-Keys**: In `.env.local` (niemals committen)
  - `OPENROUTER_API_KEY` (für OpenRouter)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public)
  - Service Keys niemals clientseitig nutzen

- **Edge Functions**: `ai-gateway` wurde entfernt → produktiv nur `/api/chat`

---

## 📋 Message-Datenstruktur

```ts
interface UIMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  reasoning?: string          // Nur assistant, aus SSE
  files?: FileAttachment[]    // Datei-Uploads
  commands?: CommandExecution[] // Code-Execution Logs
  progress?: ProgressInfo[]   // Live-Status während Streaming
}
```

---

## 🛠️ Typische Entwicklungs-Workflows

### 1. Neue Chat-Feature hinzufügen
- Komponente in `src/components/` erstellen
- In `Assistant.tsx` integrieren
- Wenn Streaming betroffen: SSE-Events in `route.ts` anpassen

### 2. UI-Komponente ändern
- **Bevorzugt**: Varianten in `ai-elements/` verwenden
- Keine Änderungen ohne Grund an Message/Reasoning-Props

### 3. Reasoning-Flow debuggen
- Prüfen, ob Server `{"type":"reasoning","text":...}` sendet
- Wenn nicht: Provider sendet kein Reasoning für das Modell
- Denken-Text NIEMALS doppelt rendern

### 4. Performance optimieren
- `react-resizable-panels` für Layout-Management
- `use-stick-to-bottom` für Auto-Scroll
- Lazy-Loading für Code-Editor (Monaco)

---

## 📦 Dependencies (wichtig)

| Package | Zweck |
|---------|-------|
| `@ai-sdk/react` | AI SDK für React (useChat Hook) |
| `@assistant-ui/react` | Chat-UI Patterns |
| `@monaco-editor/react` | Code-Editor |
| `@codesandbox/sandpack-react` | Live-Code-Execution |
| `xterm` | Terminal-Emulation |
| `@supabase/supabase-js` | Datenbank + Auth |
| `framer-motion` | Animations |
| `zustand` | State Management |
| `react-markdown` | Markdown-Rendering |
| `shiki` | Syntax-Highlighting |

---

## ⚠️ Häufige Probleme & Lösungen

| Problem | Ursache | Lösung |
|---------|--------|--------|
| Reasoning fehlt | Server sendet keine `type=reasoning`-Events | Modell/Prompt anpassen; `include_reasoning: true` prüfen |
| Keine Token im Chat | `Content-Type` ist nicht `text/event-stream` | Prüfen, dass `route.ts` SSE-Response setzt |
| Chat-Bubbles zu hoch | `prose`-Klasse mit Margins | `prose-p:my-0` hinzufügen |
| Zu viele API-Calls | Streaming unterbrochen/nicht gestartet | SSE-Parser debuggen |

---

## 🔗 Important Files Quick Reference

| Datei | Zweck |
|-------|-------|
| `src/app/api/chat/route.ts` | Server-Streaming (OpenRouter Proxy) |
| `src/components/Assistant.tsx` | Chat-UI + SSE-Parsing |
| `src/components/ai-elements/message.tsx` | Message-Bubbles |
| `src/components/ai-elements/reasoning.tsx` | Thinking-Badge |
| `global_rules.md` | AI-Coding-Standards für dieses Projekt |
| `.env.local` | Secrets (nicht committen) |
| `package.json` | Dependencies |

---

## 📝 Für Cursor AI IDE

Diese Datei wird automatisch geladen. Nutze diese Informationen, um:
- ✅ Code-Vorschläge im Kontext zu machen
- ✅ Komponenten konsistent zu erweitern
- ✅ SSE-Streaming korrekt zu implementieren
- ✅ UI-Regeln einzuhalten
- ✅ Sicherheit zu wahren

**Hinweis**: Immer `global_rules.md` konsultieren vor größeren Änderungen.
