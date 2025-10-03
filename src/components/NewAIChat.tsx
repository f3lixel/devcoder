"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Message, MessageContent, MessageAvatar } from "@/components/ai-elements/message";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { PromptInput, PromptInputBody, PromptInputTextarea, PromptInputToolbar, PromptInputTools, PromptInputSubmit, PromptInputAttachments, PromptInputAttachment, type PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Response } from "@/components/ai-elements/response";
import { Loader } from "@/components/ai-elements/loader";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import { nanoid } from "nanoid";
import { usePathname, useSearchParams } from "next/navigation";

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

  const extractFilesFromMessage = useCallback((text: string): Array<{ path: string; content: string; type?: string }> => {
    const files: Array<{ path: string; content: string; type?: string }> = [];
    const fenceRe = /```([^\n]*)\n([\s\S]*?)```/g;
    let match;

    while ((match = fenceRe.exec(text)) !== null) {
      const header = match[1]?.trim() || '';
      const content = match[2]?.trim() || '';
      
      // Try to extract path from header
      let filePath: string | null = null;
      
      // Look for explicit path declarations
      const explicitPathMatch = header.match(/(?:file(?:name)?|path)[:=]\s*([^\s]+)/i);
      if (explicitPathMatch?.[1]) {
        filePath = explicitPathMatch[1];
      } else {
        // Look for file extensions in header
        const extensionMatch = header.match(/([\w./-]+\.(?:tsx?|jsx?|mjs|cjs|css|html?|json|md|txt|sh|ya?ml|toml))\b/);
        if (extensionMatch?.[1]) {
          filePath = extensionMatch[1];
        }
      }
      
      if (filePath) {
        const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
        const type = getFileType(normalizedPath);
        files.push({ path: normalizedPath, content, type });
      }
    }

    return files;
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
      let partial = "";

      const res = await fetch("/api/agent/coding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, goal: message.text || "" }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const err = await res.text().catch(() => "");
        throw new Error(`Chat API failed: ${res.status} ${err}`);
      }
      if (!res.body) throw new Error("Kein Stream-Body von /api/agent/coding");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const contentType = res.headers.get("content-type") || "";
      const isSSE = contentType.includes("text/event-stream");

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
          if (trimmed.startsWith("data: ")) {
            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;
            try {
              const evt = JSON.parse(data);
              // New agent SSE event schema
              if (evt?.type === "token" && typeof evt.text === "string") {
                partial += evt.text;
                setStreamingMessage(partial);
                continue;
              }
              // Optionally handle files/status events later as needed
            } catch {
              // Non-JSON data lines are ignored
            }
          }
        }
      }

      // Finalize assistant message
      let finalText = partial.trim();
      if (!finalText) {
        finalText = "Es tut mir leid, ich konnte keine Antwort generieren. Bitte versuchen Sie es erneut.";
      }

      const assistantMessage: ChatMessage = {
        id: nanoid(),
        role: "assistant",
        content: finalText,
        timestamp: new Date(),
      };

      const extractedFiles = extractFilesFromMessage(finalText);
      if (extractedFiles.length > 0) {
        assistantMessage.files = extractedFiles;
        onNewFiles?.(extractedFiles);
      }

      setMessages(prev => [...prev, assistantMessage]);
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
    } finally {
      abortControllerRef.current = null;
    }
  }, [messages, onNewFiles, extractFilesFromMessage, projectId]);

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
    <div className="flex h-full flex-col bg-background">
      <Conversation className="flex-1">
        <ConversationContent className="space-y-6">
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
                    <div className="flex items-start gap-2">
                      {streamingMessage ? (
                        <Response>{streamingMessage}</Response>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Loader size={16} />
                          <span className="text-sm text-muted-foreground">Denkt nach...</span>
                        </div>
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

      <div className="border-t p-4">
        <PromptInput
          accept="image/*"
          multiple
          maxFiles={5}
          maxFileSize={10 * 1024 * 1024} // 10MB
          onSubmit={handleSubmit}
          onError={(err) => console.error("File upload error:", err)}
        >
          <PromptInputAttachments>
            {(attachment) => <PromptInputAttachment data={attachment} />}
          </PromptInputAttachments>
          
          <PromptInputBody>
            <PromptInputTextarea
              placeholder={
                status === "streaming"
                  ? "Warte auf Antwort..."
                  : "Fragen Sie etwas über Ihren Code oder bitten Sie um Hilfe..."
              }
              disabled={status === "streaming"}
            />
          </PromptInputBody>
          
          <PromptInputToolbar>
            <PromptInputTools>
              {/* Add attachment and other tools here if needed */}
            </PromptInputTools>
            
            <PromptInputSubmit
              status={status === "streaming" ? "streaming" : status === "error" ? "error" : undefined}
              disabled={status === "streaming"}
              onClick={status === "streaming" ? handleCancel : undefined}
            />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
}
