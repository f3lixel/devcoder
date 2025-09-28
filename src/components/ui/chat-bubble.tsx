import * as React from "react"

import { cn } from "@/lib/utils"
import { TextShimmerWave } from "@/components/ui/text-shimmer-wave"

type ChatBubbleProps = {
  role: "user" | "assistant"
  content: string
  className?: string
}

export function ChatBubble({ role, content, className }: ChatBubbleProps) {
  const isUser = role === "user"

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          // Base sizing and layout
          "relative max-w-[78%] rounded-2xl px-4 py-2 text-base whitespace-pre-wrap break-words transition-[background,box-shadow] overflow-hidden",
          // Glassmorphism: stronger blur and deeper glass
          "backdrop-blur-2xl",
          // Subtle inner highlight + soft outer shadow (no borders)
          isUser
            ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_14px_40px_rgba(0,0,0,0.50)] ring-1 ring-white/10"
            : "bg-white/8 text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_14px_40px_rgba(0,0,0,0.50)] ring-1 ring-white/10",
          // Highlight sheen overlay — stronger and wider
          "before:absolute before:inset-0 before:rounded-2xl before:pointer-events-none before:bg-[radial-gradient(140%_120%_at_0%_0%,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0.10)_35%,transparent_60%)] before:opacity-80",
          className
        )}
      >
        {!isUser && content === "Verarbeite Antwort..." ? (
          <TextShimmerWave className='[--base-color:#a1a1aa] [--base-gradient-color:#ffffff]' duration={1} spread={1} zDistance={1} scaleDistance={1.05} rotateYDistance={16}>
            Verarbeite Antwort...
          </TextShimmerWave>
        ) : (
          content || "\u200b"
        )}
      </div>
    </div>
  )
}

type ChatListProps = React.ComponentProps<"div">

export function ChatList({ className, ...props }: ChatListProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        className
      )}
      {...props}
    />
  )
}
