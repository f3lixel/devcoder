"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/thread";

export const Assistant = () => {
  const runtime = (useChatRuntime as any)({
    api: "/api/chat",
  } as any);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-dvh px-4 py-4">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
};
