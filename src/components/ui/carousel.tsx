"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type CarouselApi = {
  selectedScrollSnap: () => number
  scrollSnapList: () => number[]
  on: (event: 'select', cb: () => void) => void
  scrollPrev: () => void
  scrollNext: () => void
}

export type CarouselProps = React.HTMLAttributes<HTMLDivElement> & {
  setApi?: (api: CarouselApi) => void
}

export const Carousel = ({ className, children, setApi, ...props }: CarouselProps) => {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const [index, setIndex] = React.useState(0)
  const [count, setCount] = React.useState(0)
  const listeners = React.useRef<Array<() => void>>([])

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const items = Array.from(el.querySelectorAll('[data-carousel-item]'))
    setCount(items.length)
    const api: CarouselApi = {
      selectedScrollSnap: () => index,
      scrollSnapList: () => Array.from({ length: count }, (_, i) => i),
      on: (event, cb) => {
        if (event === 'select') listeners.current.push(cb)
      },
      scrollPrev: () => setIndex((i) => Math.max(0, i - 1)),
      scrollNext: () => setIndex((i) => Math.min(count - 1, i + 1)),
    }
    setApi?.(api)
  }, [index, count, setApi])

  React.useEffect(() => {
    listeners.current.forEach((cb) => cb())
  }, [index])

  return (
    <div ref={ref} className={cn('relative overflow-hidden', className)} {...props}>
      <div className="flex transition-transform" style={{ transform: `translateX(-${index * 100}%)` }}>
        {children}
      </div>
    </div>
  )
}

export type CarouselContentProps = React.HTMLAttributes<HTMLDivElement>
export const CarouselContent = ({ className, ...props }: CarouselContentProps) => (
  <div className={cn('flex w-full', className)} {...props} />
)

export type CarouselItemProps = React.HTMLAttributes<HTMLDivElement>
export const CarouselItem = ({ className, ...props }: CarouselItemProps) => (
  <div data-carousel-item className={cn('w-full shrink-0', className)} {...props} />
)


