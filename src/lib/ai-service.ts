import { supabaseBrowser } from '@/lib/supabase/client';

/** Represents a file in the codebase */
export interface FileContext {
  path: string;
  content: string;
  type?: string;
}

/** Represents a terminal command and its execution context */
export interface TerminalCommand {
  command: string;
  cwd?: string;
  output?: string;
  error?: string;
}

/** Request structure for AI code generation */
export interface AICodeRequest {
  message: string;
  files?: FileContext[];
  currentFile?: FileContext;
  terminalHistory?: TerminalCommand[];
  mode?: 'chat' | 'code' | 'terminal' | 'edits';
}

/** Response structure from AI code generation */
export interface AICodeResponse {
  message?: string;
  files?: FileContext[];
  edits?: Array<{
    path: string;
    content: string;
    type?: string;
  }>;
  commands?: TerminalCommand[];
}

/**
 * Manages context for AI operations including file and terminal history
 */
export class AIContextManager {
  private readonly files: Map<string, string> = new Map();
  private terminalHistory: TerminalCommand[] = [];
  private currentFile: FileContext | null = null;
  private static readonly MAX_TERMINAL_HISTORY = 50;

  /**
   * Updates the file cache with new file contents
   * @param files - Record of file paths to their contents
   */
  updateFiles(files: Record<string, unknown>): void {
    this.files.clear();
    Object.entries(files).forEach(([path, content]) => {
      const code = typeof content === 'string' ? content : '';
      this.files.set(path, code);
    });
  }

  /**
   * Gets the content of a specific file
   * @param path - Path of the file to retrieve
   * @returns File content or undefined if not found
   */
  getFile(path: string): string | undefined {
    return this.files.get(path);
  }

  /**
   * Gets all files with their types
   * @returns Array of file contexts
   */
  getAllFiles(): FileContext[] {
    return Array.from(this.files.entries()).map(([path, content]) => ({
      path,
      content,
      type: this.getFileType(path)
    }));
  }

  /**
   * Sets the current active file
   * @param file - File context to set as current
   */
  setCurrentFile(file: FileContext): void {
    this.currentFile = file;
  }

  /**
   * Adds a terminal command to history
   * @param command - Command to add
   */
  addTerminalCommand(command: TerminalCommand): void {
    this.terminalHistory.push(command);
    if (this.terminalHistory.length > AIContextManager.MAX_TERMINAL_HISTORY) {
      this.terminalHistory = this.terminalHistory.slice(-AIContextManager.MAX_TERMINAL_HISTORY);
    }
  }

  /**
   * Gets the terminal command history
   * @returns Array of terminal commands
   */
  getTerminalHistory(): TerminalCommand[] {
    return [...this.terminalHistory];
  }

  /**
   * Determines the file type based on extension
   * @param path - File path
   * @returns Detected file type or 'text' if unknown
   */
  getFileType(path: string): string {
    const extension = path.split('.').pop()?.toLowerCase() || '';
    
    const typeMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      css: 'css',
      scss: 'scss',
      html: 'html',
      json: 'json',
      md: 'markdown',
      yml: 'yaml',
      yaml: 'yaml'
    };

    return typeMap[extension] || 'text';
  }

  /**
   * Builds a context string for AI processing
   * @param options - Options for building the context
   * @returns Formatted context string
   */
  buildContext(options: { includeAllFiles?: boolean; includeTerminal?: boolean } = {}): string {
    const parts: string[] = [];
    
    if (this.currentFile) {
      parts.push(
        `Current file: ${this.currentFile.path}\n` +
        `\`\`\`${this.currentFile.type}\n${this.currentFile.content}\n\`\`\``
      );
    }

    if (options.includeAllFiles && this.files.size > 0) {
      parts.push('\nProject files:');
      this.files.forEach((content, path) => {
        if (path !== this.currentFile?.path) {
          parts.push(
            `\n${path}:\n` +
            `\`\`\`${this.getFileType(path)}\n${content}\n\`\`\``
          );
        }
      });
    }

    if (options.includeTerminal && this.terminalHistory.length > 0) {
      parts.push('\nRecent terminal commands:');
      this.terminalHistory.slice(-10).forEach((cmd) => {
        parts.push(`$ ${cmd.command}`);
        if (cmd.output) parts.push(cmd.output);
        if (cmd.error) parts.push(`Error: ${cmd.error}`);
      });
    }

    parts.push(`
Output requirements (STRICT):
- Erstelle eine kleine Node.js/React App, die im Browser lauffähig ist (kein fs/net). Node-Logik ggf. mocken.
- Liefere ALLE benötigten Dateien als einzelne Codeblöcke, jeweils mit Kopfzeile: \`\`\`<sprache> path:/relativer/pfad
- Pflichtdateien: /package.json, /App.js, /index.js, /styles.css, /public/index.html
- Zusätzliche Dateien (z.B. /src/components/Sidebar.tsx) explizit hinzufügen
- Verwende React 18 Syntax und importiere korrekt
- Keine Erklärungen innerhalb der Codeblöcke, nur reiner Code
- Achte auf korrekte Relativpfade und Imports, sodass Sandpack ohne Fehler rendert`);

    return parts.join('\n\n');
  }
}

/**
 * Service for handling AI code generation and processing
 */
export class AICodeService {
  private readonly contextManager: AIContextManager;
  private readonly apiKey?: string;

  constructor() {
    this.contextManager = new AIContextManager();
    this.apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  }

  /**
   * Gets the context manager instance
   * @returns The AIContextManager instance
   */
  getContextManager(): AIContextManager {
    return this.contextManager;
  }

  /**
   * Processes an AI request (AI functionality disabled)
   * @param request - The AI code request
   * @returns Promise resolving to the AI response
   */
  async processRequest(request: AICodeRequest): Promise<AICodeResponse> {
    return {
      message: 'AI functionality has been disabled. Please contact your administrator to re-enable AI features.'
    };
  }

  /**
   * Processes a request using the Supabase Edge Function (disabled)
   * @param request - The AI code request
   * @returns Promise resolving to the AI response
   * @throws Error if the request fails
   */
  private async processWithSupabase(request: AICodeRequest): Promise<AICodeResponse> {
    throw new Error('Supabase AI gateway has been disabled');
  }

  /**
   * Placeholder for direct OpenAI processing (disabled)
   * @private
   */
  private async processWithOpenAI(_request: AICodeRequest): Promise<AICodeResponse> {
    throw new Error('All AI processing has been disabled');
  }

  /**
   * Builds a context-aware prompt for the AI
   * @param request - The AI code request
   * @returns Formatted prompt string
   */
  private buildContextPrompt(request: AICodeRequest): string {
    const parts: string[] = [request.message];
    
    if (request.currentFile) {
      parts.push(
        `\nCurrent file: ${request.currentFile.path}\n` +
        `\`\`\`${request.currentFile.type}\n${request.currentFile.content}\n\`\`\``
      );
    }
    
    if (request.files?.length) {
      parts.push('\nProject files:');
      request.files.forEach(file => {
        parts.push(
          `\n${file.path}:\n` +
          `\`\`\`${file.type || ''}\n${file.content}\n\`\`\``
        );
      });
    }
    
    if (request.terminalHistory?.length) {
      parts.push('\nTerminal history:');
      request.terminalHistory.slice(-5).forEach(cmd => {
        parts.push(`$ ${cmd.command}`);
        if (cmd.output) parts.push(cmd.output);
      });
    }
    
    parts.push(`
Output requirements (STRICT):
- Erstelle eine kleine Node.js/React App, die im Browser lauffähig ist (kein fs/net). Node-Logik ggf. mocken.
- Liefere ALLE benötigten Dateien als einzelne Codeblöcke, jeweils mit Kopfzeile: \`\`\`<sprache> path:/relativer/pfad
- Pflichtdateien: /package.json, /App.js, /index.js, /styles.css, /public/index.html
- Zusätzliche Dateien (z.B. /src/components/Sidebar.tsx) explizit hinzufügen
- Verwende React 18 Syntax und importiere korrekt
- Keine Erklärungen innerhalb der Codeblöcke, nur reiner Code
- Achte auf korrekte Relativpfade und Imports, sodass Sandpack ohne Fehler rendert`);

    return parts.join('\n\n');
  }

  /**
   * Builds messages in OpenAI format
   * @param request - The AI code request
   * @returns Array of message objects in OpenAI format
   */
  private buildMessages(request: AICodeRequest): Array<{ role: string; content: string }> {
    return [
      {
        role: 'system',
        content: [
          'Du bist ein hilfreicher AI Coding Assistant. Du kannst Code lesen, schreiben und modifizieren.',
          'Bei jeder UI-Erzeugung verwende die bestehende shadcn/ui-Bibliothek (Importe aus "@/components/ui/*") und Tailwind-Klassen; vermeide Inline-Styles.',
          'Erzeuge UI konsequent als React-TSX-Komponenten (.tsx) mit typisierten Props; vermeide Breaking Changes an bestehenden Public Interfaces.',
          'Wenn Terminal-Befehle benötigt werden, gib diese klar formatiert zurück.',
          'Benennung: Lege neue UI-Komponenten unter src/components/ ab, Dateiname in PascalCase (z.B. src/components/MyWidget.tsx).',
          'Exporte: Benannte Exporte statt default (außer bei erzwungenen Dateien wie App.tsx).',
          '"use client": Setze am Dateianfang, wenn Hooks/DOM/Browser APIs genutzt werden.',
          'A11y: Verbinde Inputs mit <Label>, setze alt-Texte und sinnvolle aria-* Attribute; nutze aria-live="polite" für Status.',
          'Klassen: Nutze cn aus "@/lib/utils" für bedingte Klassen.',
          'Dependencies: Keine neuen Pakete; nur vorhandene shadcn/ui & Tailwind nutzen.',
          'OUTPUT: Nutze pro Datei einen eigenen Codeblock mit Kopfzeile: ```<sprache> path:/relativer/pfad``` und enthalte nur Code.'
        ].join(' ')
      },
      {
        role: 'user',
        content: this.buildContextPrompt(request)
      }
    ];
  }

  /**
   * Parses the AI response into a structured format
   * @param data - Raw response data
   * @returns Structured AI response
   */
  private parseAIResponse(data: unknown): AICodeResponse {
    if (typeof data !== 'object' || data === null) {
      return { message: '' };
    }

    const response: AICodeResponse = {};
    const dataObj = data as Record<string, unknown>;
    
    if ('message' in dataObj && typeof dataObj.message === 'string') {
      response.message = dataObj.message;
    }
    
    if ('edits' in dataObj && Array.isArray(dataObj.edits)) {
      response.edits = dataObj.edits as Array<{ path: string; content: string }>;
      response.files = [
        ...(response.files || []),
        ...(dataObj.edits as Array<{ path: string; content: string }>).map(edit => ({
          path: edit.path,
          content: edit.content,
          type: this.contextManager.getFileType(edit.path)
        }))
      ];
    }
    
    if ('files' in dataObj && Array.isArray(dataObj.files)) {
      response.files = [...(response.files || []), ...(dataObj.files as FileContext[])];
    }
    
    if ('commands' in dataObj && Array.isArray(dataObj.commands)) {
      response.commands = dataObj.commands as TerminalCommand[];
    }
    
    if (response.message) {
      const { files: extracted, cleanedText } = this.extractFilesFromMessage(response.message);
      if (extracted.length > 0) {
        response.files = [...(response.files || []), ...extracted];
      }
      response.message = cleanedText.trim();
    } else {
      response.message = '';
    }
    
    return response;
  }

  /**
   * Extracts files from AI message text
   * @param text - Raw message text
   * @returns Object containing extracted files and cleaned text
   */
  private extractFilesFromMessage(text: string): { files: FileContext[]; cleanedText: string } {
    if (!text) return { files: [], cleanedText: text };

    const fenceRe = /```([^\n]*)\n([\s\S]*?)```/g;
    const rawMatches: Array<{ match: RegExpExecArray; header: string; body: string }> = [];
    let match;

    // Collect all code blocks first
    while ((match = fenceRe.exec(text)) !== null) {
      rawMatches.push({
        match,
        header: match[1]?.trim() || '',
        body: match[2]?.trim() || ''
      });
    }

    // Helper to extract path from header
    const extractPathFromHeader = (header: string): string | null => {
      const kv = header.match(/(?:file(?:name)?|path)[:=]\s*([^\s]+)/i);
      if (kv?.[1]) return kv[1].trim();
      
      const fileInHeader = header.match(/([\w./-]+\.(?:tsx?|jsx?|mjs|cjs|css|html?|json|md|txt|sh|ya?ml|toml))\b/);
      return fileInHeader?.[1] || null;
    };

    // Helper to extract path from body
    const extractPathFromBody = (body: string): { path: string; content: string } | null => {
      const lines = body.split('\n');
      const clean = (raw: string) => {
        let s = raw.trim();
        s = s.replace(/^\s*<!--\s*/, '');
        s = s.replace(/^\s*\/\*+\s*/, '');
        s = s.replace(/^\s*\/\/\s*/, '');
        s = s.replace(/^\s*#\s*/, '');
        s = s.replace(/^\s*--\s*/, '');
        s = s.replace(/^\s*;\s*/, '');
        s = s.replace(/^\s*\*\s*/, '');
        s = s.replace(/\s*\*\/\s*$/, '');
        s = s.replace(/\s*-->\s*$/, '');
        return s.trim();
      };
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = clean(lines[i]);
        const match = line.match(/^(?:file(?:\s*path)?|filename|filepath|path)\s*[:=]?\s*([^\s]+)$/i);
        if (match?.[1]) {
          return {
            path: match[1].trim(),
            content: [...lines.slice(0, i), ...lines.slice(i + 1)].join('\n')
          };
        }
        const bare = line.match(/\/(?:[A-Za-z0-9._\-\/]+)\.(?:tsx?|jsx?|mjs|cjs|css|html?|json|md|txt|ya?ml|toml)/);
        if (bare?.[0]) {
          return {
            path: bare[0],
            content: [...lines.slice(0, i), ...lines.slice(i + 1)].join('\n')
          };
        }
      }
      return null;
    };

    // Normalize file paths
    const normalizePath = (path: string): string => {
      let normalized = path.trim()
        .replace(/^["`']|["`']$/g, '')
        .replace(/^\[|\]$/g, '')
        .trim();
      
      return normalized.startsWith('/') ? normalized : `/${normalized}`;
    };

    // Process all matches
    let cleanedText = text;
    const extractedFiles: FileContext[] = [];
    let tempFileCounter = 1;
    const processedMatches: Array<{
      path: string;
      content: string;
      type: string;
      originalIndex: number;
    }> = [];

    // Process in reverse to handle string positions correctly
    for (let i = rawMatches.length - 1; i >= 0; i--) {
      const { match, header, body } = rawMatches[i];
      
      // Try to extract path from header or body
      let filePath = extractPathFromHeader(header);
      let content = body;
      
      if (!filePath) {
        const result = extractPathFromBody(body);
        if (result) {
          filePath = result.path;
          content = result.content;
        }
      }

      // Determine file type
      let fileType = '';
      if (filePath) {
        fileType = this.contextManager.getFileType(filePath);
      } else if (header) {
        fileType = header.split(/\s+/)[0] || 'text';
      }

      // Create a path if none was found
      if (!filePath) {
        filePath = `/temp-ai-code-${tempFileCounter++}.${fileType || 'txt'}`;
      } else {
        filePath = normalizePath(filePath);
      }

      processedMatches.push({
        path: filePath,
        content: content,
        type: fileType || this.contextManager.getFileType(filePath),
        originalIndex: match.index
      });

      // Remove the processed code block
      cleanedText = cleanedText.slice(0, match.index) + cleanedText.slice(match.index + match[0].length);
    }

    // Sort matches by original position and extract unique files (last occurrence wins)
    const uniqueFiles = new Map<string, FileContext>();
    processedMatches
      .sort((a, b) => a.originalIndex - b.originalIndex)
      .forEach(({ path, content, type }) => {
        uniqueFiles.set(path, { path, content, type });
      });

    // Clean up the text
    cleanedText = cleanedText
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return {
      files: Array.from(uniqueFiles.values()),
      cleanedText
    };
  }
}

// Export singleton instance
export const aiCodeService = new AICodeService();
