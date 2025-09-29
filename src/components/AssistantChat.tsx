"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/thread";
import type { FileContext, TerminalCommand } from "@/lib/ai-service";

interface AssistantChatProps {
  onNewFiles?: (files: Array<{ path: string; content: string }>) => void;
  onRunCommand?: (command: string) => Promise<{ output: string; error?: string }>;
  files?: Record<string, string>;
  currentFile?: { path: string; content: string } | undefined;
  terminalOutput?: string;
  onFocusFile?: (path: string) => void;
}

export default function AssistantChat({
  onNewFiles,
  onRunCommand,
  files,
  currentFile,
  terminalOutput,
  onFocusFile
}: AssistantChatProps): JSX.Element {
  const runtime = useChatRuntime({
    api: "/api/chat",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-full w-full flex flex-col">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
