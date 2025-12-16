"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Bot, Braces, LayoutDashboard, Plug, Settings } from "lucide-react";

type WorkspaceSectionId = "overview" | "integrations" | "agents" | "api" | "settings";

type WorkspaceNavItem = {
  id: WorkspaceSectionId;
  label: string;
  icon: ReactNode;
  description?: string;
};

function SectionShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <div className="min-w-0">
          <div className="text-lg font-semibold tracking-tight text-zinc-50">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-zinc-400">{subtitle}</div> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="flex-1 min-h-0 p-6 pt-5">{children}</div>
    </div>
  );
}

function OverviewSection() {
  return (
    <SectionShell
      title="Overview"
      subtitle="Dein Workspace auf einen Blick – Einstellungen, Zugriffe und Einladungen."
      actions={<Button className="bg-white/10 text-zinc-50 hover:bg-white/15">Open App</Button>}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-white/10 bg-[#111113] text-zinc-100">
          <CardHeader>
            <CardTitle>App Visibility</CardTitle>
            <CardDescription className="text-zinc-400">
              Steuere, wer deine Anwendung sehen kann.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/30 px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-100">Public</div>
                <div className="text-xs text-zinc-400">Öffentlich erreichbar (Link).</div>
              </div>
              <Button variant="outline" className="border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10">
                Ändern
              </Button>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/30 px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-100">Require login</div>
                <div className="text-xs text-zinc-400">Anmeldung für Zugriff erzwingen.</div>
              </div>
              <Button variant="outline" className="border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10">
                Konfigurieren
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#111113] text-zinc-100">
          <CardHeader>
            <CardTitle>Invite Users</CardTitle>
            <CardDescription className="text-zinc-400">
              Lade Teammitglieder ein und teile den Workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2">
              <div className="text-xs text-zinc-400">E-Mail</div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="name@company.com"
                  className="border-white/10 bg-black/30 text-zinc-100 placeholder:text-zinc-500"
                />
                <Button className="bg-white/10 text-zinc-50 hover:bg-white/15">Send</Button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/30 px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-100">Share link</div>
                <div className="text-xs text-zinc-400">Schnelles Sharing per Link.</div>
              </div>
              <Button variant="outline" className="border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10">
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#111113] text-zinc-100 lg:col-span-2">
          <CardHeader>
            <CardTitle>Platform Badge</CardTitle>
            <CardDescription className="text-zinc-400">
              Blende das Badge ein oder aus (für Branding/Compliance).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <div className="text-sm text-zinc-300">
              Das Badge ist aktuell <span className="font-medium text-zinc-100">sichtbar</span>.
            </div>
            <Button variant="outline" className="border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10">
              Hide Badge
            </Button>
          </CardContent>
        </Card>
      </div>
    </SectionShell>
  );
}

function IntegrationsSection() {
  const items = [
    { name: "GitHub", desc: "Sync Issues, PRs und Releases.", cta: "Connect" },
    { name: "Slack", desc: "Benachrichtigungen & Automationen.", cta: "Connect" },
    { name: "Supabase", desc: "DB & Auth für dein Projekt.", cta: "Manage" },
  ];

  return (
    <SectionShell title="Integrations" subtitle="Verbinde Services, um Workflows zu automatisieren.">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {items.map((it) => (
          <Card key={it.name} className="border-white/10 bg-[#111113] text-zinc-100">
            <CardHeader>
              <CardTitle>{it.name}</CardTitle>
              <CardDescription className="text-zinc-400">{it.desc}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <div className="text-xs text-zinc-500">Status: nicht verbunden</div>
              <Button className="bg-white/10 text-zinc-50 hover:bg-white/15">{it.cta}</Button>
            </CardContent>
          </Card>
        ))}
        <Card className="border-dashed border-white/15 bg-black/20 text-zinc-100 lg:col-span-2">
          <CardHeader>
            <CardTitle>Weitere Integrationen</CardTitle>
            <CardDescription className="text-zinc-400">
              Bald verfügbar: Webhooks, Stripe, Sentry, Linear…
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10">
              Request integration
            </Button>
          </CardContent>
        </Card>
      </div>
    </SectionShell>
  );
}

function AgentsSection() {
  const agents = [
    { name: "Builder Agent", role: "UI & Komponenten", status: "bereit" },
    { name: "Refactor Agent", role: "Cleanup & Qualität", status: "bereit" },
    { name: "Data Agent", role: "SQL & Policies", status: "bereit" },
  ];

  return (
    <SectionShell
      title="Agents"
      subtitle="Verwalte Agenten, Rollen und Berechtigungen für Aufgaben im Projekt."
      actions={<Button className="bg-white/10 text-zinc-50 hover:bg-white/15">New agent</Button>}
    >
      <Card className="border-white/10 bg-[#111113] text-zinc-100">
        <CardHeader>
          <CardTitle>Active agents</CardTitle>
          <CardDescription className="text-zinc-400">Übersicht über Agenten im Workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {agents.map((a) => (
            <div
              key={a.name}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/30 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-100">{a.name}</div>
                <div className="text-xs text-zinc-400">{a.role}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-xs text-emerald-200">
                  {a.status}
                </span>
                <Button variant="outline" className="border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10">
                  Manage
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </SectionShell>
  );
}

function ApiSection() {
  return (
    <SectionShell title="API" subtitle="API-Endpunkte und Schlüssel für Integrationen.">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-white/10 bg-[#111113] text-zinc-100">
          <CardHeader>
            <CardTitle>Project URL</CardTitle>
            <CardDescription className="text-zinc-400">Basis-URL für Requests.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Input
              readOnly
              value="https://api.example.com/v1"
              className="border-white/10 bg-black/30 text-zinc-100"
            />
            <Button variant="outline" className="border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10">
              Copy
            </Button>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-[#111113] text-zinc-100">
          <CardHeader>
            <CardTitle>Publishable key</CardTitle>
            <CardDescription className="text-zinc-400">Für Client-SDKs (rotierbar).</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Input
              readOnly
              value="sb_publishable_••••••••••"
              className="border-white/10 bg-black/30 text-zinc-100"
            />
            <Button className="bg-white/10 text-zinc-50 hover:bg-white/15">Rotate</Button>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-[#111113] text-zinc-100 lg:col-span-2">
          <CardHeader>
            <CardTitle>Webhooks</CardTitle>
            <CardDescription className="text-zinc-400">Trigger für Events (coming soon).</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10">
              Create webhook
            </Button>
          </CardContent>
        </Card>
      </div>
    </SectionShell>
  );
}

function SettingsSection() {
  return (
    <SectionShell title="Settings" subtitle="Workspace-Name, Sicherheit und allgemeine Optionen.">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-white/10 bg-[#111113] text-zinc-100">
          <CardHeader>
            <CardTitle>Workspace name</CardTitle>
            <CardDescription className="text-zinc-400">Anzeigename für deinen Workspace.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Input className="border-white/10 bg-black/30 text-zinc-100" defaultValue="Aura UI Studio" />
            <Button className="bg-white/10 text-zinc-50 hover:bg-white/15">Save</Button>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-[#111113] text-zinc-100">
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription className="text-zinc-400">Sicherheitsoptionen verwalten.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <div className="text-sm text-zinc-300">2FA & Session-Rotation</div>
            <Button variant="outline" className="border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10">
              Configure
            </Button>
          </CardContent>
        </Card>
      </div>
    </SectionShell>
  );
}

export default function WorkspaceTab() {
  const navItems: WorkspaceNavItem[] = useMemo(
    () => [
      { id: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
      { id: "integrations", label: "Integrations", icon: <Plug className="h-4 w-4" /> },
      { id: "agents", label: "Agents", icon: <Bot className="h-4 w-4" /> },
      { id: "api", label: "API", icon: <Braces className="h-4 w-4" /> },
      { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
    ],
    []
  );

  const [active, setActive] = useState<WorkspaceSectionId>("overview");

  return (
    <div
      className="h-full w-full overflow-hidden rounded-b-2xl bg-[#1C1C1C] text-zinc-100"
      style={{ fontFamily: "var(--font-tasa), ui-sans-serif, system-ui, sans-serif" }}
    >
      <div className="flex h-full w-full">
        <aside className="w-[280px] shrink-0 border-r border-white/10 bg-[#1C1C1C]">
          <div className="px-4 pt-5">
            <div className="text-sm font-semibold text-zinc-50">Workspace</div>
            <div className="mt-1 text-xs text-zinc-400">Konfiguration & Verwaltung</div>
          </div>
          <div className="px-4 py-4">
            <Input
              placeholder="Search…"
              className="h-9 border-white/10 bg-black/30 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>
          <Separator className="bg-white/10" />
          <ScrollArea className="h-[calc(100%-120px)]">
            <div className="flex flex-col gap-1 p-2">
              {navItems.map((item) => {
                const isActive = item.id === active;
                return (
                  <Button
                    key={item.id}
                    type="button"
                    variant="ghost"
                    onClick={() => setActive(item.id)}
                    className={cn(
                      "w-full justify-start gap-2 rounded-xl px-3 text-zinc-200 hover:bg-white/5 hover:text-zinc-50",
                      isActive && "bg-white/10 text-zinc-50 hover:bg-white/10"
                    )}
                  >
                    {item.icon}
                    <span className="text-sm">{item.label}</span>
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

        <main className="min-w-0 flex-1 overflow-hidden bg-[#1C1C1C]">
          <ScrollArea className="h-full">
            {active === "overview" ? <OverviewSection /> : null}
            {active === "integrations" ? <IntegrationsSection /> : null}
            {active === "agents" ? <AgentsSection /> : null}
            {active === "api" ? <ApiSection /> : null}
            {active === "settings" ? <SettingsSection /> : null}
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}


