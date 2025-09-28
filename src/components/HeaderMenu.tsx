"use client"

import { useViewMode } from "@/components/view-mode-context"
import type { ViewMode } from "@/components/view-mode-context"
import * as React from "react"
// Removed TabBar to hide Preview/Editor buttons above the sandbox

export default function HeaderMenu() {
  const { mode, setMode } = useViewMode()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Avoid SSR/client hydration mismatch
  if (!mounted) {
    return <div className="h-10" aria-hidden />
  }

  return null
}


