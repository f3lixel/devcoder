import * as React from "react"
import { cn } from "@/lib/utils"

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted align-middle",
        className
      )}
      {...props}
    />
  )
)
Avatar.displayName = "Avatar"

export interface AvatarImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {}

export const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, alt = "", ...props }, ref) => (
    <img ref={ref} alt={alt} className={cn("h-full w-full object-cover", className)} {...props} />
  )
)
AvatarImage.displayName = "AvatarImage"

export interface AvatarFallbackProps
  extends React.HTMLAttributes<HTMLSpanElement> {}

export const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarFallbackProps>(
  ({ className, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center bg-muted text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
)
AvatarFallback.displayName = "AvatarFallback"

export default Avatar









