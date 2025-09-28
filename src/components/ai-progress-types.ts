export type AIOperationType = "editing" | "adding" | "deleting" | "analyzing" | "generating" | "idle"

export type AIProgressState = "idle" | "working" | "paused" | "completed" | "error"

export interface AITaskInfo {
  id: string
  fileName: string
  filePath: string
  operation: AIOperationType
  progress: number // 0-100
  startTime: Date
  estimatedDuration?: number // in seconds
  description?: string
}

export interface AIProgressTaskBarProps {
  currentTask?: AITaskInfo
  state: AIProgressState
  showDetails?: boolean
  showETA?: boolean
  className?: string
  onPause?: () => void
  onResume?: () => void
  onCancel?: () => void
}




