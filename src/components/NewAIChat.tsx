"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Message, MessageContent, MessageAvatar } from "@/components/ai-elements/message";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Response } from "@/components/ai-elements/response";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { nanoid } from "nanoid";
import { usePathname, useSearchParams } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import { AI_Prompt } from "@/components/ui/animated-ai-input";
import { AITodoPlan, type TodoPlan, type TodoStep } from "@/components/ai-todo-plan";

interface NewAIChatProps {
  onNewFiles?: (files: Array<{ path: string; content: string }>) => void;
  onRunCommand?: (command: string) => Promise<{ output: string; error?: string }>;
  files?: Record<string, string>;
  currentFile?: { path: string; content: string } | undefined;
  terminalOutput?: string;
  onFocusFile?: (path: string) => void;
  projectId?: string;
}

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  files?: Array<{ path: string; content: string; type?: string }>;
  timestamp: Date;
};

type ChatStatus = "idle" | "streaming" | "error";

export function NewAIChat({
  onNewFiles,
  onRunCommand,
  files,
  currentFile,
  terminalOutput,
  onFocusFile,
  projectId: projectIdProp
}: NewAIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [streamingMessage, setStreamingMessage] = useState<string>("");
  const [reasoningStream, setReasoningStream] = useState<string>("");
  const [showReasoning, setShowReasoning] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [lastErrorDetail, setLastErrorDetail] = useState<string | null>(null);
  const [todoPlan, setTodoPlan] = useState<TodoPlan | null>(null);
  const [sessionMemory, setSessionMemory] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = (() => {
    if (projectIdProp) return projectIdProp;
    try {
      const m = pathname?.match(/^\/projects\/([^\/]+)/);
      if (m?.[1]) return m[1];
      const q = searchParams?.get('projectId');
      if (q) return q;
    } catch {}
    return null;
  })();

  // Load session memory (local + server) when project changes
  useEffect(() => {
    if (!projectId) return;
    try {
      const local = localStorage.getItem(`project:${projectId}:memory:v1`);
      if (local) setSessionMemory(local);
    } catch {}
    // Try server memory (soft fail if route/table missing)
    fetch(`/api/projects/${projectId}/memory`, { method: 'GET' })
      .then(r => r.ok ? r.json() : null)
      .then((j) => { if (j && typeof j.memory === 'string' && j.memory.trim()) setSessionMemory(j.memory); })
      .catch(() => {});
  }, [projectId]);

  const extractFilesFromMessage = useCallback((text: string): { files: Array<{ path: string; content: string; type?: string }>; cleanedText: string } => {
    if (!text) return { files: [], cleanedText: text };

    const fenceRe = /```([^\n]*)\n([\s\S]*?)```/g;
    const rawMatches: Array<{ match: RegExpExecArray; header: string; body: string }> = [];
    let match: RegExpExecArray | null;

    while ((match = fenceRe.exec(text)) !== null) {
      rawMatches.push({ match, header: match[1]?.trim() || '', body: match[2]?.trim() || '' });
    }

    const extractPathFromHeader = (header: string): string | null => {
      const kv = header.match(/(?:file(?:name)?|path)[:=]\s*([^\s]+)/i);
      if (kv?.[1]) return kv[1].trim();
      const fileInHeader = header.match(/([\w./-]+\.(?:tsx?|jsx?|mjs|cjs|css|html?|json|md|txt|sh|ya?ml|toml))\b/);
      return fileInHeader?.[1] || null;
    };

    const extractPathFromBody = (body: string): { path: string; content: string } | null => {
      const lines = body.split('\n');
      const clean = (raw: string) => {
        let s = raw.trim();
        // strip common comment starters
        s = s.replace(/^\s*<!--\s*/, '');
        s = s.replace(/^\s*\/\*+\s*/, '');
        s = s.replace(/^\s*\/\/\s*/, '');
        s = s.replace(/^\s*#\s*/, '');
        s = s.replace(/^\s*--\s*/, '');
        s = s.replace(/^\s*;\s*/, '');
        s = s.replace(/^\s*\*\s*/, '');
        // strip common comment enders
        s = s.replace(/\s*\*\/\s*$/, '');
        s = s.replace(/\s*-->\s*$/, '');
        return s.trim();
      };
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = clean(lines[i]);
        // 1) labeled path (allow optional ':' or '='), accept file|filename|filepath|file path|path
        const m = line.match(/^(?:file(?:\s*path)?|filename|filepath|path)\s*[:=]?\s*([^\s]+)$/i);
        if (m?.[1]) {
          return { path: m[1].trim(), content: [...lines.slice(0, i), ...lines.slice(i + 1)].join('\n') };
        }
        // 2) any absolute path within the line (e.g., "<!-- /src/App.tsx -->" or "/* /src/x.ts */")
        const bareAny = line.match(/\/(?:[A-Za-z0-9._\-\/]+)\.(?:tsx?|jsx?|mjs|cjs|css|html?|json|md|txt|ya?ml|toml)/);
        if (bareAny?.[0]) {
          return { path: bareAny[0], content: [...lines.slice(0, i), ...lines.slice(i + 1)].join('\n') };
        }
      }
      return null;
    };

    const normalizePath = (p: string): string => {
      let normalized = p.trim().replace(/^["`']|["`']$/g, '').replace(/^\[|\]$/g, '').trim();
      return normalized.startsWith('/') ? normalized : `/${normalized}`;
    };

  let cleanedText = text;
  let tempCounter = 1;
    const processed: Array<{ path: string; content: string; type: string; index: number }> = [];

    for (let i = rawMatches.length - 1; i >= 0; i--) {
      const { match, header, body } = rawMatches[i];
      let filePath = extractPathFromHeader(header);
      let content = body;
      if (!filePath) {
        const fromBody = extractPathFromBody(body);
        if (fromBody) { filePath = fromBody.path; content = fromBody.content; }
      }
      let fileType = '';
      if (filePath) {
        fileType = getFileType(filePath);
      } else if (header) {
        // try language token as type
        fileType = (header.split(/\s+/)[0] || '').toLowerCase();
      }
      if (!filePath) {
        // Fallback: fabricate a path based on inferred type
        const ext = fileType === 'tsx' ? 'tsx' : fileType === 'ts' ? 'ts' : fileType === 'jsx' ? 'jsx' : fileType === 'html' ? 'html' : fileType === 'css' ? 'css' : 'js';
        filePath = `/temp-ai-code-${tempCounter++}.${ext}`;
      }
      const path = normalizePath(filePath);
      processed.push({ path, content, type: fileType || getFileType(path), index: match.index });
      cleanedText = cleanedText.slice(0, match.index) + cleanedText.slice(match.index + match[0].length);
    }

    const filesMap = new Map<string, { path: string; content: string; type?: string }>();
    processed
      .sort((a, b) => a.index - b.index)
      .forEach(({ path, content, type }) => filesMap.set(path, { path, content, type }));

    cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n').trim();
    return { files: Array.from(filesMap.values()), cleanedText };
  }, []);

  const getFileType = (path: string): string => {
    const extension = path.split('.').pop()?.toLowerCase() || '';
    const typeMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      css: 'css',
      html: 'html',
      json: 'json',
      md: 'markdown',
    };
    return typeMap[extension] || 'text';
  };

  const handleSubmit = useCallback(async (message: PromptInputMessage) => {
    if (!message.text?.trim() && !message.files?.length) return;

    if (!projectId) {
      const errorMessage: ChatMessage = {
        id: nanoid(),
        role: "assistant",
        content: "Bitte öffnen Sie ein Projekt (/projects/[id]), damit der Coding Agent auf die Projektdateien zugreifen kann.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: nanoid(),
      role: "user",
      content: message.text || "",
      timestamp: new Date(),
    };

    // Build the complete message history including the new message
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setStatus("streaming");
    setStreamingMessage("");
    setReasoningStream("");
  setErrors([]);
  setTodoPlan(null);

    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const messagesToSend = updatedMessages.map(msg => ({
        role: msg.role,
        content: msg.content || "",
      })).filter(msg => msg.content.trim().length > 0);
      
      console.log('Sending messages to API:', messagesToSend);
      
      // Robust streaming reader for SSE/text streams
      let partial = ""; // cleaned text shown to the user
      let rawText = ""; // raw stream including potential tool blocks

      const applyTodoDelta = (delta: any) => {
        setTodoPlan((prev) => {
          const current: TodoPlan = prev || { phase: "running", progress: { done: 0, total: 0 }, steps: [] };
          // Ensure steps is always an array to avoid TS 'possibly undefined' errors
          const currentSteps = Array.isArray(current.steps) ? current.steps : [];
          let next: TodoPlan = { ...current, steps: [...currentSteps.map((s) => ({ ...s }))] };
          if (delta?.phase) next.phase = delta.phase;
          if (delta?.progress) {
            next.progress = { ...next.progress, ...delta.progress } as any;
          }
          if (Array.isArray(delta?.replaceSteps)) {
            next.steps = delta.replaceSteps as any;
          }
          if (delta?.upsertStep) {
            next.steps = next.steps || [];
            const idx = next.steps.findIndex((s) => s.id === delta.upsertStep.id);
            if (idx >= 0) next.steps[idx] = { ...(next.steps[idx] as TodoStep), ...(delta.upsertStep as TodoStep) };
            else next.steps.push(delta.upsertStep as TodoStep);
          }
          if (delta?.updateStep && delta.updateStep.id) {
            next.steps = next.steps || [];
            const idx = next.steps.findIndex((s) => s.id === delta.updateStep.id);
            if (idx >= 0) next.steps[idx] = { ...(next.steps[idx] as TodoStep), ...delta.updateStep } as any;
          }
          return next;
        });
      };

  // Track code blocks already extracted during streaming
  const seenCodeBlocks = new Set<string>();
  let streamTempCounter = 1;

      const processToolBlocks = () => {
        // Look for fenced blocks like ```tool: todo-plan\n{...}\n```
        const re = /```tool:\s*todo-plan\n([\s\S]*?)```/g;
        let match: RegExpExecArray | null;
        let changed = false;
        while ((match = re.exec(rawText)) !== null) {
          const full = match[0];
          const jsonStr = match[1]?.trim() || "";
          try {
            const data = JSON.parse(jsonStr);
            if (data?.plan) {
              setTodoPlan(data.plan as TodoPlan);
            } else if (data?.delta) {
              applyTodoDelta(data.delta);
            } else if (data?.steps || data?.phase || data?.progress) {
              // allow direct plan content
              setTodoPlan((prev) => ({
                steps: data.steps ?? prev?.steps ?? [],
                phase: data.phase ?? prev?.phase ?? "running",
                progress: data.progress ?? prev?.progress ?? { done: 0, total: 0 },
              }));
            }
          } catch {
            // ignore malformed JSON until complete
          }
          // strip this block from user-visible text
          rawText = rawText.replace(full, "");
          changed = true;
        }
        if (changed) {
          partial = rawText;
          setStreamingMessage(partial);
        }

        // Additionally, extract code blocks with identifiable file paths and forward them to onNewFiles mid-stream
        const codeRe = /```([^\n]*)\n([\s\S]*?)```/g;
        const newlyExtracted: Array<{ path: string; content: string; type?: string }> = [];
        let cm: RegExpExecArray | null;
        const normalizePath = (p: string): string => (p.startsWith('/') ? p : `/${p}`);
        while ((cm = codeRe.exec(rawText)) !== null) {
          const full = cm[0];
          if (seenCodeBlocks.has(full)) continue;
          const header = cm[1]?.trim() || '';
          let body = cm[2] ?? '';
          // Try header first
          let filePath: string | null = null;
          const kv = header.match(/(?:file(?:name)?|path)[:=]\s*([^\s]+)/i);
          if (kv?.[1]) filePath = kv[1].trim();
          if (!filePath) {
            const m2 = header.match(/([\w./-]+\.(?:tsx?|jsx?|mjs|cjs|css|html?|json|md|txt|ya?ml|toml))\b/);
            if (m2?.[1]) filePath = m2[1];
          }
          // Try first lines of body for path
          if (!filePath) {
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
              const ln = clean(lines[i]);
              const pm = ln.match(/^(?:file(?:\s*path)?|filename|filepath|path)\s*[:=]?\s*([^\s]+)$/i);
              if (pm?.[1]) {
                filePath = pm[1].trim();
                body = [...lines.slice(0, i), ...lines.slice(i + 1)].join('\n');
                break;
              }
              // bare absolute path anywhere in the line
              const bare = ln.match(/\/(?:[A-Za-z0-9._\-\/]+)\.(?:tsx?|jsx?|mjs|cjs|css|html?|json|md|txt|ya?ml|toml)/);
              if (bare?.[0]) {
                filePath = bare[0];
                body = [...lines.slice(0, i), ...lines.slice(i + 1)].join('\n');
                break;
              }
            }
          }
          if (!filePath) {
            // Fallback fabricate path using header language as extension
            const lang = (header.split(/\s+/)[0] || '').toLowerCase();
            const ext = lang === 'tsx' ? 'tsx' : lang === 'ts' ? 'ts' : lang === 'jsx' ? 'jsx' : lang === 'html' ? 'html' : lang === 'css' ? 'css' : 'js';
            filePath = `/temp-ai-code-${streamTempCounter++}.${ext}`;
          }
          const path = normalizePath(filePath);
          const type = getFileType(path);
          newlyExtracted.push({ path, content: body.trim(), type });
          seenCodeBlocks.add(full);
          rawText = rawText.replace(full, '');
          changed = true;
        }
        if (newlyExtracted.length > 0) {
          partial = rawText;
          setStreamingMessage(partial);
          onNewFiles?.(newlyExtracted);
        }
      };

      const systemPrompt = (() => {
        try { return localStorage.getItem('ai-system-prompt') || undefined; } catch { return undefined; }
      })();

      // Build absolute URL fallback if running from file:// (e.g. desktop preview) to avoid Failed to fetch
      const buildApiUrl = (path: string) => {
        try {
          if (typeof window !== 'undefined') {
            const origin = window.location.origin;
            if (origin && origin.startsWith('http')) return origin + path;
          }
        } catch {}
        // Default dev fallback
        return 'http://localhost:3000' + path;
      };

      const requestUrl = buildApiUrl('/api/ai');
      let res: Response;
      try {
        res = await fetch(requestUrl, {
          method: "POST",
            headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, goal: message.text || "", system: systemPrompt, memory: sessionMemory, useWorkflow: true }),
          signal: abortController.signal,
        });
      } catch (netErr: any) {
        // Network-level failure (TypeError: Failed to fetch) — surface clearer error
        throw new Error(`Netzwerkfehler beim Aufruf ${requestUrl}: ${netErr?.message || 'Failed to fetch'}`);
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        // Provide structured hint for UI / debugging
        throw new Error(`Chat API failed: status=${res.status} url=${requestUrl} body=${errText}`);
      }
      if (!res.body) throw new Error("Kein Stream-Body von /api/agent/coding");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const contentType = res.headers.get("content-type") || "";
      const isSSE = contentType.includes("text/event-stream");
      let lastEventName: string | null = null;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!isSSE) {
          // Plain text streaming: append directly
          partial += chunk;
          setStreamingMessage(partial);
          continue;
        }

        buffer += chunk;
        // SSE frames come line-delimited; process complete lines only
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          // Ignore SSE comment lines
          if (trimmed.startsWith(":")) continue; // OpenRouter style comments [[memory:9180833]]
          if (trimmed.startsWith("event:")) {
            lastEventName = trimmed.slice(6).trim();
            continue;
          }
          if (trimmed.startsWith("data: ")) {
            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;
            try {
              const evt = JSON.parse(data);
              // Token stream
              if ((evt?.type === "token" || lastEventName === "token") && typeof evt.text === "string") {
                rawText += evt.text;
                // try to consume any complete tool blocks and remove from output
                processToolBlocks();
                // update display text
                partial = rawText;
                setStreamingMessage(partial);
                continue;
              }
              // Reasoning stream
              const typeLower = typeof evt?.type === 'string' ? String(evt.type).toLowerCase() : '';
              if (typeLower.includes('reasoning') || lastEventName === 'reasoning' || evt?.reasoning) {
                const chunk = evt?.text ?? evt?.delta ?? evt?.content ?? evt?.reasoning ?? '';
                if (chunk) {
                  setReasoningStream((prev) => prev + String(chunk));
                  // auto-open panel on first reasoning token
                  setShowReasoning((prev) => prev || true);
                }
                continue;
              }
              // Error events forwarded mid-stream
              if (typeLower === 'error' || lastEventName === 'error' || evt?.error) {
                let errText = '';
                if (typeof evt === 'string') {
                  errText = evt;
                } else if (evt?.message || evt?.error) {
                  errText = String(evt.message || evt.error);
                } else {
                  try { errText = JSON.stringify(evt); } catch { errText = 'Unknown error'; }
                }
                if (errText) setErrors((prev) => [...prev, errText]);
                try {
                  if (evt?.detail) {
                    setLastErrorDetail(JSON.stringify(evt.detail, null, 2));
                  }
                } catch {}
                setStatus('error');
                continue;
              }
              // Status/info events could be handled here in future
            } catch {
              // Non-JSON data lines are ignored
            }
          }
        }
      }

      // Finalize assistant message
  // Final processing: ensure any remaining tool blocks are removed
  processToolBlocks();
  let finalText = (rawText || partial).trim();
      if (!finalText) {
        finalText = "Es tut mir leid, ich konnte keine Antwort generieren. Bitte versuchen Sie es erneut.";
      }

      const assistantExtract = extractFilesFromMessage(finalText);
      const assistantMessage: ChatMessage = {
        id: nanoid(),
        role: "assistant",
        content: assistantExtract.cleanedText || finalText,
        timestamp: new Date(),
      };

      if (assistantExtract.files.length > 0) {
        assistantMessage.files = assistantExtract.files;
        onNewFiles?.(assistantExtract.files);
      }

      setMessages(prev => [...prev, assistantMessage]);
      // Update session memory: keep compact, include latest goal, file paths, and first sentence of reply
      try {
        const paths = (assistantExtract.files || []).map(f => f.path).slice(0, 8);
        const firstSentence = (assistantExtract.cleanedText || finalText || '').split(/(?<=[.!?])\s+/)[0]?.slice(0, 240) || '';
        const block = [
          `Goal: ${message.text || ''}`,
          paths.length ? `Files: ${paths.join(', ')}` : undefined,
          firstSentence ? `Reply: ${firstSentence}` : undefined,
        ].filter(Boolean).join('\n');
        const combined = [sessionMemory.trim(), block.trim()].filter(Boolean).join('\n\n').slice(-2000);
        setSessionMemory(combined);
        try { localStorage.setItem(`project:${projectId}:memory:v1`, combined); } catch {}
        if (projectId) {
          fetch(`/api/projects/${projectId}/memory`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memory: combined }) }).catch(() => {});
        }
      } catch {}
  setStatus("idle");
      setStreamingMessage("");

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled
        setStatus("idle");
        setStreamingMessage("");
        return;
      }

      console.error("Chat error:", error);
      setStatus("error");
      setStreamingMessage("");

      // Add error message
      const errorMessage: ChatMessage = {
        id: nanoid(),
        role: "assistant",
        content: "Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
      if (error instanceof Error && error.message) {
        setErrors((prev) => [...prev, error.message]);
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [messages, onNewFiles, extractFilesFromMessage, projectId, sessionMemory]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: "oklch(0.172 0 82.16)" }}>
      <Conversation className="flex-1">
        <ConversationContent className="space-y-6">
          {/* Live Todo Plan */}
          {todoPlan && (
            <div>
              <div className="mb-2 text-xs text-neutral-300">To-dos {todoPlan.progress?.total || (todoPlan.steps?.length ?? 0)}</div>
              <AITodoPlan plan={todoPlan} />
            </div>
          )}
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Willkommen beim AI Code Assistant"
              description="Stellen Sie Fragen zum Code oder bitten Sie um Hilfe bei Ihrem Projekt"
            />
          ) : (
            <>
              {messages.map((message) => (
                <Message key={message.id} from={message.role}>
                  <MessageAvatar
                    src={message.role === "user" ? "" : ""}
                    name={message.role === "user" ? "Du" : "AI"}
                  />
                  <MessageContent variant="flat">
                    <Response>{message.content}</Response>
                    {message.files && message.files.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Generierte Dateien:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {message.files.map((file, index) => (
                            <button
                              key={index}
                              onClick={() => onFocusFile?.(file.path)}
                              className="rounded-md bg-secondary px-2 py-1 text-xs hover:bg-secondary/80 transition-colors"
                            >
                              {file.path}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </MessageContent>
                </Message>
              ))}
              
              {/* Streaming message */}
              {status === "streaming" && (
                <Message from="assistant">
                  <MessageAvatar
                    src=""
                    name="AI"
                  />
                  <MessageContent variant="flat">
                    <div className="flex flex-col gap-3 w-full">
                      <Reasoning
                        className="w-full"
                        isStreaming={status === "streaming"}
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>{reasoningStream}</ReasoningContent>
                      </Reasoning>
                      {streamingMessage && (
                        <Response>{streamingMessage}</Response>
                      )}
                    </div>
                  </MessageContent>
                </Message>
              )}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Reasoning panel and errors */}
      {false && (
        <div className="border-t border-white/10 px-3 py-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="text-xs text-neutral-400 hover:text-neutral-200"
              onClick={() => setShowReasoning((v) => !v)}
            >
              {showReasoning ? 'Gedanken ausblenden' : 'Gedanken anzeigen'}
            </button>
            {errors.length > 0 && (
              <div className="ml-auto text-[11px] rounded px-2 py-1 bg-red-500/10 text-red-300 border border-red-500/20">
                Fehler: {errors[errors.length - 1]}
              </div>
            )}
          </div>
          {showReasoning && (
            <div className="mt-2 max-h-40 overflow-auto rounded-md bg-black/40 border border-white/10 p-2">
              <pre className="whitespace-pre-wrap break-words text-[12px] leading-5 font-mono text-neutral-300 m-0">
                {reasoningStream || '—'}
              </pre>
              {lastErrorDetail && (
                <>
                  <div className="h-2" />
                  <div className="rounded-md bg-red-950/30 border border-red-500/20 p-2">
                    <div className="text-[11px] text-red-300 mb-1">Fehlerdetails</div>
                    <pre className="whitespace-pre-wrap break-words text-[11px] leading-5 font-mono text-red-200 m-0">{lastErrorDetail}</pre>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="border-t px-0 pt-4 pb-0">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status !== "idle" && (
              <StatusBadge
                status={status === "error" ? "error" : "running"}
                label={status === "error" ? "AI Fehler" : "AI denkt…"}
              />
            )}
          </div>
        </div>
        <AI_Prompt onSubmit={handleSubmit} disabled={status === "streaming"} />
      </div>
    </div>
  );
}
