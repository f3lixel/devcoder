"use client"

import * as React from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { useRouter } from "next/navigation"

const commands = [
  { label: "Dashboard", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Templates", href: "/templates" },
  { label: "Settings", href: "/settings" },
]

export default function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const router = useRouter()

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = navigator.platform.includes("Mac") ? e.metaKey : e.ctrlKey
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-24 w-[90vw] max-w-md -translate-x-1/2 rounded-xl border border-white/10 bg-black/80 p-2 text-white shadow-xl">
          <input
            autoFocus
            placeholder="Type a command or search..."
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/50"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="mt-2 max-h-64 overflow-auto rounded-md">
            {filtered.map((c) => (
              <button
                key={c.href}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                onClick={() => {
                  setOpen(false)
                  router.push(c.href)
                }}
              >
                <span>{c.label}</span>
                <kbd className="text-xs text-white/40">↩</kbd>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-white/50">
                No results
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between px-1 text-xs text-white/40">
            <span>Press Esc to close</span>
            <span>Cmd/Ctrl + K</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}


