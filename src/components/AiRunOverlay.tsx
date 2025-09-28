"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Brain, FilePenLine, Loader2, Sparkles } from "lucide-react";
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave";
import React, { useMemo } from "react";
import type { RunEvent } from "@/app/api/run/stream/route";

type AiRunOverlayProps = {
  runId?: string | null;
  events: RunEvent[];
  isConnected: boolean;
};

function iconFor(event: RunEvent) {
  switch (event.type) {
    case "run.start":
    case "run.end":
      return <Sparkles className="h-4 w-4" />;
    case "thinking":
      return <Brain className="h-4 w-4" />;
    case "file.edit.start":
    case "file.edit.end":
      return <FilePenLine className="h-4 w-4" />;
    case "tool.start":
    case "tool.end":
      return <Loader2 className="h-4 w-4 animate-spin" />;
    default:
      return <Sparkles className="h-4 w-4" />;
  }
}

function labelFor(event: RunEvent) {
  switch (event.type) {
    case "run.start":
      return "run.start";
    case "run.end":
      return "run.end";
    case "thinking":
      return "thinking";
    case "file.edit.start":
      return event.filePath ? `editing ${event.filePath}` : "file.edit.start";
    case "file.edit.end":
      return event.filePath ? `saved ${event.filePath}` : "file.edit.end";
    case "tool.start":
      return event.toolName ? `tool.start ${event.toolName}` : "tool.start";
    case "tool.end":
      return event.toolName ? `tool.end ${event.toolName}` : "tool.end";
    default:
      return event.message ?? event.type;
  }
}

export function AiRunOverlay({ runId, events, isConnected }: AiRunOverlayProps) {
  const lastFive = useMemo(() => events.slice(-5), [events]);
  const visible = Boolean(runId);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2"
        >
          <div className="mx-auto flex max-w-[80vw] flex-col items-center">
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {lastFive.map((e) => (
                <motion.li
                  key={e.id}
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 26 }}
                  className="pointer-events-auto flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 shadow-lg backdrop-blur"
                >
                  <span className="text-white/80">{iconFor(e)}</span>
                  {e.type === "thinking" ? (
                    <TextShimmerWave className="text-sm [--base-color:#bfbfbf] [--base-gradient-color:#ffffff]" duration={1.1} spread={1.2} zDistance={2} scaleDistance={1.05} rotateYDistance={16}>
                      {labelFor(e)}
                    </TextShimmerWave>
                  ) : (
                    <span className="truncate">{labelFor(e)}</span>
                  )}
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AiRunOverlay;


