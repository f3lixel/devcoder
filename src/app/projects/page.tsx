'use client';

import ResizableSplit from "@/components/ResizableSplit";
import SidebarComponent from "@/components/ui/sidebar-component";
import dynamic from "next/dynamic";
import { useViewMode } from "@/components/view-mode-context";
import { Suspense, useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { SandpackProviderProps } from "@codesandbox/sandpack-react";
import { PanelLeft } from "lucide-react";
const SandboxPlayground = dynamic(() => import("@/components/SandboxPlayground"), { ssr: false });
import { NewAIChat } from "@/components/NewAIChat";

const DEFAULT_STORAGE_KEY = 'sandbox:react:session:v1';

const defaultFiles: SandpackProviderProps['files'] = {
  '/package.json': `{
  "name": "felixel-next-app",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "12.1.6",
    "@next/swc-wasm-nodejs": "12.1.6",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  }
}
`,
  '/next.config.js': `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
`,
  '/pages/_app.js': `import '../styles/globals.css';

export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
`,
  '/pages/index.js': `export default function Home() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Next.js + NodeBox</h1>
      <p>Bearbeite Dateien im Dateibaum links und sieh die Live-Preview rechts.</p>
      <ul style={{ lineHeight: 1.8 }}>
        <li>📁 Alle Dateien werden im Sandpack-Editor gespeichert</li>
        <li>⚡ NodeBox startet automatisch \`npm run dev\`</li>
        <li>👀 Die Vorschau lädt unter der gewohnten Next.js-URL</li>
      </ul>
    </main>
  );
}
`,
  '/styles/globals.css': `* {
  box-sizing: border-box;
}

html,
body {
  padding: 0;
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #020202;
  color: #f5f5f5;
}

a {
  color: inherit;
  text-decoration: none;
}
`,
};

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div
      className="h-[100vh] w-full overflow-hidden flex"
      style={{ backgroundColor: "#1c1c1c" }}
    >
      {sidebarOpen && (
        <div id="projects-sidebar" className="shrink-0">
          <SidebarComponent />
        </div>
      )}

      <div className="flex-1 min-w-0 relative">
        {/* Sidebar-Toggle direkt neben der Sidebar im Hauptbereich */}
        <button
          type="button"
          aria-label={sidebarOpen ? "Sidebar schließen" : "Sidebar öffnen"}
          aria-controls="projects-sidebar"
          aria-expanded={sidebarOpen}
          title={sidebarOpen ? "Sidebar schließen" : "Sidebar öffnen"}
          onClick={() => setSidebarOpen((s) => !s)}
          className="absolute left-4 top-4 z-20 rounded-lg border border-white/10 bg-white/10 p-2 text-white hover:bg-white/15"
        >
          <PanelLeft className="h-5 w-5" />
        </button>

        <Suspense fallback={<div>Loading project...</div>}>
          <HomeContent />
        </Suspense>
      </div>
    </div>
  );
}

function HomeContent() {
  const { mode } = useViewMode();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const storageKey = useMemo(() => projectId ? `project:${projectId}:files:v1` : DEFAULT_STORAGE_KEY, [projectId]);

  const initialFiles = useMemo(() => {
    if (typeof window === 'undefined') {
      return defaultFiles;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw) as SandpackProviderProps['files'];
    } catch {}
    return defaultFiles;
  }, [storageKey]);

  const [files, setFiles] = useState<SandpackProviderProps['files']>(initialFiles);
  const [currentFile, setCurrentFile] = useState<{ path: string; content: string } | undefined>();
  const [terminalOutput, setTerminalOutput] = useState<string>("");
  const [didInitialSync, setDidInitialSync] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(files));
    } catch {}
  }, [files, storageKey]);

  // One-time initial sync of existing files to Supabase so the agent sees the real project state
  useEffect(() => {
    if (!projectId || didInitialSync) return;
    try {
      const payload: Array<{ path: string; content: string }> = [];
      Object.entries(files || {}).forEach(([path, val]) => {
        const code = typeof val === 'string' ? val : (val as any)?.code ?? '';
        payload.push({ path, content: String(code) });
      });
      if (payload.length > 0) {
        fetch(`/api/projects/${projectId}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: payload }),
        }).catch(() => {});
        setDidInitialSync(true);
      }
    } catch {}
  }, [projectId, files, didInitialSync]);

  const handleNewFiles = useCallback((newFiles: Array<{ path: string; content: string }>) => {
    // Helper: make a filename-safe PascalCase identifier
    const toPascalCase = (raw: string): string => {
      const cleaned = raw
        .replace(/[^A-Za-z0-9]+/g, ' ')
        .trim()
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
      return cleaned || 'Generated';
    };

    // Helper: try to infer a component/name from the file content
    const inferNameFromCode = (code: string): string | null => {
      const patterns = [
        /\bexport\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)/,
        /\bfunction\s+([A-Z][A-Za-z0-9_]*)\s*\(/,
        /\bconst\s+([A-Z][A-Za-z0-9_]*)\s*[:=]\s*(?:React\.FC|React\.FunctionComponent|\(.*=>)/,
        /\bclass\s+([A-Z][A-Za-z0-9_]*)\s+/,
      ];
      for (const re of patterns) {
        const m = code.match(re);
        if (m?.[1]) return m[1];
      }
      // Try simple "// Sidebar" style comments
      const commentMatch = code.match(/\/\/\s*([A-Za-z][A-Za-z0-9_-]+)\s*(?:component)?/i);
      if (commentMatch?.[1]) return toPascalCase(commentMatch[1]);
      return null;
    };

    // Helper: normalize AI temp paths to meaningful project paths
    const normalizeGeneratedPath = (
      rawPath: string,
      content: string,
      existing: Record<string, any>,
      tempIndex: number,
    ): string => {
      const withSlash = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

      // If it's not one of our temp-ai-code-* files, keep as-is
      if (!/^\/?temp-ai-code-\d+\./i.test(withSlash)) {
        return withSlash;
      }

      const ext = (withSlash.split('.').pop() || 'js').toLowerCase();
      const inferred = inferNameFromCode(content) || (ext === 'css' ? 'Styles' : 'Component');
      const baseName = toPascalCase(inferred);

      // 1. Try to find an existing file with this name to overwrite/update
      const existingPaths = Object.keys(existing);
      
      // Special handling for App component - prefer root or existing location
      if (baseName === 'App') {
        const appMatch = existingPaths.find(p => p.match(/^\/?(src\/)?App\.(js|jsx|ts|tsx)$/i));
        if (appMatch) return appMatch;
        // If no App exists yet, default to /App.tsx (root)
        return '/App.tsx';
      }

      // General search for existing component with same name
      // We prioritize exact matches in src/components or root
      const match = existingPaths.find(p => {
        const parts = p.split('/');
        const pFilename = parts[parts.length - 1];
        const pName = pFilename.split('.')[0];
        return pName?.toLowerCase() === baseName.toLowerCase() && /\.(js|jsx|ts|tsx)$/i.test(p);
      });
      
      if (match) {
        return match;
      }

      // 2. If not found, generate new path
      let baseDir = '/src';
      let fileName = `${baseName}.${ext}`;

      if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) {
        baseDir = '/src/components';
        const finalExt = ext === 'jsx' ? 'tsx' : ext;
        fileName = `${baseName}.${finalExt}`;
      } else if (ext === 'css') {
        baseDir = '/styles';
        fileName = `${baseName.toLowerCase()}.css`;
      } else if (ext === 'html' || ext === 'htm') {
        baseDir = '/public';
        // Prefer index.html if noch nicht vorhanden
        const indexPath = '/public/index.html';
        if (!existing[indexPath]) return indexPath;
        fileName = `page-${tempIndex}.html`;
      }

      return `${baseDir}/${fileName}`;
    };

    let firstPath: string | undefined;
    let firstContent: string | undefined;
    const normalizedForServer: Array<{ path: string; content: string }> = [];

    setFiles((prevFiles) => {
      const safePrev = prevFiles || {};
      // Use a plain record here to avoid narrowing/undefined issues from the Sandpack types
      const next: Record<string, any> = { ...safePrev };

      newFiles.forEach((file, index) => {
        const normalizedPath = normalizeGeneratedPath(file.path, file.content, next, index + 1);
        if (!firstPath) {
          firstPath = normalizedPath;
          firstContent = file.content;
        }
        // Always write the file content as a plain string (Sandpack accepts string or file objects)
        next[normalizedPath] = file.content;
        normalizedForServer.push({ path: normalizedPath, content: file.content });
      });

      return next as SandpackProviderProps['files'];
    });

    // Focus the first created/modified file in the editor using the normalized path (avoids race)
    if (firstPath && typeof firstContent === 'string') {
      setCurrentFile({ path: firstPath, content: firstContent });
    }

    // Persist files to server (Supabase) so the agent has an up-to-date project view
    if (projectId && normalizedForServer.length > 0) {
      try {
        fetch(`/api/projects/${projectId}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: normalizedForServer }),
        }).catch(() => {});
      } catch {}
    }
  }, [setFiles, setCurrentFile, projectId]);

  const handleFileChange = useCallback((path: string, code: string) => {
    setFiles(prevFiles => ({
      ...(prevFiles || {}),
      [path]: code,
    } as SandpackProviderProps['files']));
    // Update current file if it's the one being edited
    if (currentFile?.path === path) {
      setCurrentFile({ path, content: code });
    }
    // Persist single file change
    if (projectId) {
      try {
        fetch(`/api/projects/${projectId}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: [{ path, content: code }] }),
        }).catch(() => {});
      } catch {}
    }
  }, [currentFile, projectId]);

  // Handler for running terminal commands
  const handleRunCommand = useCallback(async (command: string): Promise<{ output: string; error?: string }> => {
    // This will be connected to the terminal implementation
    // For now, return a mock response
    const mockOutput = `Executing: ${command}\nCommand completed successfully.`;
    setTerminalOutput(prev => prev + '\n$ ' + command + '\n' + mockOutput);
    return { output: mockOutput };
  }, []);

  // Track current file selection
  const handleFileSelect = useCallback((path: string) => {
    const fileEntry = files?.[path];
    if (!fileEntry) return;
    const content = typeof fileEntry === 'string' ? fileEntry : (fileEntry as any)?.code || '';
    setCurrentFile({ path, content: content as string });
  }, [files]);

  // Convert Sandpack files shape (which allows string | SandpackFile) into a simple map of path->string
  // used by the chat UI. This avoids type errors where components expect Record<string,string>.
  const filesForChat = useMemo(() => {
    if (!files) return undefined;
    const out: Record<string, string> = {};
    Object.entries(files).forEach(([k, v]) => {
      if (typeof v === 'string') out[k] = v;
      else if (v && typeof (v as any).code === 'string') out[k] = (v as any).code;
      else out[k] = String(v ?? '');
    });
    return out;
  }, [files]);

  return (
    <ResizableSplit
      initialPercentLeft={30}
      minPercentLeft={20}
      left={
        <div className="h-full p-3 pr-2 flex pt-16 pb-4">
          <div className="h-full flex-1 min-w-0 rounded-2xl overflow-hidden">
            <Suspense fallback={null}>
              {/* New AI Chat Interface */}
              <NewAIChat
                onNewFiles={handleNewFiles}
                onRunCommand={handleRunCommand}
                files={filesForChat}
                currentFile={currentFile}
                terminalOutput={terminalOutput}
                onFocusFile={handleFileSelect}
                projectId={projectId || undefined}
              />
            </Suspense>
          </div>
        </div>
      }
      right={
        <div className="h-full pt-16 pl-0 pr-3 pb-4">
          <SandboxPlayground 
            files={files} 
            onFilesChange={handleFileChange}
            onFileSelect={handleFileSelect}
            activeFile={currentFile?.path}
          />
        </div>
      }
    />
  );
}
