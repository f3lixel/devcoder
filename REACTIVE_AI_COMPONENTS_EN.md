# Reactive AI Components

## What are Reactive AI Components?

Reactive AI Components are a collection of reusable React components specifically designed for building AI-powered user interfaces. These components provide a standardized and reactive way to create chat interfaces, reasoning visualizations, and other AI interactions.

## Key Features

- **Reactive**: All components use React Hooks and modern React patterns for optimal performance
- **Composable**: Components can be flexibly combined to create complex UI patterns
- **Type-safe**: Fully implemented with TypeScript
- **Accessible**: Based on Radix UI for optimal accessibility
- **Streaming-capable**: Supports real-time streaming of AI responses

## Component Categories

### 1. Conversation Components

**Conversation** - Container for chat messages with auto-scroll functionality
- `Conversation`: Main container with scroll management
- `ConversationContent`: Content wrapper for messages
- `ConversationEmptyState`: Placeholder when no messages are present
- `ConversationScrollButton`: Button to scroll to the end

**Message** - Display of individual chat messages
- `Message`: Container for a message (User or Assistant)
- `MessageContent`: Message content with styling variants
- `MessageAvatar`: Avatar for the sender

**PromptInput** - Input field for user prompts
- `PromptInput`: Main container with form handling
- `PromptInputTextarea`: Multi-line text field
- `PromptInputToolbar`: Toolbar for additional options
- `PromptInputAttachments`: File attachment management
- `PromptInputSubmit`: Submit button

### 2. AI Reasoning Components

**Reasoning** - Visualization of the AI thinking process
- `Reasoning`: Container with streaming support and auto-close
- `ReasoningTrigger`: Collapsible header with status display
- `ReasoningContent`: Content of the reasoning process
- Shows thinking duration
- Supports live streaming during thinking

**ChainOfThought** - Structured display of the thinking process
- `ChainOfThought`: Container for Chain-of-Thought visualization
- `ChainOfThoughtHeader`: Collapsible header
- `ChainOfThoughtStep`: Individual step with icon and status
- `ChainOfThoughtSearchResults`: Container for search results
- `ChainOfThoughtSearchResult`: Badge for individual search result
- `ChainOfThoughtContent`: Collapsible content area
- `ChainOfThoughtImage`: Image container with caption

### 3. Content Display Components

**Response** - Streaming Markdown renderer
- Renders AI responses with Markdown support
- Optimized for streaming with memo strategy
- Uses `streamdown` for incremental rendering

**CodeBlock** - Syntax-highlighted code display
- Syntax highlighting with Shiki
- Copy functionality
- Support for multiple programming languages
- File icons based on language/filename

**Loader** - Loading animations
- Various styles for different contexts
- Pulsing and animated variants

**Image** - Image component for AI-generated images
- Optimized display of images
- Caption support

### 4. Specialized Components

**Artifact** - Display of AI-generated artifacts
- For code, diagrams, or other generated content
- With preview and export options

**Branch** - Display of conversation branches
- Enables alternative conversation paths
- Branch visualization

**Context** - Display context information
- Shows used context sources
- File previews and references

**InlineCitation** - Source citations in text
- Inline references to sources
- Hover previews
- Clickable citations

**Sources** - List of source citations
- Structured display of sources
- With links and metadata

**Tool** - Visualize tool usage
- Shows which tools the AI has used
- Status and results of tool calls

**Task** - Task component
- Display of AI-generated tasks
- With status and progress

**Actions** - Action buttons
- Interactive actions for messages
- Copy, Retry, etc.

**Suggestion** - Suggestion chips
- Quick selection for common prompts
- Clickable suggestion buttons

**WebPreview** - Web content preview
- Embedded preview of web content
- With metadata and favicon

**OpenInChat** - Integration with chat
- Allows opening content in chat
- Context passing

## Technology Stack

The Reactive AI Components are based on the following technologies:

- **React 19**: Modern React features like `memo`, Hooks, Context
- **TypeScript**: Complete type safety
- **Radix UI**: Accessible primitives for Collapsible, Dialog, etc.
- **Tailwind CSS**: Utility-first CSS framework
- **Vercel AI SDK**: Integration with AI streaming (`ai` package)
- **streamdown**: Markdown rendering for streaming content
- **lucide-react**: Icon library
- **class-variance-authority**: Variant-based styling API

## Usage Example

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
                I'm analyzing the request and thinking about how to best respond...
              </ReasoningContent>
            </Reasoning>
            <Response>
              This is my response with **Markdown** formatting.
            </Response>
          </MessageContent>
        </Message>
      </ConversationContent>
    </Conversation>
  );
}
```

## Design Principles

### 1. Composition over Configuration
Components are small and focused but can be flexibly combined.

### 2. Streaming-First
All content components support incremental rendering during streaming.

### 3. Accessible by Default
Based on Radix UI for ARIA-compliant implementations.

### 4. TypeScript-First
Complete type safety and IntelliSense support.

### 5. Performance-Optimized
- Use of `memo` to avoid unnecessary re-renders
- Controlled/Uncontrolled state with Radix `useControllableState`
- Optimistic updates where possible

## Integration with AI Backends

The components are backend-agnostic but work particularly well with:

- **Vercel AI SDK**: Native support for `useChat` hook
- **OpenRouter**: Multi-model AI API
- **OpenAI**: ChatGPT and other models
- **Anthropic Claude**: With thinking/reasoning support

## File Structure

```
src/components/ai-elements/
├── actions.tsx              # Action buttons for messages
├── artifact.tsx             # AI-generated artifacts
├── branch.tsx               # Conversation branches
├── chain-of-thought.tsx     # Chain-of-Thought visualization
├── code-block.tsx           # Syntax-highlighted code
├── context.tsx              # Context display
├── conversation.tsx         # Chat container
├── image.tsx                # Image component
├── inline-citation.tsx      # Inline citations
├── loader.tsx               # Loading animations
├── message.tsx              # Chat messages
├── open-in-chat.tsx         # Chat integration
├── prompt-input.tsx         # Prompt input
├── reasoning.tsx            # AI reasoning visualization
├── response.tsx             # Markdown response renderer
├── sources.tsx              # Source citations
├── suggestion.tsx           # Prompt suggestions
├── task.tsx                 # Task display
├── tool.tsx                 # Tool usage visualization
└── web-preview.tsx          # Web content preview
```

## Best Practices

### 1. Use Context for Global State
Components like `Reasoning` and `ChainOfThought` use React Context for shared state.

### 2. Memo for Performance
Content components like `Response` use `memo` with custom compare functions:

```tsx
export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown {...props} />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);
```

### 3. Controlled vs Uncontrolled
Use `useControllableState` from Radix for flexible state management:

```tsx
const [isOpen, setIsOpen] = useControllableState({
  prop: open,
  defaultProp: defaultOpen,
  onChange: onOpenChange,
});
```

### 4. Animations with Tailwind
CSS animations for transitions:

```tsx
className={cn(
  "fade-in-0 slide-in-from-top-2 animate-in",
  className
)}
```

## Further Information

- Components can be found in the project under `src/components/ai-elements/`
- Use `NewAIChat.tsx` as a reference for integrating multiple components
- See `package.json` for all dependencies and versions

## Summary

Reactive AI Components provide a comprehensive library of React components for AI interfaces. They are:
- ✅ Modular and reusable
- ✅ TypeScript type-safe
- ✅ Performance-optimized with Memo and Streaming
- ✅ Accessible with Radix UI
- ✅ Flexible through composition pattern
- ✅ Production-ready and battle-tested

These components enable developers to quickly create high-quality AI chat interfaces without having to implement the complex details of streaming, state management, and accessibility themselves.

## Component API Reference

### Conversation Components

```tsx
// Conversation
<Conversation className?: string>
  <ConversationContent>
    {/* Messages */}
  </ConversationContent>
  <ConversationScrollButton />
</Conversation>

// Message
<Message from="user" | "assistant">
  <MessageAvatar src={string} name={string} />
  <MessageContent variant="contained" | "flat">
    {/* Content */}
  </MessageContent>
</Message>
```

### Reasoning Components

```tsx
// Reasoning
<Reasoning 
  isStreaming?: boolean
  duration?: number
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
>
  <ReasoningTrigger />
  <ReasoningContent>
    {/* Reasoning text */}
  </ReasoningContent>
</Reasoning>

// Chain of Thought
<ChainOfThought
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
>
  <ChainOfThoughtHeader />
  <ChainOfThoughtContent>
    <ChainOfThoughtStep 
      icon?: LucideIcon
      label: string
      description?: string
      status?: "complete" | "active" | "pending"
    />
  </ChainOfThoughtContent>
</ChainOfThought>
```

### Content Components

```tsx
// Response
<Response>{markdownString}</Response>

// CodeBlock (see code-block.tsx for full API)
<CodeBlock 
  language?: string
  filename?: string
>
  {codeString}
</CodeBlock>
```

This API reference provides a quick overview of the most commonly used props for each component family.
