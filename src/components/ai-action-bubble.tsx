"use client";

import { CheckCircle2, AlertCircle, FilePlus2, FilePenLine, Trash2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import React from "react";

export type ActionStepState = "pending" | "done" | "error";
export type ActionStepType = "create" | "edit" | "delete";

export interface ActionStep {
  id: string;
  type: ActionStepType;
  label: string;
  path?: string;
  state: ActionStepState;
}

export interface LiveActionStatusProps {
  steps: ActionStep[];
  phase: "running" | "complete" | "error";
  progress: { done: number; total: number };
  onClose?: () => void;
  startedAt?: number;
  finishedAt?: number;
  autoCollapseMs?: number;
}

export function ActionBubble({ steps, phase, progress, onClose, autoCollapseMs = 2000 }: LiveActionStatusProps) {
  // Keep the live card always visible; no summary pill
  const [collapsed] = React.useState(false);
  const statusText = phase === "running" ? "Aktion läuft" : phase === "complete" ? "Aktion abgeschlossen" : "Aktion fehlgeschlagen";
  const statusColor = phase === "running" ? "text-amber-400" : phase === "complete" ? "text-emerald-400" : "text-red-400";

  const StepIcon: React.FC<{ type: ActionStepType; state: ActionStepState }> = ({ type, state }) => {
    if (state === "done") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
    if (state === "error") return <AlertCircle className="h-3.5 w-3.5 text-red-400" />;
    const base = "h-3.5 w-3.5 text-amber-400";
    if (type === "create") return <FilePlus2 className={base} />;
    if (type === "edit") return <FilePenLine className={base} />;
    return <Trash2 className={base} />;
  };

  const FileKindIcon: React.FC<{ path?: string }> = ({ path }) => {
    const p = (path || "").toLowerCase();
    const name = p.split('/').pop() || p;
    const ext = name.includes('.') ? name.split('.').pop() : '';

    // 1) React files
    if (p.endsWith('.tsx') || p.endsWith('.jsx')) {
      return (
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 text-white/70" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="1.6" />
          <ellipse cx="12" cy="12" rx="9" ry="4.2" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="4.2" transform="rotate(120 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="4.2" />
        </svg>
      );
    }

    // 2) TypeScript / JavaScript
    if (p.endsWith('.ts') || p.endsWith('.js')) {
      return (
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 text-white/70" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M8 8h8M8 12h6M8 16h4" />
        </svg>
      );
    }

    // 3) JSON
    if (p.endsWith('.json')) {
      return (
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 text-white/70" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M7 7c-2 0-3 2-3 5s1 5 3 5" />
          <path d="M17 7c2 0 3 2 3 5s-1 5-3 5" />
          <path d="M10 8h4M10 16h4" />
        </svg>
      );
    }

    // 4) package.json
    if (name === 'package.json') {
      return (
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 text-white/70" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 3l8 4.5v9L12 21 4 16.5v-9L12 3z" />
          <path d="M12 12l8-4.5" />
          <path d="M12 12l-8-4.5" />
        </svg>
      );
    }

    // 5) tsconfig.json / next.config.* / tailwind.config.* / postcss.config.*
    if (
      name === 'tsconfig.json' ||
      name.startsWith('next.config.') ||
      name.startsWith('tailwind.config.') ||
      name.startsWith('postcss.config.')
    ) {
      return (
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 text-white/70" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 9 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0A1.65 1.65 0 0 0 20.91 11H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    }

    // 6) CSS
    if (p.endsWith('.css')) {
      return (
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 text-white/70" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 4h16v4H4z" />
          <path d="M4 10h10M4 14h8M4 18h6" />
        </svg>
      );
    }

    // 7) Markdown
    if (p.endsWith('.md')) {
      return (
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 text-white/70" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 5h16v14H4z" />
          <path d="M7 15V9l2 2 2-2v6M15 15l3-3-3-3" />
        </svg>
      );
    }

    // 8) Images & SVG
    if (p.endsWith('.png') || p.endsWith('.jpg') || p.endsWith('.jpeg') || p.endsWith('.gif') || p.endsWith('.webp') || p.endsWith('.svg')) {
      return (
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 text-white/70" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="8.5" cy="10" r="1.5" />
          <path d="M3 16l5-4 4 3 3-2 6 4" />
        </svg>
      );
    }

    // 9) .gitignore
    if (name === '.gitignore') {
      return (
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 text-white/70" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M7 3h10a2 2 0 0 1 2 2v6H5V5a2 2 0 0 1 2-2z" />
          <path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
          <path d="M9 7h6" />
        </svg>
      );
    }

    // Default: generic file
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 text-white/70" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5a2 2 0 0 0 2 2h5" />
      </svg>
    );
  };

  // No collapsed summary – always render the live card

  return (
    <div role="status" aria-live="polite" className="rounded-xl border border-[--border] bg-white/5 p-3">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className={`text-xs font-medium ${statusColor}`}>{statusText}</div>
        <div className="text-[11px] text-white/60">{progress.done}/{progress.total}</div>
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-1.5 rounded-full bg-emerald-400 transition-[width] duration-300"
          style={{ width: `${Math.max(0, Math.min(100, (progress.done / Math.max(1, progress.total)) * 100))}%` }}
        />
      </div>

      {/* Per-file items (vertical, compact capsules). Show completed with green check */}
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {steps.map((s, idx) => (
            <motion.div
              key={s.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ type: "spring", stiffness: 260, damping: 24, delay: Math.min(idx * 0.02, 0.2) }}
              className={`flex items-center gap-3 rounded-full border px-3 py-1.5 ${
                s.state === "done"
                  ? "bg-white/5 border-white/10"
                  : s.state === "error"
                  ? "bg-red-900/20 border-red-500/40"
                  : "bg-white/5 border-white/10"
              }`}
              title={s.path}
            >
              {/* Left: file kind */}
              <div className="shrink-0">
                <FileKindIcon path={s.path} />
              </div>
              {/* Middle: muted action + prominent file name */}
              <div className="min-w-0 flex-1 flex items-center gap-2">
                <span className="text-[11px] text-white/50 truncate max-w-[80px]">{s.label}</span>
                {s.path && (
                  <span className="text-xs text-white truncate">{s.path.split('/').pop()}</span>
                )}
              </div>
              {/* Right: status */}
              <div className="shrink-0">
                {s.state === "pending" && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-white/70" />
                )}
                {s.state === "done" && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                )}
                {s.state === "error" && (
                  <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {onClose && (
        <div className="mt-3 flex justify-end">
          <button onClick={onClose} className="text-[11px] px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 text-white/70 focus:outline-none focus:ring-2 focus:ring-[--ring]">
            schließen
          </button>
        </div>
      )}
    </div>
  );
}
