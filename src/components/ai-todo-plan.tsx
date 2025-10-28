'use client';

import React from "react";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export type TodoStep = {
  id: string;
  label: string;
  type?: string;
  path?: string;
  state?: "pending" | "running" | "done" | "error";
};

export type TodoPlan = {
  phase?: "running" | "complete" | "idle";
  progress?: { done: number; total: number };
  steps?: TodoStep[];
};

export type AITodoPlanProps = {
  plan: TodoPlan;
  className?: string;
};

export const AITodoPlan: React.FC<AITodoPlanProps> = ({ plan, className }) => {
  const done = plan.progress?.done ?? plan.steps?.filter(s => s.state === "done").length ?? 0;
  const total = plan.progress?.total ?? plan.steps?.length ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const iconFor = (state?: TodoStep["state"]) => {
    if (state === "running") return <Loader2 className="animate-spin h-4 w-4 text-blue-400" />;
    if (state === "done") return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    if (state === "error") return <AlertCircle className="h-4 w-4 text-red-400" />;
    return <div className="h-4 w-4 rounded-full bg-white/10" />;
  };

  return (
    <div className={["not-prose rounded-md border bg-muted/20 p-3 text-sm", className].filter(Boolean).join(" ")}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-neutral-300">To-dos</div>
        <div className="text-xs text-neutral-300 tabular-nums">{done} / {total}</div>
      </div>

      <div className="w-full bg-white/6 rounded-full h-2 overflow-hidden mb-3">
        <div
          className="h-2 bg-gradient-to-r from-blue-500 to-teal-400 transition-all"
          style={{ width: `${pct}%` }}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      <ul className="space-y-2">
        {(plan.steps ?? []).map((s) => (
          <li key={s.id} className="flex items-start gap-3">
            <div className="mt-0.5">{iconFor(s.state)}</div>
            <div className="flex-1">
              <div className="text-white/90">{s.label}</div>
              {s.path && <div className="text-xs text-neutral-400">{s.path}</div>}
            </div>
            <div className="text-xs text-neutral-400">{s.state ?? "pending"}</div>
          </li>
        ))}
        {(plan.steps ?? []).length === 0 && (
          <li className="text-xs text-neutral-500">Keine To-dos</li>
        )}
      </ul>

      {plan.phase && (
        <div className="mt-3 text-xs text-neutral-400">Phase: {plan.phase}</div>
      )}
    </div>
  );
};

export default AITodoPlan;
