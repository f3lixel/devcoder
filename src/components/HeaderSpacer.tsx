"use client"

import { usePathname } from "next/navigation"

export default function HeaderSpacer() {
  const pathname = usePathname()
  const showSpacer = !(pathname === "/dashboard" || pathname === "/")
  if (!showSpacer) return null
  return <div className="pt-16" />
}


