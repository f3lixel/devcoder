import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
	variant?: "default" | "secondary" | "outline" | "destructive"
}

export const Badge = ({ className, variant = "default", ...props }: BadgeProps) => {
	const classes = cn(
		"inline-flex items-center rounded-full border px-3 py-1 text-[16px] font-medium transition-colors",
		variant === "default" && "bg-primary text-primary-foreground border-transparent",
		variant === "secondary" && "bg-secondary text-secondary-foreground border-transparent",
		variant === "outline" && "text-foreground",
		variant === "destructive" && "bg-red-500 text-white border-transparent",
		className
	)
	return <div className={classes} {...props} />
}

export default Badge


