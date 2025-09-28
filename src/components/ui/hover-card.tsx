"use client"

// Minimal hover-card built on top of our Popover component
import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export const HoverCard = ({ children, ...props }: React.ComponentProps<typeof Popover>) => (
  <Popover {...props}>{children}</Popover>
)

export const HoverCardTrigger = PopoverTrigger
export const HoverCardContent = PopoverContent


