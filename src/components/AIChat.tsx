import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { motion, useSpring, AnimatePresence } from 'framer-motion';
import { flushSync } from 'react-dom';
import { useStreamedChat } from './hooks/use-streamed-chat';
import type { ChatMessage } from './hooks/use-streamed-chat';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
} from '@/components/ui/shadcn-io/ai/prompt-input';
import { Message as UIMessage, MessageAvatar, MessageContent } from '@/components/ai-elements/message';
import { Suggestions, Suggestion } from '@/components/ui/shadcn-io/ai/suggestion';
import type { ChatStatus } from 'ai';
import {
  Paperclip, Plus, Square, Loader2, FileCode,
  Terminal, FileText, Files, CheckCircle2, MessageSquare, History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileProgressShelf } from '@/components/file-progress-shelf';
import { Reasoning, ReasoningTrigger, ReasoningContent } from '@/components/ai-elements/reasoning';
import { ActionBubble, type ActionStep } from '@/components/ai/ActionBubble';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatHistory } from './ChatHistory';

function extractFilesFromText(text: string): Array<{ path: string; content: string }> {
  const results: Array<{ path: string; content: string }> = [];
  if (!text) return results;
  const fenceRe = /```([^\n]*)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  const tryFromHeader = (header: string): string | null => {
    const h = header.trim();
    const kv = h.match(/(?:^|\s)(?:file(?:name)?|path)\s*[:=]\s*([^\s]+)/i);
    if (kv?.[1]) return kv[1];
    const fileInHeader = h.match(/([A-Za-z0-9_./-]+\.(?:tsx|ts|jsx|js|mjs|cjs|css|html|json|md|txt|sh|yml|yaml|toml))/);
    if (fileInHeader?.[1]) return fileInHeader[1];
    return null;
  };
  const tryFromBody = (body: string): { path: string; content: string } | null => {
    const lines = body.split('\n');
    const checkLines = lines.slice(0, 3);
    for (let i = 0; i < checkLines.length; i++) {
      const cleaned = checkLines[i].replace(/<!--\s*|\s*-->/g, '').trim();
      const m1 = cleaned.match(/^\s*(?:\/\/|#|;)?\s*(?:File|Filename|Path)\s*:\s*(.+?)\s*$/i);
      if (m1?.[1]) {
        const path = m1[1].trim();
        const content = [...lines.slice(0, i), ...lines.slice(i + 1)].join('\n');
        return { path, content };
      }
    }
    return null;
  };
  const normalizePath = (p: string): string => {
    let path = p.trim().replace(/^["\'`]|"\'`]$/g, '');
    path = path.replace(/^[\[\]]$/g, '');
    if (!path.startsWith('/')) path = '/' + path;
    return path;
  };
  while ((m = fenceRe.exec(text)) != null) {
    const header = m[1] ?? '';
    const body = m[2] ?? '';
    let path = tryFromHeader(header);
    let content = body;
    if (!path) {
      const fromBody = tryFromBody(body);
      if (fromBody) { path = fromBody.path; content = fromBody.content; }
    }
    if (!path) continue;
    const normalized = normalizePath(path);
    if (!/\.[A-Za-z0-9]+$/.test(normalized)) continue;
    results.push({ path: normalized, content });
  }
  const dedup: Record<string, string> = {};
  for (const f of results) dedup[f.path] = f.content;
  return Object.entries(dedup).map(([path, content]) => ({ path, content }));
}

function FileProgressCard({ file, onViewFile }: { 
  file: FileProgress; 
  onViewFile?: (path: string) => void 
}) {
  const { path, status } = file;
  const [isVisible, setIsVisible] = useState(true);

  // Handle animations when status changes
  useEffect(() => {
    if (status === 'done') {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 1500); // Keep the success state visible for 1.5 seconds
      return () => clearTimeout(timer);
    }
  }, [status]);

  if (!isVisible) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="flex items-center justify-between rounded-xl border bg-muted/40 backdrop-blur-sm px-4 py-3"
    >
      <div className="flex items-center gap-3">
        {status === 'writing' ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {status === 'writing' ? 'Generiere Datei' : 'Datei erstellt'}
          </span>
          <span 
            className="text-xs text-muted-foreground font-mono cursor-pointer hover:underline"
            onClick={() => onViewFile?.(path)}
          >
            {path}
          </span>
        </div>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 text-xs"
        onClick={() => onViewFile?.(path)}
      >
        Anzeigen
      </Button>
    </motion.div>
  );
}

function StepBadge({ label, state }: { label: string; state: 'pending' | 'done' | 'error' }) {
  const cls = state === 'done'
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : state === 'error'
      ? 'bg-red-500/10 text-red-400 border-red-500/20'
      : 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${cls}`}>
      {state === 'done' ? <CheckCircle2 className="h-3.5 w-3.5" /> : state === 'error' ? <Square className="h-3.5 w-3.5" /> : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {label}
    </span>
  );
}

interface AIChatProps {
  onNewFiles: (files: Array<{ path: string; content: string }>) => void;
  onRunCommand?: (command: string) => Promise<{ output: string; error?: string }>;
  files?: Record<string, any>;
  currentFile?: { path: string; content: string };
  terminalOutput?: string;
  onFocusFile?: (path: string) => void;
}

function SmoothedTypewriter({
  text,
  stiffness = 280,
  damping = 28,
  mass = 0.18,
  speed = 1.0,
  className = ''
}: { 
  text: string; 
  stiffness?: number; 
  damping?: number; 
  mass?: number;
  speed?: number;
  className?: string;
}) {
  // Use Intl.Segmenter for grapheme-aware splitting if available
  const segmenterRef = useRef<Intl.Segmenter | null>(
    typeof Intl?.Segmenter === 'function' 
      ? new Intl.Segmenter('de', { granularity: 'grapheme' }) 
      : null
  );
  
  // Split text into graphemes (visual characters)
  const graphemes = useMemo(() => {
    if (!text) return [] as string[];
    if (segmenterRef.current) {
      return Array.from(segmenterRef.current.segment(text), s => s.segment);
    }
    return Array.from(text);
  }, [text]);

  const [displayed, setDisplayed] = useState<string>('');
  const prevLenRef = useRef<number>(0);
  
  // Configure spring animation with dynamic speed
  const progress = useSpring(0, { 
    stiffness: stiffness * speed,
    damping: damping * Math.sqrt(speed),
    mass,
    restSpeed: 0.01,
    restDelta: 0.01
  });

  // Update displayed text when progress changes
  useEffect(() => {
    const unsub = progress.on('change', (v) => {
      const n = Math.floor((v as number) || 0);
      if (n >= 0) {
        setDisplayed(prev => {
          const newText = graphemes.slice(0, n).join('');
          // Only update if content actually changed
          return newText !== prev ? newText : prev;
        });
      }
    });
    return () => { unsub(); };
  }, [graphemes, progress]);

  // Animate to new text length when it changes
  useEffect(() => {
    const prevLen = prevLenRef.current;
    const nextLen = graphemes.length;
    
    // Only animate if we have new content
    if (nextLen > prevLen) {
      // Set initial position
      progress.set(prevLen);
      // Animate to new length
      progress.set(nextLen);
    } else if (nextLen < prevLen) {
      // If text got shorter, update immediately without animation
      progress.set(nextLen);
    }
    
    prevLenRef.current = nextLen;
  }, [graphemes.length, progress]);

  return (
    <span className={`whitespace-pre-wrap ${className}`}>
      {displayed}
      {/* Optional cursor animation */}
      <span className="animate-pulse">|</span>
    </span>
  );
}

export default function AIChat({
  onNewFiles,
  onRunCommand,
  files = {},
  currentFile,
  terminalOutput,
  onFocusFile
}: AIChatProps) {
  // Helper to update progress in messages
  const updateMessageProgress = useCallback((messageId: string, newProgress: FileProgress) => {
    setMessages(prev => {
      const msgIndex = prev.findIndex(m => m.id === messageId);
      if (msgIndex === -1) return prev;
      
      const existingProgress = prev[msgIndex].progress || [];
      const existingIndex = existingProgress.findIndex(p => p.path === newProgress.path);
      
      const updatedProgress = existingIndex >= 0
        ? [
            ...existingProgress.slice(0, existingIndex),
            { ...existingProgress[existingIndex], ...newProgress },
            ...existingProgress.slice(existingIndex + 1)
          ]
        : [...existingProgress, newProgress];
      
      const next = [...prev];
      next[msgIndex] = { ...prev[msgIndex], progress: updatedProgress };
      return next;
    });
  }, []);

  const [messages, setMessages] = useState<Array<{ 
    id: string; 
    role: 'user' | 'assistant' | 'system'; 
    content: string;
    timestamp: number;
    files?: FileContext[];
    commands?: TerminalCommand[];
    progress?: FileProgress[];
    reasoning?: string;
    type?: string;
    action?: any;
  }>>([
    {
      id: 'm1',
      role: 'assistant',
      content: '👋 Hallo! Ich bin dein AI Coding Assistant. Ich kann:\n\n• **Code lesen und schreiben** - Zeige mir deinen Code oder bitte mich, neuen zu erstellen\n• **Dateien bearbeiten** - Ich kann direkt in deinem Editor arbeiten\n• **Terminal-Befehle ausführen** - Lass mich Befehle für dich ausführen\n• **Live Preview sehen** - Ich sehe deine Änderungen in Echtzeit\n\nWie kann ich dir helfen?',
      timestamp: Date.now()
    },
  ]);
  const [status, setStatus] = useState<ChatStatus | undefined>(undefined);
  const [contextMode, setContextMode] = useState<'current' | 'all' | 'none'>('current');
  const [includeTerminal, setIncludeTerminal] = useState(false);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [steps, setSteps] = useState<Record<string, 'pending' | 'done' | 'error'>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const getStepLabel = useCallback((id: string) => {
    const labels: Record<string, string> = { analyze: 'Analyse', plan: 'Plan', generate: 'Generierung', reply: 'Antwort' };
    return labels[id] || id;
  }, []);
  const updateStep = useCallback((id: string, state: 'pending' | 'done' | 'error') => {
    setSteps(prev => ({ ...prev, [id]: state }));
  }, []);
  const formRef = useRef<HTMLFormElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const actionMessageIdRef = useRef<string | null>(null);
  // Streaming extraction helpers
  const streamBufferRef = useRef<string>('');
  const emittedPathsRef = useRef<Set<string>>(new Set());
  // Load existing session or create new one
  useEffect(() => {
    const savedSession = localStorage.getItem(`ai-chat-session-${sessionId}`);
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setCurrentSession(session);
        setMessages(session.messages);
      } catch (error) {
        console.error('Error loading session:', error);
      }
    }
  }, [sessionId]);

  // Save current session
  const saveCurrentSession = useCallback(() => {
    if (messages.length > 1) { // Only save if there are actual messages
      const session: ChatSession = {
        id: sessionId,
        title: messages.find(m => m.role === 'user')?.content.slice(0, 50) || 'Neuer Chat',
        messages: messages,
        createdAt: currentSession?.createdAt || Date.now(),
        updatedAt: Date.now()
      };
      setCurrentSession(session);
      localStorage.setItem(`ai-chat-session-${sessionId}`, JSON.stringify(session));
    }
  }, [messages, sessionId, currentSession]);

  // Save session when messages change
  useEffect(() => {
    saveCurrentSession();
  }, [saveCurrentSession]);

  // Handle loading a session from history
  const handleLoadSession = useCallback((session: ChatSession) => {
    setSessionId(session.id);
    setCurrentSession(session);
    setMessages(session.messages);
    setShowHistory(false);
  }, []);

  // Handle starting a new chat
  const handleNewChat = useCallback(() => {
    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);
    setCurrentSession(null);
    setMessages([{
      id: 'm1',
      role: 'assistant',
      content: '👋 Hallo! Ich bin dein AI Coding Assistant. Ich kann:\n\n• **Code lesen und schreiben** - Zeige mir deinen Code oder bitte mich, neuen zu erstellen\n• **Dateien bearbeiten** - Ich kann direkt in deinem Editor arbeiten\n• **Terminal-Befehle ausführen** - Lass mich Befehle für dich ausführen\n• **Live Preview sehen** - Ich sehe deine Änderungen in Echtzeit\n\nWie kann ich dir helfen?',
      timestamp: Date.now()
    }]);
    setShowHistory(false);
  }, []);

  // Build action steps from files to apply vs current files map
  const buildActionSteps = useCallback((toApply: Array<{ path: string; content: string }>): ActionStep[] => {
    const steps: ActionStep[] = [];
    for (const f of toApply) {
      const existing = files[f.path];
      const type: 'create' | 'edit' = existing ? 'edit' : 'create';
      steps.push({ id: `${type}:${f.path}`, type, label: type === 'create' ? 'Datei erstellen' : 'Datei bearbeiten', path: f.path, state: 'pending' });
    }
    return steps;
  }, [files]);

  // Insert or update an action message bubble
  const upsertActionMessage = useCallback((opts: { steps: ActionStep[]; phase: 'running' | 'complete' | 'error' }) => {
    const { steps, phase } = opts;
    const progress = { done: steps.filter(s => s.state === 'done').length, total: steps.length };
    
    setMessages(prev => {
      const id = actionMessageIdRef.current ?? crypto.randomUUID();
      if (!actionMessageIdRef.current) actionMessageIdRef.current = id;
      
      const existingMsgIndex = prev.findIndex(m => m.id === id);
      const actionMsg = { 
        id, 
        role: 'assistant' as const, 
        content: '', 
        type: 'action' as const, 
        action: { steps, phase, progress },
        timestamp: Date.now()
      };
      
      const next = [...prev];
      if (existingMsgIndex === -1) {
        next.push(actionMsg);
      } else {
        next[existingMsgIndex] = { ...next[existingMsgIndex], ...actionMsg };
      }
      return next;
    });
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const root = scrollAreaRef.current;
    if (!root) return;
    const viewport = root.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    scrollToBottom('auto');
  }, [messages, scrollToBottom]);

  // Extract completed code fences (```header\nbody```), return files and leftover buffer
  const extractCompletedFences = useCallback((buffer: string): { files: Array<{ path: string; content: string }>; remaining: string } => {
    if (!buffer) return { files: [], remaining: '' };
    const re = /```([^\n]*)\n([\s\S]*?)```/g;
    const files: Array<{ path: string; content: string }> = [];
    let m: RegExpExecArray | null;
    let lastIndex = 0;
    while ((m = re.exec(buffer)) !== null) {
      lastIndex = re.lastIndex;
      const header = m[1] ?? '';
      const body = m[2] ?? '';
      let path: string | null = null;
      const h = header.trim();
      const kv = h.match(/(?:^|\s)(?:file(?:name)?|path)\s*[:=]\s*([^\s]+)/i);
      if (kv?.[1]) path = kv[1];
      if (!path) {
        const fileInHeader = h.match(/([A-Za-z0-9_./-]+\.(?:tsx|ts|jsx|js|mjs|cjs|css|html|json|md|txt|sh|yml|yaml|toml))/);
        if (fileInHeader?.[1]) path = fileInHeader[1];
      }
      if (!path) {
        const lines = body.split('\n').slice(0, 3);
        for (const ln of lines) {
          const cleaned = ln.replace(/<!--\s*|\s*-->/g, '').trim();
          const m1 = cleaned.match(/^\s*(?:\/\/|#|;)?\s*(?:File|Filename|Path)\s*:\s*(.+?)\s*$/i);
          if (m1?.[1]) { path = m1[1].trim(); break; }
        }
      }
      if (!path) continue;
      let normalized = path.trim().replace(/^['"`]|['"`]$/g, '');
      if (!normalized.startsWith('/')) normalized = '/' + normalized;
      files.push({ path: normalized, content: body });
    }
    const remaining = buffer.slice(lastIndex);
    return { files, remaining };
  }, []);

  // Update progress data when steps change
  useEffect(() => {
    const stepArray = Object.entries(steps).map(([id, state]) => ({
      id,
      label: getStepLabel(id),
      status: state === 'done' ? 'completed' : state === 'error' ? 'error' : 'pending' as const,
      progress: state === 'done' ? 100 : state === 'error' ? 0 : 50
    }));

    // Progress data management removed - using direct step tracking instead
  }, [steps, getStepLabel]);

  // Update current file in context
  useEffect(() => {
    if (currentFile) {
      aiCodeService.getContextManager().setCurrentFile({
        path: currentFile.path,
        content: currentFile.content,
        type: getFileType(currentFile.path)
      });
    }
  }, [currentFile]);


  // Add terminal output to context if available
  useEffect(() => {
    if (terminalOutput) {
      aiCodeService.getContextManager().addTerminalCommand({
        command: 'terminal output',
        output: terminalOutput
      });
    }
  }, [terminalOutput]);

  const getFileType = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript', 
      'ts': 'typescript',
      'tsx': 'typescript',
      'css': 'css',
      'html': 'html',
      'json': 'json'
    };
    return typeMap[ext || ''] || 'text';
  };

  const appendToAssistant = useCallback((assistantId: string, delta: string) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === assistantId);
      if (idx === -1) {
        return [...prev, { id: assistantId, role: 'assistant', content: delta, timestamp: Date.now(), reasoning: '' }];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], content: next[idx].content + delta, timestamp: Date.now(), reasoning: next[idx].reasoning || '' };
      return next;
    });
  }, []);

  const appendToReasoning = useCallback((assistantId: string, delta: string) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === assistantId);
      if (idx === -1) {
        return [...prev, { id: assistantId, role: 'assistant', content: '', reasoning: delta, timestamp: Date.now() }];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], reasoning: (next[idx].reasoning || '') + delta };
      return next;
    });
  }, []);
  const detectCodeIntent = useCallback((input: string) => {
    const lowered = input.toLowerCase();
    const keywords = [
      'erzeuge', 'erstelle', 'generiere', 'implementiere', 'schreibe', 'baue',
      'component', 'komponente', 'seite', 'api route', 'app', 'projekt', 'projektstruktur',
      'code:', 'datei', 'dateien', 'file', 'files', 'ordner', 'verzeichnis'
    ];
    return keywords.some(k => lowered.includes(k));
  }, []);

  // Minimal typewriter effect for programmatic assistant messages
  const startTypewriter = useCallback((assistantId: string, fullText: string, speedMs: number = 12) => {
    let index = 0;
    setStatus('streaming');
    const timer = setInterval(() => {
      const next = fullText.slice(index, index + 2);
      index += 2;
      if (next) appendToAssistant(assistantId, next);
      if (index >= fullText.length) {
        clearInterval(timer);
        setStatus(undefined);
      }
    }, speedMs);
    return () => clearInterval(timer);
  }, [appendToAssistant]);

  // Clear current session data
  const clearCurrentSession = useCallback(() => {
    localStorage.removeItem(`ai-chat-session-${sessionId}`);
    setCurrentSession(null);
  }, [sessionId]);

  const handleSubmit = useCallback(async (formData: FormData) => {
    const text = (formData.get('message') as string)?.trim();
    if (!text) return;

    // Clear input immediately
    if (formRef.current) {
      const textarea = formRef.current.querySelector('textarea[name="message"]') as HTMLTextAreaElement | null;
      if (textarea) textarea.value = '';
    }

    // Add user message synchronously to force paint
    const userId = crypto.randomUUID();
    flushSync(() => {
      setMessages((prev) => [...prev, { id: userId, role: 'user', content: text, timestamp: Date.now() }]);
    });
    scrollToBottom('auto');

    // Prepare assistant id; bubble will be created on first streamed chunk
    const assistantId = crypto.randomUUID();

    // Add a preliminary confirmation message before starting the actual request
    const confirmationText = "Gerne, ich kümmere mich darum... einen Moment bitte.";
    startTypewriter(assistantId, confirmationText, 15);
    // Give the typewriter a moment to start before the heavy lifting
    await new Promise(resolve => setTimeout(resolve, 300));

    // Create abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Ensure user bubble renders before streaming begins
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    // Start streaming
    setStatus('streaming');
    setLiveStatus(null);
    setSteps({});
    // Task progress UI removed

    try {
      const contextManager = aiCodeService.getContextManager();

      // Build context prompt
      const parts: string[] = [];
      parts.push(text);

      if (contextMode === 'current' && currentFile) {
        parts.push(`\nCurrent file: ${currentFile.path}\n\
` + '```' + `${getFileType(currentFile.path)}
${currentFile.content}
` + '```');
      } else if (contextMode === 'all') {
        const all = contextManager.getAllFiles();
        if (all.length > 0) {
          parts.push('\nProject files:');
          all.forEach(f => {
            parts.push(`\n${f.path}:\n\
` + '```' + `${f.type || ''}
${f.content}
` + '```');
          });
        }
      }

      if (includeTerminal) {
        const th = contextManager.getTerminalHistory();
        if (th.length > 0) {
          parts.push('\nTerminal history:');
          th.slice(-5).forEach(cmd => {
            parts.push(`$ ${cmd.command}`);
            if (cmd.output) parts.push(cmd.output);
            if (cmd.error) parts.push(`Error: ${cmd.error}`);
          });
        }
      }

      if (detectCodeIntent(text)) {
        // CODE MODE: strukturierte Code-Generierung (keine Streaming-Antwort)
        setStatus('submitted');

        const requestFiles: FileContext[] = [];
        const terminalHistory = undefined;

        const response = await aiCodeService.processRequest({
          message: text,
          files: requestFiles,
          currentFile: undefined,
          terminalHistory,
          mode: 'code'
        });

        if (response.files && response.files.length > 0) {
          const filesToApply = response.files.map(f => ({
            path: f.path.startsWith('/') ? f.path : `/${f.path}`,
            content: f.content
          }));
          // Show action bubble (running)
          const actionSteps = buildActionSteps(filesToApply);
          upsertActionMessage({ steps: actionSteps, phase: 'running' });

          // Apply files
          onNewFiles(filesToApply);

          // Mark all steps done and complete
          const doneSteps = actionSteps.map(s => ({ ...s, state: 'done' as const }));
          upsertActionMessage({ steps: doneSteps, phase: 'complete' });
        } else if (response.message) {
          startTypewriter(assistantId, response.message, 10);
        }

        // Handle terminal commands
        if (response.commands && response.commands.length > 0 && onRunCommand) {
          const commandResults: TerminalCommand[] = [];

          for (const cmd of response.commands) {
            const result = await onRunCommand(cmd.command);
            commandResults.push({
              ...cmd,
              output: result.output,
              error: result.error
            });

            // Add to context manager
            const contextManager2 = aiCodeService.getContextManager();
            contextManager2.addTerminalCommand({
              command: cmd.command,
              output: result.output,
              error: result.error
            });
          }

          // Update message with command results
          setMessages(prev => prev.map(m =>
            m.id === assistantId
              ? { ...m, commands: commandResults }
              : m
          ));
        }

        setStatus(undefined);
      } else {
        // CHAT MODE: Next.js API route (text/event-stream)
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortController.signal,
          body: JSON.stringify({ messages: [{ role: 'user', content: parts.join('\n\n') }] })
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`AI request failed: ${res.status} ${res.statusText} - ${errorText}`);
        }

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('text/event-stream')) {
          const text = await res.text();
          if (text) {
            appendToAssistant(assistantId, text);
            const filesFound = extractFilesFromText(text);
            if (filesFound.length > 0) onNewFiles(filesFound);
          }
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let collectedText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          for (const evt of events) {
            const line = evt.trim();
            if (!line) continue;
            const dataLine = line.split('\n').find(l => l.startsWith('data:')) || '';
            const data = dataLine.slice(5).trim();
            if (!data) continue;
            try {
              const json = JSON.parse(data);
              switch (json?.type) {
                case 'token':
                  if (typeof json.text === 'string') {
                    collectedText += String(json.text);
                    appendToAssistant(assistantId, String(json.text));
                    // Incremental file extraction during streaming
                    streamBufferRef.current += String(json.text);
                    const { files: streamedFiles, remaining } = extractCompletedFences(streamBufferRef.current);
                    streamBufferRef.current = remaining;
                    if (streamedFiles.length > 0) {
                      const toEmit = streamedFiles.filter(f => {
                        if (emittedPathsRef.current.has(f.path)) return false;
                        emittedPathsRef.current.add(f.path);
                        return true;
                      });
                      if (toEmit.length > 0) onNewFiles(toEmit);
                    }
                  }
                  break;
                case 'ui': {
                  // Server-driven UI message events (AI SDK UI pattern)
                  const actionId = String(json.actionId || 'fa-1');
                  const kind = String(json.kind || '');
                  // Bind the current action bubble to this id
                  actionMessageIdRef.current = actionId;
                  if (kind === 'file-action-start') {
                    const stepsFromServer = Array.isArray(json.steps) ? json.steps : [];
                    const steps: ActionStep[] = stepsFromServer.map((s: any) => ({
                      id: String(s.id || `${String(s.type||'step')}:${String(s.path||'')}`),
                      type: (s.type === 'delete' ? 'delete' : s.type === 'edit' ? 'edit' : 'create'),
                      label: String(s.label || (s.type === 'edit' ? 'Datei bearbeiten' : s.type === 'delete' ? 'Datei löschen' : 'Datei erstellen')),
                      path: typeof s.path === 'string' ? s.path : undefined,
                      state: 'pending'
                    }));
                    upsertActionMessage({ steps, phase: 'running' });
                  } else if (kind === 'file-action-progress') {
                    // Update a single step status
                    const stepId = String(json.stepId || '');
                    const status: 'pending' | 'done' | 'error' = json.status === 'done' ? 'done' : json.status === 'error' ? 'error' : 'pending';
                    setMessages(prev => {
                      const id = actionMessageIdRef.current;
                      if (!id) return prev;
                      const idx = prev.findIndex(m => m.id === id);
                      if (idx === -1) return prev;
                      const msg: any = prev[idx];
                      const steps: ActionStep[] = (msg.action?.steps ?? []).map((s: ActionStep) => s.id === stepId ? { ...s, state: status as any } : s);
                      const progress = { done: steps.filter(s => s.state === 'done').length, total: steps.length };
                      const next = [...prev];
                      next[idx] = { ...msg, action: { steps, phase: status === 'error' ? 'error' : 'running', progress } };
                      return next;
                    });
                  } else if (kind === 'file-action-complete') {
                    setMessages(prev => {
                      const id = actionMessageIdRef.current;
                      if (!id) return prev;
                      const idx = prev.findIndex(m => m.id === id);
                      if (idx === -1) return prev;
                      const msg: any = prev[idx];
                      const steps: ActionStep[] = (msg.action?.steps ?? []).map((s: ActionStep) => s.state === 'pending' ? { ...s, state: 'done' as const } : s);
                      const progress = { done: steps.filter(s => s.state === 'done').length, total: steps.length };
                      const next = [...prev];
                      next[idx] = { ...msg, action: { steps, phase: 'complete', progress } };
                      return next;
                    });
                  }
                  break;
                }
                case 'reasoning':
                  if (typeof json.text === 'string') appendToReasoning(assistantId, String(json.text));
                  break;
                case 'status':
                  if (typeof json.message === 'string') setLiveStatus(String(json.message));
                  break;
                case 'stepStart':
                  if (json?.id) {
                    setLiveStatus(`Starte: ${String(json.id)}`);
                    updateStep(String(json.id), 'pending');
                  }
                  break;
                case 'stepDone':
                  if (json?.id) {
                    setLiveStatus(`Fertig: ${String(json.id)}`);
                    updateStep(String(json.id), 'done');
                  }
                  break;
                case 'done':
                  break;
                default:
                  break;
              }
            } catch {
              // If parsing fails, assume it's a raw string token
              if (data) {
                appendToAssistant(assistantId, data);
              }
            }
          }
        }

        if (collectedText) {
          const filesFound = extractFilesFromText(collectedText);
          if (filesFound.length > 0) onNewFiles(filesFound);
        }
        
        setStatus(undefined);
        setLiveStatus(null);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        appendToAssistant(assistantId, '❌ Anfrage wurde abgebrochen.');
      } else {
        console.error('AI Stream Error:', err);
        appendToAssistant(assistantId, `❌ Fehler: ${err?.message || 'Unbekannter Fehler'}`);
      }
      setStatus('error');
      setLiveStatus(null);
      // Reflect error in action bubble if present
      if (actionMessageIdRef.current) {
        setMessages(prev => {
          const idx = prev.findIndex(m => m.id === actionMessageIdRef.current);
          if (idx === -1) return prev;
          const msg: any = prev[idx];
          const steps = (msg.action?.steps ?? []).map((s: ActionStep) => s.state === 'pending' ? { ...s, state: 'error' as const } : s);
          const progress = { done: steps.filter((s: ActionStep) => s.state === 'done').length, total: steps.length };
          const next = [...prev];
          next[idx] = { ...msg, action: { steps, phase: 'error', progress } };
          return next;
        });
      }
    } finally {
      // Clear textarea
      if (formRef.current) {
        const textarea = formRef.current.querySelector('textarea[name="message"]') as HTMLTextAreaElement | null;
        if (textarea) textarea.value = '';
      }
      abortControllerRef.current = null;
      actionMessageIdRef.current = null;
    }
  }, [appendToAssistant, currentFile, contextMode, includeTerminal, onNewFiles, onRunCommand, updateStep, files]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStatus('error');
      setLiveStatus(null);
    }
  }, []);

  const onSuggestionClick = useCallback((suggestion: string) => {
    if (!formRef.current) return;
    const textarea = formRef.current.querySelector('textarea[name="message"]') as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.value = suggestion;
      textarea.focus();
    }
  }, []);

  const suggestions = useMemo(() => {
    if (currentFile?.path) {
      const fileName = currentFile.path.split('/').pop();
      return [
        `Erkläre ${fileName}`,
        `Füge Kommentare hinzu`,
        `Schreibe Tests für ${fileName}`,
        'Refactor diesen Code'
      ];
    }
    return [
      'Erstelle eine React Komponente',
      'Füge Tailwind Styles hinzu',
      'Schreibe eine API Route',
      'Erstelle eine Utility Funktion'
    ];
  }, [currentFile]);

  return (
    <div className="flex h-full w-full bg-background">
      {/* History Sidebar */}
      {showHistory && (
        <div className="w-80 border-r bg-background">
          <ChatHistory
            onLoadSession={handleLoadSession}
            onNewChat={handleNewChat}
            currentSessionId={sessionId}
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with History Toggle */}
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="gap-2"
            >
              <History className="h-4 w-4" />
              Verlauf
            </Button>
            {currentSession && (
              <Badge variant="secondary" className="text-xs">
                {currentSession.title}
              </Badge>
            )}
          </div>
          <Button onClick={handleNewChat} size="sm" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Neuer Chat
          </Button>
        </div>

        {/* Live Status */}
        {liveStatus && (
          <div className="px-3 py-1 text-xs text-muted-foreground">{liveStatus}</div>
        )}

        {/* Step timeline */}
        {Object.keys(steps).length > 0 && (
          <div className="px-3 py-1 flex flex-wrap gap-2">
            {(() => {
              const order = ['analyze','plan','generate','reply'];
              const rest = Object.keys(steps).filter(k => !order.includes(k));
              const ids = [...order.filter(k => k in steps), ...rest];
              return ids.map(id => (
                <StepBadge key={id} label={getStepLabel(id)} state={steps[id]} />
              ));
            })()}
          </div>
        )}

        {/* File Progress Shelf */}
        <div className="px-3 pt-2 xl:px-4">
          <div className="xl:grid xl:grid-cols-[1fr_minmax(280px,420px)] xl:gap-4">
            <div className="hidden xl:block" />
            <div /> {/* Placeholder for file progress shelf */}
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef as any} className="flex-1 p-4">
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((m) => (
              <div key={m.id}>
                {m.role === 'assistant' && (m as any).reasoning && (
                  <div className="mb-2">
                    <Reasoning
                      isStreaming={status === 'streaming' && m.id === messages.at(-1)?.id}
                      defaultOpen={status === 'streaming'}
                      className="bg-transparent p-0"
                    >
                      <ReasoningTrigger />
                      <ReasoningContent>
                        {(m as any).reasoning}
                      </ReasoningContent>
                    </Reasoning>
                  </div>
                )}
                <UIMessage from={m.role === 'user' ? 'user' : 'assistant' as const}>
                  <MessageAvatar
                    src={m.role === 'user' ? '/avatars/user.png' : '/avatars/assistant.png'}
                    name={m.role}
                  />
                  <MessageContent className="prose prose-sm dark:prose-invert max-w-none">
                    {/* Action bubble rendering */}
                    {(m as any).type === 'action' ? (
                      <ActionBubble
                        steps={(m as any).action?.steps ?? []}
                        phase={(m as any).action?.phase ?? 'running'}
                        progress={(m as any).action?.progress ?? { done: 0, total: 0 }}
                      />
                    ) : (
                      m.role === 'assistant' && status === 'streaming' && m === messages[messages.length - 1] ? (
                        <SmoothedTypewriter
                          text={m.content}
                          speed={1.2}
                          className="text-foreground"
                          stiffness={320}
                          damping={24}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap">{m.content}</div>
                      )
                    )}
                    {m.progress && m.progress.length > 0 && (
                      <div className="mt-3">
                        <AnimatePresence mode="wait">
                          {m.progress.length > 0 && (
                            <FileProgressCard
                              key={m.progress[0].path}
                              file={m.progress[0]}
                              onViewFile={onFocusFile}
                            />
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    {!m.progress && m.files && m.files.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="text-xs text-muted-foreground">📁 Dateien bearbeitet:</div>
                        {m.files.map((file, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            <FileText className="h-3 w-3 mr-1" />
                            {file.path}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {m.commands && m.commands.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="text-xs text-muted-foreground">🖥️ Terminal-Befehle:</div>
                        {m.commands.map((cmd, idx) => (
                          <div key={idx} className="font-mono text-xs bg-muted p-2 rounded">
                            <div className="text-green-500">$ {cmd.command}</div>
                            {cmd.output && <div className="text-gray-400 mt-1">{cmd.output}</div>}
                            {cmd.error && <div className="text-red-400 mt-1">Error: {cmd.error}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </MessageContent>
                </UIMessage>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4">
          <Suggestions>
            {suggestions.map((s) => (
              <Suggestion key={s} suggestion={s} onClick={onSuggestionClick} />
            ))}
          </Suggestions>

          <PromptInput
            ref={formRef}
            action={handleSubmit}
            className="mt-3"
          >
            <PromptInputTextarea
              placeholder={currentFile ? `Frag mich etwas über ${currentFile.path}...` : "Frag mich etwas über deinen Code..."}
              className="min-h-[60px]"
            />
            <PromptInputToolbar>
              <PromptInputTools>
                <PromptInputButton variant="ghost" onClick={() => setMessages([messages[0]])}>
                  <Plus className="h-4 w-4" />
                  Neuer Chat
                </PromptInputButton>
                <PromptInputButton variant="ghost">
                  <Paperclip className="h-4 w-4" />
                  Datei
                </PromptInputButton>
              </PromptInputTools>
              <div className="flex items-center gap-2">
                {status === 'streaming' && (
                  <PromptInputButton
                    variant="ghost"
                    onClick={handleCancel}
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  >
                    <Square className="h-4 w-4" />
                    Stop
                  </PromptInputButton>
                )}
                <PromptInputSubmit status={status} />
              </div>
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}