"use client"

import HeaderMenu from "@/components/HeaderMenu"
import HeaderProjectName from "@/components/HeaderProjectName"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { HelpCircle } from "lucide-react"
import Link from "next/link"

export default function AppHeader() {
  const pathname = usePathname()
  if (pathname === "/dashboard") return null

  // Try to extract projectId from /projects/[id] routes
  const match = pathname.match(/^\/projects\/([^\/]+)/)
  const projectId = match?.[1]
  const connectHref = projectId ? `/api/auth/connect/supabase?projectId=${encodeURIComponent(projectId)}` : "/projects"

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 bg-transparent overflow-visible">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
        <HeaderProjectName />
      </div>
      <div className="mx-auto flex h-full max-w-7xl items-center justify-end px-4 pl-40 md:pl-48">
        <div className="flex items-center">
          <HeaderMenu />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Supabase actions"
                className="ml-2 rounded-full group transform-gpu transition-all duration-200 ease-out hover:scale-105 active:scale-95 bg-white/5 border border-white/15 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_6px_20px_-8px_rgba(0,0,0,0.35)] hover:bg-white/10 hover:border-white/25 focus-visible:ring-emerald-400/30 focus-visible:ring-[3px]"
              >
                <Image
                  src="/supabase-logo-icon.svg"
                  alt="Supabase"
                  width={20}
                  height={20}
                  className="transition-transform duration-300 ease-out group-hover:scale-110 group-active:scale-95"
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 overflow-hidden rounded-xl border-white/10 bg-black/80 backdrop-blur-sm">
              <div className="p-4">
                <h3 className="text-base font-semibold text-white">Supabase</h3>
                <p className="mt-2 text-base text-white/80">Integrate user authentication, data storage, and backend capabilities.</p>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 bg-black/60 px-3 py-2">
                <button type="button" aria-label="Help" className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-colors hover:text-white">
                  <HelpCircle className="h-4 w-4" />
                </button>
                <Button asChild className="h-9 rounded-full gap-2 px-4 text-base bg-white/10 text-white border border-white/20 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_24px_-10px_rgba(0,0,0,0.45)] hover:bg-white/15 hover:border-white/30 transition-colors">
                  <Link href={connectHref} aria-disabled={!projectId} prefetch={false}>
                    <span className="inline-flex items-center gap-2">
                      <Image src="/supabase-logo-icon.svg" alt="Supabase" width={16} height={16} />
                      Connect Supabase
                    </span>
                  </Link>
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  )
}


