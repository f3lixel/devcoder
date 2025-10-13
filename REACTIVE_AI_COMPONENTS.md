# Reactive AI Components

## Was sind Reactive AI Components?

Reactive AI Components sind eine Sammlung von wiederverwendbaren React-Komponenten, die speziell für die Entwicklung von KI-gestützten Benutzeroberflächen entwickelt wurden. Diese Komponenten bieten eine standardisierte und reaktive Möglichkeit, Chat-Interfaces, Reasoning-Visualisierungen und andere KI-Interaktionen zu erstellen.

## Hauptmerkmale

- **Reaktiv**: Alle Komponenten nutzen React Hooks und moderne React-Patterns für optimale Performance
- **Composable**: Komponenten können flexibel kombiniert werden, um komplexe UI-Muster zu erstellen
- **Typsicher**: Vollständig mit TypeScript implementiert
- **Accessible**: Basierend auf Radix UI für optimale Barrierefreiheit
- **Streamingfähig**: Unterstützt Echtzeit-Streaming von KI-Antworten

## Komponenten-Kategorien

### 1. Konversations-Komponenten

**Conversation** - Container für Chat-Nachrichten mit Auto-Scroll-Funktionalität
- `Conversation`: Haupt-Container mit Scroll-Management
- `ConversationContent`: Content-Wrapper für Nachrichten
- `ConversationEmptyState`: Placeholder wenn keine Nachrichten vorhanden sind
- `ConversationScrollButton`: Button zum Scrollen zum Ende

**Message** - Darstellung einzelner Chat-Nachrichten
- `Message`: Container für eine Nachricht (User oder Assistant)
- `MessageContent`: Inhalt der Nachricht mit Styling-Varianten
- `MessageAvatar`: Avatar für den Absender

**PromptInput** - Eingabefeld für Benutzer-Prompts
- `PromptInput`: Haupt-Container mit Form-Handling
- `PromptInputTextarea`: Mehrzeiliges Textfeld
- `PromptInputToolbar`: Toolbar für zusätzliche Optionen
- `PromptInputAttachments`: Verwaltung von Dateianhängen
- `PromptInputSubmit`: Submit-Button

### 2. KI-Reasoning-Komponenten

**Reasoning** - Visualisierung des KI-Denkprozesses
- `Reasoning`: Container mit Streaming-Support und Auto-Close
- `ReasoningTrigger`: Collapsible-Header mit Status-Anzeige
- `ReasoningContent`: Inhalt des Reasoning-Prozesses
- Zeigt die Denkdauer an
- Unterstützt Live-Streaming während des Denkens

**ChainOfThought** - Strukturierte Darstellung des Denkprozesses
- `ChainOfThought`: Container für Chain-of-Thought Visualisierung
- `ChainOfThoughtHeader`: Collapsible Header
- `ChainOfThoughtStep`: Einzelner Schritt mit Icon und Status
- `ChainOfThoughtSearchResults`: Container für Suchergebnisse
- `ChainOfThoughtSearchResult`: Badge für einzelnes Suchergebnis
- `ChainOfThoughtContent`: Collapsible Content-Bereich
- `ChainOfThoughtImage`: Bild-Container mit Caption

### 3. Content-Display-Komponenten

**Response** - Streaming-Markdown-Renderer
- Rendert KI-Antworten mit Markdown-Unterstützung
- Optimiert für Streaming mit Memo-Strategie
- Nutzt `streamdown` für inkrementelles Rendering

**CodeBlock** - Syntax-highlighted Code-Darstellung
- Syntax-Highlighting mit Shiki
- Kopieren-Funktionalität
- Unterstützung für mehrere Programmiersprachen
- Datei-Icons basierend auf Sprache/Dateiname

**Loader** - Lade-Animationen
- Verschiedene Stile für unterschiedliche Kontexte
- Pulsierende und animierte Varianten

**Image** - Bild-Komponente für AI-generierte Bilder
- Optimierte Darstellung von Bildern
- Caption-Support

### 4. Spezialisierte Komponenten

**Artifact** - Anzeige von AI-generierten Artefakten
- Für Code, Diagramme oder andere generierte Inhalte
- Mit Vorschau und Export-Optionen

**Branch** - Darstellung von Konversations-Branches
- Ermöglicht alternative Konversationspfade
- Verzweigungsvisualisierung

**Context** - Kontext-Informationen anzeigen
- Zeigt verwendete Kontextquellen
- File-Previews und Referenzen

**InlineCitation** - Quellenangaben im Text
- Inline-Referenzen zu Quellen
- Hover-Previews
- Klickbare Citations

**Sources** - Liste von Quellenangaben
- Strukturierte Darstellung von Quellen
- Mit Links und Metadaten

**Tool** - Tool-Verwendung visualisieren
- Zeigt welche Tools die KI verwendet hat
- Status und Ergebnisse von Tool-Calls

**Task** - Aufgaben-Komponente
- Darstellung von KI-generierten Aufgaben
- Mit Status und Fortschritt

**Actions** - Action-Buttons
- Interaktive Aktionen für Nachrichten
- Copy, Retry, etc.

**Suggestion** - Vorschlags-Chips
- Schnellauswahl für häufige Prompts
- Klickbare Suggestion-Buttons

**WebPreview** - Web-Content-Vorschau
- Eingebettete Vorschau von Webinhalten
- Mit Metadata und Favicon

**OpenInChat** - Integration mit Chat
- Ermöglicht Öffnen von Inhalten im Chat
- Kontext-Weitergabe

## Technologie-Stack

Die Reactive AI Components basieren auf folgenden Technologien:

- **React 19**: Moderne React-Features wie `memo`, Hooks, Context
- **TypeScript**: Vollständige Typsicherheit
- **Radix UI**: Accessible Primitives für Collapsible, Dialog, etc.
- **Tailwind CSS**: Utility-First CSS Framework
- **Vercel AI SDK**: Integration mit AI-Streaming (`ai` package)
- **streamdown**: Markdown-Rendering für Streaming-Content
- **lucide-react**: Icon-Bibliothek
- **class-variance-authority**: Variant-basierte Styling-API

## Verwendungs-Beispiel

```tsx
import { Conversation, ConversationContent } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageAvatar } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";

function AIChat() {
  return (
    <Conversation>
      <ConversationContent>
        <Message from="assistant">
          <MessageAvatar src="" name="AI" />
          <MessageContent>
            <Reasoning isStreaming={false} duration={3}>
              <ReasoningTrigger />
              <ReasoningContent>
                Ich analysiere die Anfrage und überlege, wie ich am besten antworten kann...
              </ReasoningContent>
            </Reasoning>
            <Response>
              Das ist meine Antwort mit **Markdown**-Formatierung.
            </Response>
          </MessageContent>
        </Message>
      </ConversationContent>
    </Conversation>
  );
}
```

## Design-Prinzipien

### 1. Composition over Configuration
Komponenten sind klein und fokussiert, können aber flexibel kombiniert werden.

### 2. Streaming-First
Alle Content-Komponenten unterstützen inkrementelles Rendering während des Streamings.

### 3. Accessible by Default
Basierend auf Radix UI für ARIA-konforme Implementierungen.

### 4. TypeScript-First
Vollständige Type-Safety und IntelliSense-Support.

### 5. Performance-Optimiert
- Verwendung von `memo` für unnötige Re-Renders zu vermeiden
- Controlled/Uncontrolled State mit Radix `useControllableState`
- Optimistische Updates wo möglich

## Integration mit AI-Backends

Die Komponenten sind Backend-agnostic, funktionieren aber besonders gut mit:

- **Vercel AI SDK**: Native Unterstützung für `useChat` Hook
- **OpenRouter**: Multi-Model AI API
- **OpenAI**: ChatGPT und andere Modelle
- **Anthropic Claude**: Mit thinking/reasoning Support

## Datei-Struktur

```
src/components/ai-elements/
├── actions.tsx              # Action buttons für Messages
├── artifact.tsx             # AI-generierte Artefakte
├── branch.tsx               # Konversations-Verzweigungen
├── chain-of-thought.tsx     # Chain-of-Thought Visualisierung
├── code-block.tsx           # Syntax-highlighted Code
├── context.tsx              # Kontext-Anzeige
├── conversation.tsx         # Chat-Container
├── image.tsx                # Bild-Komponente
├── inline-citation.tsx      # Inline-Quellenangaben
├── loader.tsx               # Lade-Animationen
├── message.tsx              # Chat-Nachrichten
├── open-in-chat.tsx         # Chat-Integration
├── prompt-input.tsx         # Prompt-Eingabe
├── reasoning.tsx            # AI-Reasoning Visualisierung
├── response.tsx             # Markdown-Response Renderer
├── sources.tsx              # Quellenangaben
├── suggestion.tsx           # Prompt-Vorschläge
├── task.tsx                 # Aufgaben-Anzeige
├── tool.tsx                 # Tool-Usage Visualisierung
└── web-preview.tsx          # Web-Content Preview
```

## Best Practices

### 1. Verwende Context für globalen State
Komponenten wie `Reasoning` und `ChainOfThought` nutzen React Context für Shared State.

### 2. Memo für Performance
Content-Komponenten wie `Response` verwenden `memo` mit Custom Compare Functions:

```tsx
export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown {...props} />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);
```

### 3. Controlled vs Uncontrolled
Nutze `useControllableState` von Radix für flexible State-Verwaltung:

```tsx
const [isOpen, setIsOpen] = useControllableState({
  prop: open,
  defaultProp: defaultOpen,
  onChange: onOpenChange,
});
```

### 4. Animationen mit Tailwind
CSS-Animationen für Transitions:

```tsx
className={cn(
  "fade-in-0 slide-in-from-top-2 animate-in",
  className
)}
```

## Weiterführende Informationen

- Die Komponenten sind im Projekt unter `src/components/ai-elements/` zu finden
- Verwende `NewAIChat.tsx` als Referenz für die Integration mehrerer Komponenten
- Siehe `package.json` für alle Dependencies und Versionen

## Zusammenfassung

Reactive AI Components bieten eine umfassende Bibliothek von React-Komponenten für KI-Interfaces. Sie sind:
- ✅ Modular und wiederverwendbar
- ✅ TypeScript-typsicher
- ✅ Performance-optimiert mit Memo und Streaming
- ✅ Accessible mit Radix UI
- ✅ Flexibel durch Composition-Pattern
- ✅ Produktionsreif und battle-tested

Diese Komponenten ermöglichen es Entwicklern, schnell hochwertige KI-Chat-Interfaces zu erstellen, ohne die komplexen Details von Streaming, State-Management und Accessibility selbst implementieren zu müssen.
