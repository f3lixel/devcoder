"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, AlertTriangle, XCircle, Circle } from "lucide-react";

export type StatusKind = "success" | "running" | "idle" | "error" | "warning";

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: StatusKind;
  label?: string;
  showIcon?: boolean;
  pulse?: boolean;
}

export function StatusBadge({
  status,
  label,
  className,
  showIcon = true,
  pulse = false,
  ...props
}: StatusBadgeProps) {
  const content = label ?? labelFor(status);
  const { colorClasses, Icon } = styleFor(status);

  return (
    <Badge
      className={cn(
        "gap-2 px-2 py-1 text-[16px] leading-none h-7 items-center",
        colorClasses,
        pulse && status === "running" && "animate-pulse",
        className
      )}
      variant="outline"
      {...props}
    >
      {showIcon && (
        <Icon className={cn("size-4", status === "running" && "animate-spin")} />
      )}
      <span className="truncate">{content}</span>
    </Badge>
  );
}

function labelFor(s: StatusKind): string {
  switch (s) {
    case "success":
      return "Erfolgreich";
    case "running":
      return "Läuft";
    case "idle":
      return "Bereit";
    case "error":
      return "Fehler";
    case "warning":
      return "Hinweis";
  }
}

function styleFor(s: StatusKind): { colorClasses: string; Icon: React.ComponentType<any> } {
  switch (s) {
    case "success":
      return { colorClasses: "border-green-500/30 text-green-300 bg-green-500/10", Icon: Check };
    case "running":
      return { colorClasses: "border-primary/30 text-primary bg-primary/10", Icon: Loader2 };
    case "idle":
      return { colorClasses: "border-foreground/20 text-foreground/80 bg-foreground/5", Icon: Circle };
    case "error":
      return { colorClasses: "border-red-500/30 text-red-300 bg-red-500/10", Icon: XCircle };
    case "warning":
      return { colorClasses: "border-yellow-500/30 text-yellow-300 bg-yellow-500/10", Icon: AlertTriangle };
  }
}

export default StatusBadge;

