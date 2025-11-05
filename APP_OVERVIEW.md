# Projektübersicht — Felixel (DevCoder)

Kurzbeschreibung (Deutsch)

Felixel ist eine Next.js-basierte Entwickler‑Webanwendung, die AI‑gestützt komplette Full‑Stack‑Webapplikationen aus einem einfachen Prompt erzeugen und verwalten soll. Die UI bietet einen Prompt-Driven-Workflow: Nutzer beschreiben ihr Projekt in einem Eingabefeld, die Applikation erstellt daraufhin ein Projekt (persistiert in Supabase) und stellt eine Live‑Vorschau bereit. Die App kombiniert Chat/Assistant‑Funktionalität mit Projektmanagement, Templates und kollaborativen Editierfunktionen.

Hauptzweck

- Erzeugen von Full‑Stack‑Webapps aus einem natürlichen Sprachprompt.
- Verwaltung von Projekten (Anlegen, Auflisten, Löschen).
- Interaktive AI‑Assistant/Chat‑Runtime zur Hilfestellung und Automatisierung.
- Live‑Vorschau (iframe) und Templates für schnellen Einstieg.

Wesentliche Features / Bestandteile

- Prompt‑zu‑Projekt Workflow (Dashboard mit Eingabefeld auf `/` → erzeugt Projekte).
- Authentifizierung und Persistenz über Supabase (Session Sync, Projekte-Tabelle).
- Assistant / Chat Runtime (verwendet `@assistant-ui/react` und einen `/api/chat` Endpoint).
- Templates & Vorlagen (Routen/Seiten für Templates vorhanden).
- Kollaboration / Realtime (yjs, ggf. CRDTs) und Editor-Integration (Monaco).
- Live‑Preview in einem Iframe für erzeugte Projekte.

Wichtige Dateien & Ordner

- `package.json` — Abhängigkeiten (Next.js 15, React 19, Assistant-UI, Supabase, AI SDKs).
- `README.md` — generische Projektinfo / AI‑todo Plan.
- `src/app/page.tsx` — Dashboard / Landing mit Prompt‑Eingabe ("you vibe, we code").
- `src/app/assistant.tsx` — Assistant Runtime Provider; verbindet UI mit `/api/chat`.
- `src/index.ts` — Einstieg/Exports (kleine utils).
- `src/components/` — UI‑Bibliothek: `NewAIChat.tsx`, `Thread.tsx`, `AppHeader.tsx` etc.; viele AI‑komponenten.
- `lib/` und `supabase/` — utilities und Client/Server‑Wrapper (Storage, supabase client/server code).
- `scripts/seed-template.ts` — Hilfs-Script zum Befüllen von Templates.
- `tests/` — Unit/Integration Tests (z. B. chatStreaming.test.ts, ndjson.test.ts).

Technologien / Bibliotheken (aus package.json)

- Next.js 15 (turbopack), React 19
- @assistant-ui/*, @ai-sdk/react, @openrouter/ai-sdk-provider
- Supabase (`@supabase/supabase-js` + auth helpers)
- Yjs (Realtime), Monaco Editor, TailwindCSS

Wie man lokal startet

1. Node installieren (empfohlen: LTS) und in Projektordner wechseln.
2. Abhängigkeiten installieren:
   - npm install
3. Dev-Server starten:
   - npm run dev
4. Standardmäßig startet Next.js (Turbopack). API‑Routen werden innerhalb der App bereitgestellt (z. B. `/api/chat`, `/api/projects`).

Anmerkungen / Beobachtungen

- Die App ist stark auf AI-Integration ausgerichtet (Assistant UI, AI-SDKs, Streaming/NDJSON Tests).
- Supabase wird als primärer Backend-Service verwendet (Auth + Postgres für Projekte).
- Es gibt viele UI‑Komponenten und Hilfsbibliotheken; das Projekt ist als vollständige Produkt‑UI ausgelegt.

Speicherung der Information

Diese Datei ist im Repo abgelegt, sodass die Projektbeschreibung persistent verfügbar ist. Wenn du möchtest, kann ich diese Datei automatisch aktualisieren, sobald ich größere Codeänderungen erkenne oder weitere Erkenntnisse sammle.

---
Automatisch erstellt am: 2025-11-03
