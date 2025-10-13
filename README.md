# DevCoder

A modern AI-powered code development platform with an integrated chat interface and reactive AI components.

## Documentation

- **[Reactive AI Components (German)](./REACTIVE_AI_COMPONENTS.md)** - Umfassende Dokumentation der Reactive AI Components
- **[Reactive AI Components (English)](./REACTIVE_AI_COMPONENTS_EN.md)** - Comprehensive documentation of the Reactive AI Components
- [Terminal Features](./TERMINAL_FEATURES.md) - Terminal integration features
- [AI API](./ai-api.md) - AI API integration guide
- [MCP Server](./mcp-server.md) - MCP server documentation

## Overview

This project features a comprehensive library of **Reactive AI Components** - reusable React components specifically designed for building AI-powered user interfaces. These components provide:

- 🔄 Real-time streaming support
- 💬 Chat and conversation interfaces
- 🧠 AI reasoning visualization
- 📝 Markdown rendering with syntax highlighting
- ♿ Accessibility-first design with Radix UI
- ⚡ Performance-optimized with React memoization

## Quick Start

```bash
npm install
npm run dev
```

## Technology Stack

- **Frontend**: React 19, Next.js 15, TypeScript
- **UI Components**: Radix UI, Tailwind CSS
- **AI Integration**: Vercel AI SDK, OpenRouter
- **Code Editor**: Monaco Editor
- **Terminal**: xterm.js

## Key Features

- **AI Chat Interface**: Built with modular, composable AI components
- **Code Editor**: Integrated Monaco editor with syntax highlighting
- **Terminal Emulation**: Full terminal support with xterm.js
- **Real-time Collaboration**: WebSocket-based real-time features
- **Responsive Design**: Mobile-first, accessible interface

## Project Structure

```
src/
├── components/
│   ├── ai-elements/      # Reactive AI Components library
│   ├── ui/               # Base UI components
│   └── NewAIChat.tsx     # Main AI chat component
├── app/                  # Next.js app directory
└── lib/                  # Utility functions
```

## Learn More

For detailed information about the AI components, see the [Reactive AI Components Documentation](./REACTIVE_AI_COMPONENTS_EN.md).

## License

See LICENSE file for details.
