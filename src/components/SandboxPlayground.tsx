'use client';

import {
  SandboxProvider,
  SandboxLayout,
  SandboxTabs,
  SandboxTabsTrigger,
  SandboxTabsContent,
  CodiconFileExplorer,
  SandboxCodeEditor,
  SandboxPreview,
  SandboxEditorTabs,
  SandboxEditorBreadcrumbs,
} from '@/components/ui/shadcn-io/sandbox/index';
import type { SandpackProviderProps } from '@codesandbox/sandpack-react';
import { useMemo, useCallback, useRef } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { useState, useEffect } from 'react';
import { Loader } from '@/components/ai-elements/loader';
import type { SandpackTheme } from '@codesandbox/sandpack-react';
import { useSandpack } from '@codesandbox/sandpack-react';
import { ChevronLeft, ChevronRight, Code2, Monitor, ExternalLink, RotateCcw, Maximize2, MoreVertical } from 'lucide-react';

interface SandboxPlaygroundProps {
  files: SandpackProviderProps['files'];
  onFilesChange: (path: string, code: string) => void;
  onFileSelect?: (path: string) => void;
  activeFile?: string;
}

function Toolbar({ onOpenNewTab }: { onOpenNewTab: () => void }) {
  const { sandpack } = useSandpack();
  return (
    <div className="mx-2 flex-1 flex items-center justify-center">
      <div className="min-w-0 w-[720px] max-w-full h-8 flex items-center gap-2 rounded-md border border-[#222] bg-[#0e0e0e] px-2 text-xs text-neutral-300">
        <ChevronLeft size={14} className="text-neutral-500" />
        <ChevronRight size={14} className="text-neutral-500" />
        <div className="h-4 w-px bg-white/10" />
        <Monitor size={14} className="text-neutral-500" />
        <input
          className="flex-1 bg-transparent outline-none placeholder:text-neutral-500"
          placeholder="/"
          value="/"
          readOnly
          aria-label="Pfad"
        />
        <div className="h-4 w-px bg-white/10" />
        <button
          type="button"
          title="Open in new tab"
          className="inline-flex h-6 w-6 items-center justify-center rounded-[6px] text-neutral-400 hover:text-white hover:bg-white/5"
          onClick={onOpenNewTab}
        >
          <ExternalLink size={14} />
        </button>
        <button
          type="button"
          title="Reload"
          className="inline-flex h-6 w-6 items-center justify-center rounded-[6px] text-neutral-400 hover:text-white hover:bg-white/5"
          onClick={() => {
            try { (sandpack as any)?.runSandpack?.(); } catch {}
          }}
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
}

export default function SandboxPlayground({ 
  files, 
  onFilesChange, 
  onFileSelect,
  activeFile
}: SandboxPlaygroundProps) {
  const [previewReady, setPreviewReady] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  // Mark preview as ready after first mount tick to avoid SSR flash; in real use, wire to sandpack onLoad
  useEffect(() => {
    // Warten bis wir sicher im Client sind, dann leicht verzögert anzeigen
    const t = setTimeout(() => setPreviewReady(true), 0);
    return () => clearTimeout(t);
  }, []);

  // Editor-Theme: VSCode/One Dark Pro nah – dunkle Flächen, grüne Strings, lila Keywords
  const editorTheme: SandpackTheme = {
    colors: {
      surface1: '#1e1e1e', // editor background
      surface2: '#1b1b1b',
      surface3: '#191919',
      clickable: '#d4d4d4',
      base: '#d4d4d4',
      disabled: '#6b6b6b',
      hover: '#2a2a2a',
      accent: '#569cd6', // VSCode blue accent
      error: '#f14c4c',
      errorSurface: '#2a1212',
    },
    font: {
      body: 'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      mono: 'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      size: '13px',
      lineHeight: '1.6',
    },
    syntax: {
      plain: '#d4d4d4',
      comment: { color: '#6A9955', fontStyle: 'italic' },
      keyword: '#C586C0', // purple
      tag: '#569CD6', // blue
      punctuation: '#D4D4D4',
      definition: '#61AFEF', // fn/def
      property: '#9CDCFE', // object keys / properties
      static: '#D19A66',
      string: '#98C379', // green strings
    },
  };

  const normalizedFiles = useMemo(() => {
    const next: SandpackProviderProps['files'] = { ...files };
    if ((next as any)['/package.js']) {
      (next as any)['/package.json'] = (next as any)['/package.js'];
      delete (next as any)['/package.js'];
    }
    // Ensure missing CSS import used by Header resolves to a real file
    const headerFile = (next as any)['/src/components/Header.tsx'];
    const headerCode = typeof headerFile === 'string' ? headerFile : headerFile?.code;
    if (typeof headerCode === 'string' && headerCode.includes("import './styles/components/Header.css'")) {
      const cssPath = '/src/components/styles/components/Header.css';
      if (!(next as any)[cssPath]) {
        (next as any)[cssPath] = '/* autogenerated placeholder: Header styles */\n.header{ display: contents; }\n';
      }
    }

    // Ensure Sandpack minimal boot files exist for template="react"
    if (!(next as any)['/public/index.html']) {
      (next as any)['/public/index.html'] = `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Sandbox</title>\n  </head>\n  <body>\n    <div id="root"></div>\n  </body>\n</html>\n`;
    }
    if (!(next as any)['/styles.css']) {
      (next as any)['/styles.css'] = `/* default styles */\nhtml,body,#root{height:100%}\nbody{font-family:system-ui, sans-serif;margin:0;background:#0a0a0a;color:#e5e5e5}\n`;
    }
    // If no explicit index entry exists, create one that mounts App from either /App.tsx or /App.js
    if (!(next as any)['/index.js']) {
      const hasTsx = Boolean((next as any)['/App.tsx']);
      const appImport = hasTsx ? "./App" : ( (next as any)['/App.js'] ? "./App" : null );
      (next as any)['/index.js'] = `import React from 'react'\nimport { createRoot } from 'react-dom/client'\n${appImport ? `import App from '${appImport}'\n` : ''}import './styles.css'\nconst root = createRoot(document.getElementById('root'))\nroot.render(<React.StrictMode>${appImport ? '<App />' : '<div />'}</React.StrictMode>)\n`;
    }
    if (!(next as any)['/App.js'] && !(next as any)['/App.tsx']) {
      (next as any)['/App.js'] = `export default function App(){ return <h1>Sandbox Ready</h1> }\n`;
    }

    // Generic: auto-create placeholders for missing relative imports
    const pathJoin = (baseDir: string, rel: string) => {
      const parts = (baseDir + '/' + rel).split('/')
        .filter(Boolean);
      const stack: string[] = [];
      for (const part of parts) {
        if (part === '.') continue;
        if (part === '..') { stack.pop(); continue; }
        stack.push(part);
      }
      return '/' + stack.join('/');
    };

    const candidatesFor = (p: string) => {
      // If path already has extension, try exact and index fallback
      const hasExt = /\.[a-zA-Z0-9]+$/.test(p);
      const list: string[] = [];
      if (hasExt) {
        list.push(p);
      } else {
        list.push(p + '.tsx', p + '.ts', p + '.jsx', p + '.js', p + '.css');
        list.push(p + '/index.tsx', p + '/index.ts', p + '/index.jsx', p + '/index.js');
      }
      return list;
    };

    const ensureFile = (fullPath: string) => {
      if ((next as any)[fullPath]) return;
      if (fullPath.endsWith('.css')) {
        (next as any)[fullPath] = '/* autogenerated placeholder */\n';
        return;
      }
      if (fullPath.endsWith('.tsx') || fullPath.endsWith('.jsx')) {
        (next as any)[fullPath] = "import React from 'react'\nexport default function Placeholder(){ return null }\n";
        return;
      }
      if (fullPath.endsWith('.ts')) {
        (next as any)[fullPath] = 'export {}\n';
        return;
      }
      if (fullPath.endsWith('.js')) {
        (next as any)[fullPath] = 'export default {}\n';
        return;
      }
    };

    const importRegex = /import\s+(?:[^'";]+\s+from\s+)?['\"]([^'\"]+)['\"];?|require\(\s*['\"]([^'\"]+)['\"]\s*\)/g;
    Object.entries(next).forEach(([filePath, fileContent]) => {
      const code = typeof fileContent === 'string' ? fileContent : (fileContent as any)?.code;
      if (typeof code !== 'string') return;
      if (!/\.(tsx|ts|jsx|js)$/.test(filePath)) return;
      const baseDir = filePath.split('/').slice(0, -1).join('/') || '/';
      let m: RegExpExecArray | null;
      while ((m = importRegex.exec(code))) {
        const rel = (m[1] || m[2]) as string | undefined;
        if (!rel || !(rel.startsWith('./') || rel.startsWith('../'))) continue;
        const absBase = baseDir === '/' ? '' : baseDir;
        const targetBase = pathJoin(absBase, rel);
        const options = candidatesFor(targetBase);
        const exists = options.find((opt) => (next as any)[opt]);
        if (!exists && options.length > 0) {
          ensureFile(options[0]);
        }
      }
    });
    return next;
  }, [files]);

  const handleCodeUpdate = useCallback((path: string, code: string) => {
    const nextPath = path === '/package.js' ? '/package.json' : path;
    onFilesChange(nextPath, code);
  }, [onFilesChange]);

  // Notify parent when a file is selected in the editor
  const handleFileOpen = useCallback((path: string) => {
    if (onFileSelect) {
      onFileSelect(path);
    }
  }, [onFileSelect]);

  return (
    <div className={"felixel-editor-tight h-full w-full p-0 m-0 " + (isFullscreen ? "fixed inset-0 z-[100] bg-[#0a0a0a]" : "") } ref={previewContainerRef}>
      <SandboxProvider
        template="react"
        files={normalizedFiles}
        theme={editorTheme}
        options={{
          activeFile: activeFile || '/App.js',
          recompileMode: 'immediate',
          recompileDelay: 0,
          autorun: true,
        }}
      >
        {/* Custom header matching the screenshot with eye/code tab switch */}
        <SandboxTabs defaultValue="code" className="h-full p-0 rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] text-neutral-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
          {/* Top bar */}
          <div className="h-[45px] flex items-center gap-2 px-2 border-b border-[#1a1a1a] bg-[#0b0b0b]">
            {/* Left controls (double chevrons like screenshot) */}
            <div className="flex items-center gap-1 px-1">
              <button type="button" className="h-7 w-7 inline-flex items-center justify-center rounded-md text-neutral-400 hover:text-white hover:bg-white/5" aria-label="Zurück">
                <ChevronLeft size={16} />
              </button>
              <button type="button" className="h-7 w-7 inline-flex items-center justify-center rounded-md text-neutral-400 hover:text-white hover:bg-white/5" aria-label="Vor">
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Eye / Code tab switches */}
            <div className="flex items-center">
              <div className="inline-flex h-8 items-center rounded-md border border-white/10 bg-[#141414] overflow-hidden">
                <SandboxTabsTrigger value="preview" className="h-8 w-10 p-0 rounded-none text-neutral-400 data-[state=active]:text-white data-[state=active]:bg-[#0b0b0b]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-icon lucide-eye">
                    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </SandboxTabsTrigger>
                <div className="h-8 w-px bg-white/10" />
                <SandboxTabsTrigger value="code" className="h-8 w-10 p-0 rounded-none text-neutral-400 data-[state=active]:text-white data-[state=active]:bg-[#0b0b0b]">
                  <Code2 size={16} />
                </SandboxTabsTrigger>
              </div>
            </div>

            {/* Center address bar */}
            <Toolbar
              onOpenNewTab={() => {
                // Try to find the Sandpack preview iframe and open its src in a new tab
                const root = previewContainerRef.current;
                if (!root) return;
                const iframe = root.querySelector('iframe');
                const src = iframe ? (iframe.getAttribute('src') || iframe.getAttribute('data-src') || '') : '';
                if (src) {
                  try { window.open(src, '_blank', 'noopener,noreferrer'); } catch {}
                }
              }}
            />

            {/* Right controls */}
            <div className="flex items-center gap-1 px-1">
              <button type="button" className="h-7 w-7 inline-flex items-center justify-center rounded-md text-neutral-400 hover:text-white hover:bg-white/5" title="Fullscreen" onClick={() => setIsFullscreen((v) => !v)}>
                <Maximize2 size={16} />
              </button>
              <button type="button" className="h-7 w-7 inline-flex items-center justify-center rounded-md text-neutral-400 hover:text-white hover:bg-white/5" title="More">
                <MoreVertical size={16} />
              </button>
            </div>
          </div>
          <SandboxLayout>
            <SandboxTabsContent value="preview">
              {!previewReady && (
                <div className="absolute inset-0 z-10 grid place-items-center bg-background/40 backdrop-blur-sm">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md glass-panel">
                    <Loader size={16} />
                    <span className="text-sm text-foreground/80">Starting preview…</span>
                  </div>
                </div>
              )}
              <SandboxPreview showOpenInCodeSandbox={true} />
            </SandboxTabsContent>
            <SandboxTabsContent value="code" className="h-full w-full p-0 m-0">
              <PanelGroup direction="horizontal" className="h-full w-full p-0 m-0" style={{ gap: 0 }}>
                <Panel defaultSize={25} minSize={15} className="h-full p-0 m-0">
                  <CodiconFileExplorer />
                </Panel>
                <PanelResizeHandle className="w-1 bg-border data-[resize-handle-active]:bg-primary cursor-col-resize" />
                <Panel minSize={25} className="h-full p-0 m-0">
                  <div className="h-full p-0 m-0 flex flex-col">
                    <SandboxEditorTabs />
                    <SandboxEditorBreadcrumbs />
                    <div className="flex-1 min-h-0">
                      <SandboxCodeEditor showTabs={false} className="!m-0 !p-0" />
                    </div>
                  </div>
                </Panel>
              </PanelGroup>
            </SandboxTabsContent>
            {/* Console tab hidden for this design */}
          </SandboxLayout>
        </SandboxTabs>
      </SandboxProvider>
    </div>
  );
}
