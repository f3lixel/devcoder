"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Folder,
  LayoutDashboard,
  NotebookText,
  Settings,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import Image from "next/image";
import { useSearchParams, usePathname } from "next/navigation";

export default function ProjectsSidebar() {
  const [aiOpen, setAiOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [recentChats, setRecentChats] = useState<string[]>([]);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ai-system-prompt");
      if (saved) setSystemPrompt(saved);
      const chats = JSON.parse(localStorage.getItem("recent-chats") || "[]");
      if (Array.isArray(chats)) setRecentChats(chats);
    } catch {}
  }, []);

  const links = [
    {
      label: "Dashboard",
      href: "/projects",
      icon: <LayoutDashboard className="h-5 w-5" />,
      key: "dashboard",
    },
    {
      label: "Projects",
      href: "/projects",
      icon: <Folder className="h-5 w-5" />,
      key: "projects",
    },
    {
      label: "AI‑Instruktion",
      href: "#ai-instruktion",
      icon: <Sparkles className="h-5 w-5" />,
      key: "ai",
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        setAiDialogOpen(true);
      },
    },
    {
      label: "Knowledge Base",
      href: "/projects?tab=knowledge",
      icon: <NotebookText className="h-5 w-5" />,
      key: "kb",
    },
    {
      label: "Settings",
      href: "/settings",
      icon: <Settings className="h-5 w-5" />,
      key: "settings",
    },
  ];

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentProjectId = searchParams.get("projectId");
  const currentUrl = (() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  })();

  // Merge vorhandene projectId in Projekt-Links, ohne die URL sichtbar zu ändern
  const withProjectId = (href: string): { href: string; preventNav: boolean } => {
    try {
      if (!href.startsWith("/projects")) return { href, preventNav: false };
      // Für alle /projects-Links: bleibe auf der aktuellen URL
      // (enthält bereits projectId), Navigation wird verhindert
      return { href: currentUrl, preventNav: true };
    } catch {
      return { href, preventNav: false };
    }
  };

  return (
    <Sidebar>
      <SidebarBody
        className={cn(
          "relative !pt-16 bg-[oklch(0.172 0 82.16)] backdrop-blur-0 border-r border-white/10 rounded-none",
          "text-neutral-200"
        )}
      >
        <div className="absolute left-0 top-2 w-[60px] flex items-center justify-center">
          <BrandLogo />
        </div>
        <div className="flex flex-col gap-1">
            {links.map((link) => {
              const { href: computedHref, preventNav } = withProjectId(link.href);
              return (
                <div key={link.key} className="px-1" onClick={link.key === "ai" ? (e) => { e.preventDefault(); setAiDialogOpen(true); } : undefined}>
                  <SidebarLink
                    link={{ label: link.label, href: computedHref, icon: link.icon }}
                    className="rounded-xl px-2 hover:bg-white/5"
                    href={computedHref}
                    onClick={preventNav ? (e) => e.preventDefault() : undefined}
                  />
                </div>
              );
            })}
        </div>

        <div className="my-3">
            <Separator className="bg-white/10" />
        </div>

        <RecentChatsPanel recentChats={recentChats} />

        <div className="mt-auto">
          <Separator className="bg-white/10" />
          <div className="flex items-center gap-2 px-2 py-2">
            <Avatar className="size-8">
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <FooterUsername />
            <FooterSettings />
          </div>
        </div>
      </SidebarBody>
      {/* AI Custom Instruction Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-[oklch(0.172 0 82.16)] border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-neutral-100">AI Custom Instruction</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Definiere eine benutzerdefinierte Instruktion für die AI.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Beschreibe der AI dein gewünschtes Verhalten..."
              className="min-h-[180px] bg-black/40 border-white/10 text-neutral-100 placeholder:text-neutral-500"
            />
          </div>
          <DialogFooter className="mt-4">
            <Button
              onClick={() => {
                try { localStorage.setItem("ai-system-prompt", systemPrompt); } catch {}
                setAiDialogOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}

function BrandLogo() {
  return (
    <div className="flex items-center justify-center w-full">
      <Image
        src="/user-logo.svg"
        alt="User Logo"
        width={40}
        height={32}
        priority
      />
    </div>
  );
}

function RecentChatsPanel({ recentChats }: { recentChats: string[] }) {
  const { open } = useSidebar();
  return (
    <div>
      <AnimatePresence initial={false} mode="wait">
        {open ? (
          <motion.div key="open" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="px-3">
              <motion.span
                layoutId="recentChatsTitle"
                initial={false}
                animate={{ rotate: 0, letterSpacing: "0.15em", opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
                className="text-xs text-neutral-400 select-none whitespace-nowrap leading-none"
              >
                <AnimatedLetters text="Recent Chats" variant="open" />
              </motion.span>
            </div>
            <ScrollArea className="mt-2 h-[200px] pr-1">
              <div className="flex flex-col gap-1">
                {recentChats.length === 0 && (
                  <div className="px-3 py-2 text-neutral-500 text-sm">Keine Chats vorhanden</div>
                )}
                {recentChats.map((c, i) => (
                  <button
                    key={i}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-neutral-200 text-sm"
                    type="button"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </motion.div>
        ) : (
          <motion.div
            key="closed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-2 h-[220px] w-full bg-[oklch(0.172 0 82.16)] relative flex items-center justify-center"
          >
            <motion.span
              layoutId="recentChatsTitle"
              initial={false}
              animate={{ rotate: -90, letterSpacing: "0.6em", opacity: 0.9 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="select-none whitespace-nowrap leading-none text-[12px] text-neutral-400"
            >
              <AnimatedLetters text="Recent Chats" variant="closed" />
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AnimatedLetters({ text, variant }: { text: string; variant: "open" | "closed" }) {
  const parent: Variants = {
    hidden: {
      transition: {
        staggerChildren: 0.008,
        staggerDirection: variant === "closed" ? -1 : 1,
      },
    },
    show: {
      transition: {
        staggerChildren: 0.012,
        staggerDirection: variant === "closed" ? -1 : 1,
      },
    },
    exit: {
      transition: {
        staggerChildren: 0.006,
        staggerDirection: -1,
      },
    },
  };

  const child: Variants =
    variant === "open"
      ? {
          hidden: { y: 10, opacity: 0, filter: "blur(0.6px)" },
          show: {
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            transition: { type: "spring" as const, stiffness: 650, damping: 28, mass: 0.25 },
          },
          exit: { y: 0, opacity: 0, filter: "blur(0px)", transition: { duration: 0.06 } },
        }
      : {
          hidden: { x: 10, opacity: 0, filter: "blur(0.6px)" },
          show: {
            x: 0,
            opacity: 1,
            filter: "blur(0px)",
            transition: { type: "spring" as const, stiffness: 650, damping: 28, mass: 0.25 },
          },
          exit: { x: 0, opacity: 0, filter: "blur(0px)", transition: { duration: 0.06 } },
        };

  return (
    <motion.span variants={parent} initial="hidden" animate="show" exit="exit">
      {Array.from(text).map((ch, i) => (
        <motion.span key={`${variant}-${i}`} className="inline-block" variants={child}>
          {ch === " " ? "\u00A0" : ch}
        </motion.span>
      ))}
    </motion.span>
  );
}

function FooterUsername() {
  const { open, animate } = useSidebar();
  return (
    <motion.span
      initial={false}
      animate={{
        opacity: animate ? (open ? 1 : 0) : 1,
      }}
      transition={{ duration: 0.2 }}
      className="text-sm"
      style={{ display: animate ? (open ? "inline-block" : "none") : "inline-block" }}
    >
      User
    </motion.span>
  );
}

function FooterSettings() {
  const { open, animate } = useSidebar();
  return (
    <motion.div
      initial={false}
      animate={{
        opacity: animate ? (open ? 1 : 0) : 1,
      }}
      transition={{ duration: 0.2 }}
      className="ml-auto rounded-md px-2 py-1 text-xs text-neutral-400 border border-white/10"
      style={{ display: animate ? (open ? "inline-block" : "none") : "inline-block" }}
    >
      Einstellungen
    </motion.div>
  );
}
