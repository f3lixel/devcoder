"use client";

import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThinkingProcessProps {
  thinkingSteps: string[];
  isThinking: boolean;
  currentStepIndex: number;
  className?: string;
  title?: string;
}

export function ThinkingProcess({
  thinkingSteps,
  isThinking,
  currentStepIndex,
  className,
  title = "Thinking Process",
}: ThinkingProcessProps) {
  return (
    <div className={cn("space-y-2 p-4 border rounded-md bg-black/20 border-white/10", className)}>
      <h3 className="font-semibold text-sm text-neutral-200">{title}</h3>
      {isThinking ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-neutral-300" />
          <p className="text-xs text-neutral-300">Thinking...</p>
        </div>
      ) : (
        <p className="text-xs text-neutral-400">Process finished.</p>
      )}

      <ul className="space-y-1">
        {thinkingSteps.map((step, index) => (
          <li
            key={index}
            className={cn(
              "flex items-start text-xs leading-5 text-neutral-300",
              index < currentStepIndex && "text-emerald-400",
              index === currentStepIndex && "font-medium text-blue-300"
            )}
          >
            {index < currentStepIndex ? (
              <Check className="h-4 w-4 mr-2 mt-[2px]" />
            ) : (
              <span className="w-4 h-4 mr-2" />
            )}
            <span className="whitespace-pre-wrap break-words">
              {step || (index === currentStepIndex && isThinking ? "…" : "")}
            </span>
            {index === currentStepIndex && isThinking && (
              <Loader2 className="h-3 w-3 animate-spin ml-2 mt-[2px]" />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}





