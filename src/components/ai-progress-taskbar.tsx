"use client"

import type React from "react"

import { cn } from "@/lib/utils"
import { PenTool, FilePlus2, Trash2, ScanSearch, Sparkles, XCircle, Loader2, CheckCircle2, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { AIProgressTaskBarProps, AIOperationType } from "./ai-progress-types"

const operationIcons: Record<AIOperationType, React.ComponentType<any>> = {
  editing: PenTool,
  adding: FilePlus2,
  deleting: Trash2,
  analyzing: ScanSearch,
  generating: Sparkles,
  idle: Clock,
}

const operationLabels: Record<AIOperationType, string> = {
  editing: "Bearbeitet",
  adding: "Erstellt",
  deleting: "Löscht",
  analyzing: "Analysiert",
  generating: "Generiert",
  idle: "Bereit",
}

const operationColors: Record<AIOperationType, string> = {
  editing: "text-blue-400",
  adding: "text-green-400",
  deleting: "text-red-400",
  analyzing: "text-purple-400",
  generating: "text-amber-400",
  idle: "text-slate-400",
}

export function AIProgressTaskBar({ currentTask, state, showDetails = true, showETA = true, className }: AIProgressTaskBarProps) {
  const OperationIcon = operationIcons[currentTask?.operation || 'idle']
  const isWorking = state === "working"
  const isPaused = state === "paused"
  const isCompleted = state === "completed"
  const isError = state === "error"

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 bg-slate-900/80 backdrop-blur-sm rounded-lg border border-slate-700/50 transition-all duration-300 shadow-lg",
        isError && "border-red-500/50 bg-red-950/30",
        isCompleted && "border-emerald-500/50 bg-emerald-950/30",
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Modern status indicator */}
        <div className="flex items-center gap-2">
          {(isWorking || isPaused) && (
            <div className="relative">
              <Loader2 className={cn("h-4 w-4 text-blue-400", isWorking && "animate-spin")} />
              {isPaused && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-1 w-1 bg-amber-400 rounded-full" />
                </div>
              )}
            </div>
          )}

          {isCompleted && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}

          {isError && <XCircle className="h-4 w-4 text-red-400" />}

          <OperationIcon className={cn("h-3.5 w-3.5", operationColors[currentTask?.operation || 'idle'])} />
        </div>

        {/* File info with modern badges */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-100 truncate">{currentTask?.fileName || '—'}</span>

            {currentTask?.operation === "editing" && (
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-300 bg-slate-800/50">
                +{Math.floor(Math.random() * 50)} -{Math.floor(Math.random() * 20)}
              </Badge>
            )}

            <Badge
              variant="secondary"
              className={cn(
                "text-xs px-2 py-0.5 font-medium",
                isWorking && "bg-blue-500/20 text-blue-300 border-blue-500/30",
                isPaused && "bg-amber-500/20 text-amber-300 border-amber-500/30",
                isCompleted && "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
                isError && "bg-red-500/20 text-red-300 border-red-500/30",
              )}
            >
              {operationLabels[currentTask?.operation || 'idle']}
            </Badge>
          </div>
        </div>

        <div className="flex items-center">
          <div
            className={cn(
              "h-2 w-2 rounded-full transition-all duration-300",
              isWorking && "bg-blue-400 animate-pulse",
              isPaused && "bg-amber-400",
              isCompleted && "bg-emerald-400",
              isError && "bg-red-400",
            )}
          />
        </div>
      </div>
    </div>
  )
}

