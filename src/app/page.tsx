"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AuthPopup from "@/components/AuthPopup"
import { supabaseBrowser } from "@/lib/supabase/client"
import { motion } from "framer-motion"
import { AIInputWithSearch } from "@/components/ui/ai-input-with-search"
import AnoAI from "@/components/ui/animated-shader-background"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Folder,
  FileText,
  Plus,
  FolderOpen,
  BookOpen,
  Wand2,
  ChevronRight,
  Trash2,
} from "lucide-react"

type ProjectItem = { id: string; name: string }
const initialRecent: Array<any> = []

export default function DashboardPage() {
  const [recent] = useState<any[]>(initialRecent)
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null)
  const [deletePopoverOpen, setDeletePopoverOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const promptId = "dashboard-prompt"
  const supabase = supabaseBrowser()
  const [authOpen, setAuthOpen] = useState(false)
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)

  const syncServerSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const access_token = session?.access_token ?? null
      const refresh_token = session?.refresh_token ?? null
      await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token, refresh_token })
      })
    } catch {}
  }

  const goToProjects = async (qs?: string) => {
    await syncServerSession()
    if (qs) router.push(`/projects?${qs}`)
    else router.push("/projects")
  }

  async function createProjectFromPrompt(prompt: string) {
    const { data: { session } } = await supabase.auth.getSession()
    await syncServerSession()
    const accessToken = session?.access_token ?? undefined
    let name = prompt.trim()
    if (name.length < 3) name = "Neues Projekt"
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ name, metadata: { source: "prompt", prompt } }),
    })
    if (!res.ok) {
      const params = new URLSearchParams({ prompt })
      router.push(`/projects?${params.toString()}`)
      return
    }
    const json = await res.json() as { status: string; project?: { id: string } }
    if (json?.project?.id) {
      router.push(`/projects?projectId=${json.project.id}`)
    } else {
      const params = new URLSearchParams({ prompt })
      router.push(`/projects?${params.toString()}`)
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('projects')
          .select('id,name,created_at')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)
        type Row = { id: string; name: string }
        setProjects(((data ?? []) as Row[]).map((p: Row) => ({ id: p.id, name: p.name })))
      } catch {}
    })()
  }, [])

  return (
    <>
    <div className="relative flex min-h-[100dvh] bg-black text-white">
      {/* Background Accents */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden"><AnoAI /></div>

      {/* Sidebar: Projects */}
      <aside className="w-64 shrink-0 border-r border-white/10 bg-white/5">
        <div className="sticky top-0 p-4 pt-3">
          <div className="mb-4 flex items-center gap-3 px-1">
            <Image src="/logo.svg" alt="Felixel Logo" width={40} height={40} className="h-10 w-10" />
            <span className="text-[40px] leading-none font-medium text-white">Felixel</span>
          </div>
          <button
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-base font-medium hover:bg-white/15"
            onClick={async () => {
              const { data: { user } } = await supabase.auth.getUser()
              if (!user) { setPendingPrompt("Neues Projekt"); setAuthOpen(true); return }
              await createProjectFromPrompt("Neues Projekt")
            }}
            aria-label="Neues Projekt"
          >
            <Plus className="h-5 w-5" /> Neues Projekt
          </button>

          <div className="text-[14px] uppercase tracking-wide text-white/40 mb-2">Projekte</div>
          <div>
            {projects.length === 0 ? (
              <div className="px-3 py-6 text-xs text-white/50">Noch keine Projekte.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    className="group flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5/50 px-3 py-3 text-left backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/10"
                    onClick={async () => {
                      const { data: { user } } = await supabase.auth.getUser()
                      if (!user) { setAuthOpen(true); return }
                      setSelectedProject(p)
                      setProjectDialogOpen(true)
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70">
                        <Folder className="h-5 w-5" />
                      </div>
                      <div className="truncate">
                        <div className="truncate text-base text-white/90">{p.name}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 translate-x-0 text-white/40 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main: Hero + Prompt + Actions + Recent */}
      <main className="relative z-10 flex-1 p-6">
        <div className="mx-auto w-full max-w-7xl pt-16">
          <div className="text-center">
            <motion.h1
              className="text-6xl md:text-7xl font-medium tracking-tight text-white mb-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              you vibe, we code
            </motion.h1>
            <motion.p
              className="text-white/70 mb-8 text-base"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05 }}
            >
              Baue Full‑Stack‑Webapps mit einem einzigen Prompt.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <AIInputWithSearch
              id={promptId}
              placeholder="Beschreibe dein neues Projekt..."
              className="mx-auto w-[699.2px]"
              maxWidthClass="max-w-[699.2px]"
              minHeight={75.6}
              maxHeight={75.6}
              hideSearchToggle
              onSubmit={async (value) => {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) { setPendingPrompt(value); setAuthOpen(true); return }
                await createProjectFromPrompt(value)
              }}
            />
          </motion.div>

          {/* Quick Actions */}
          <div className="mx-auto mt-4 flex w-full max-w-5xl flex-wrap items-center justify-center gap-2">
            <Button
              className="neon-hover"
              onClick={() => {
                const el = document.getElementById(promptId) as HTMLTextAreaElement | null
                el?.focus()
              }}
            >
              <Wand2 className="h-4 w-4" /> Aus Prompt generieren
            </Button>
            <Button variant="secondary" onClick={async () => {
              const { data: { user } } = await supabase.auth.getUser()
              if (!user) { setAuthOpen(true); return }
              await goToProjects()
            }}>
              <FolderOpen className="h-4 w-4" /> Projekte öffnen
            </Button>
            <Button variant="outline" onClick={() => router.push("/templates")}>
              <BookOpen className="h-4 w-4" /> Vorlagen
            </Button>
          </div>

          

          {/* Recent grid */}
          <div className="mt-10">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">Zuletzt</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {recent.map((item) => (
                <button
                  key={item.id}
                  onClick={async () => {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) { setAuthOpen(true); return }
                    await goToProjects()
                  }}
                  className="group rounded-lg border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
                >
                  <div className="mb-3 flex items-center">
                    <div className="flex items-center gap-2 text-white/80">
                      {item.type === "project" ? (
                        <Folder className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      <span className="text-xs text-white/60">{item.type === "project" ? "Projekt" : "Datei"}</span>
                    </div>
                  </div>
                  <div className="truncate text-white">{item.name}</div>
                  {item.path ? (
                    <div className="truncate text-xs text-white/50">{item.path}</div>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
    <Dialog open={projectDialogOpen} onOpenChange={(open) => { setProjectDialogOpen(open); if (!open) { setSelectedProject(null); setDeletePopoverOpen(false) } }}>
      <DialogContent className="bg-white/5 border-white/10 text-white backdrop-blur-md sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white/90">{selectedProject?.name ?? "Projekt"}</DialogTitle>
        </DialogHeader>
        <div className="rounded-xl overflow-hidden border border-white/10 bg-black/50">
          {selectedProject ? (
            <iframe
              title="Live Preview"
              src={`/projects?projectId=${selectedProject.id}`}
              className="w-full h-[360px] bg-black"
            />
          ) : (
            <div className="w-full h-[360px] grid place-items-center text-white/60 text-sm">Keine Vorschau</div>
          )}
        </div>
        <DialogFooter className="sm:justify-end">
          <div className="ml-auto flex items-center gap-2">
            <Popover open={deletePopoverOpen} onOpenChange={setDeletePopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="destructive" className="bg-red-600 hover:bg-red-700" disabled={!selectedProject || isDeleting}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 bg-white/10 border-white/10 text-white backdrop-blur-md">
                <div className="space-y-3">
                  <div className="text-sm">Are you sure you want to delete your project?</div>
                  <div className="flex items-center justify-between gap-2">
                    <Button variant="secondary" className="bg-white/10 hover:bg-white/15" onClick={() => setDeletePopoverOpen(false)} disabled={isDeleting}>
                      cancel
                    </Button>
                    <Button
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700"
                      disabled={!selectedProject || isDeleting}
                      onClick={async () => {
                        if (!selectedProject) return
                        setIsDeleting(true)
                        try {
                          await syncServerSession()
                          const { data: { user } } = await supabase.auth.getUser()
                          if (!user) { setAuthOpen(true); return }
                          await supabase.from('projects').delete().eq('id', selectedProject.id)
                          setProjects(prev => prev.filter(x => x.id !== selectedProject.id))
                          setDeletePopoverOpen(false)
                          setProjectDialogOpen(false)
                          setSelectedProject(null)
                        } finally {
                          setIsDeleting(false)
                        }
                      }}
                    >
                      confirm
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button onClick={() => { if (selectedProject) router.push(`/projects?projectId=${selectedProject.id}`) }}>
              go to project
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <AuthPopup
      open={authOpen}
      onClose={() => setAuthOpen(false)}
      redirectToUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/projects`}
      onSignedIn={() => {
        (async () => {
          await syncServerSession()
          if (pendingPrompt) {
            const prompt = pendingPrompt
            setPendingPrompt(null)
            await createProjectFromPrompt(prompt)
            return
          }
          router.push("/projects")
        })()
      }}
    />
    </>
  )
}

 
