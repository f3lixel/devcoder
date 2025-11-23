'use client';

import {
  SandboxProvider,
  SandboxLayout,
  SandboxTabs,
  SandboxTabsTrigger,
  SandboxTabsContent,
  CodiconFileExplorer,
  SandboxCodeEditor,
  SandboxEditorTabs,
  SandboxEditorBreadcrumbs,
  SandboxPreview,
} from '@/components/ui/shadcn-io/sandbox/index';
import type { SandpackProviderProps, SandpackTheme } from '@codesandbox/sandpack-react';
import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { useSandpack } from '@codesandbox/sandpack-react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { Loader } from '@/components/ai-elements/loader';
import { ChevronLeft, ChevronRight, Code2, Monitor, ExternalLink, RotateCcw, Maximize2, MoreVertical, AlertTriangle } from 'lucide-react';

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
      <div className="min-w-0 w-[720px] max-w-full h-8 flex items-center gap-2 rounded-md border border-[#3a3838] bg-[#272525] px-2 text-xs text-neutral-300">
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
            try { sandpack?.runSandpack?.(); } catch {}
          }}
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
}

function SandpackBridge({
  onFilesChange,
  onFileSelect,
}: {
  onFilesChange: (path: string, code: string) => void;
  onFileSelect?: (path: string) => void;
}) {
  const { sandpack } = useSandpack();

  useEffect(() => {
    const listen = sandpack.listen;
    if (typeof listen !== 'function') {
      return;
    }
    const unsubscribe = listen((message: any) => {
      if (message.type === 'update' && typeof message.code === 'string' && typeof message.path === 'string') {
        const normalized = message.path.startsWith('/') ? message.path : `/${message.path}`;
        onFilesChange(normalized, message.code);
      }
    });
    return () => {
      unsubscribe?.();
    };
  }, [sandpack, onFilesChange]);

  useEffect(() => {
    if (sandpack?.activeFile && onFileSelect) {
      const normalized = sandpack.activeFile.startsWith('/') ? sandpack.activeFile : `/${sandpack.activeFile}`;
      onFileSelect(normalized);
    }
  }, [sandpack?.activeFile, onFileSelect]);

  return null;
}

function PreviewPane() {
  const { sandpack } = useSandpack();
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const iframe = previewRef.current?.querySelector('iframe');
    if (iframe) {
      iframe.setAttribute('data-sandpack-preview-iframe', 'true');
    }
  }, [sandpack?.status, sandpack?.activeFile]);

  const status = sandpack?.status ?? 'idle';
  const errorValue = sandpack?.error;
  const errorMessage =
    typeof errorValue === 'string'
      ? errorValue
      : errorValue?.message ?? null;

  const statusLabel = (() => {
    switch (status) {
      case 'running':
        return 'Vorschau läuft';
      case 'processing':
        return 'Build läuft…';
      case 'timeout':
        return 'Build Timeout';
      case 'idle':
        return 'Initialisiere Vorschau…';
      default:
        return 'Vorschau wird vorbereitet…';
    }
  })();

  const isBusy = status !== 'running';

  return (
    <div ref={previewRef} className="relative h-full w-full overflow-hidden rounded-b-2xl bg-[#272525]">
      <SandboxPreview className="h-full w-full border-0 bg-[#272525]" showOpenInCodeSandbox={false} />
      {isBusy && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-black/40 backdrop-blur-sm transition-opacity">
          <div className="flex items-center gap-2 rounded-md border border-white/10 bg-[#272525] px-3 py-2 text-neutral-200 shadow-inner">
            <Loader size={16} className="animate-spin" />
            <span className="text-sm font-medium">{statusLabel}</span>
          </div>
        </div>
      )}
      {errorMessage && (
        <div className="absolute inset-6 z-20 rounded-xl border border-red-500/50 bg-red-500/15 p-4 backdrop-blur">
          <div className="flex items-start gap-3 text-sm text-red-100">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
            <div className="space-y-3">
              <div>
                <p className="font-medium tracking-wide text-red-100">Sandpack-Fehler</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-red-100/80">{errorMessage}</p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-red-300/40 bg-red-400/10 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-red-100 transition hover:bg-red-400/20"
                onClick={() => {
                  try { sandpack?.runSandpack?.(); } catch {}
                }}
              >
                <RotateCcw size={14} />
                Neu laden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SandboxPlayground({
  files,
  onFilesChange,
  onFileSelect,
  activeFile,
}: SandboxPlaygroundProps) {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  const originalFiles = useMemo(() => {
    const source = files ?? {};
    const result: Record<string, string> = {};
    Object.entries(source).forEach(([path, value]) => {
      const code =
        typeof value === 'string'
          ? value
          : typeof (value as any)?.code === 'string'
          ? (value as any).code
          : null;
      if (typeof code !== 'string') {
        return;
      }
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      if (!normalizedPath) {
        return;
      }
      result[normalizedPath] = code;
    });
    if (result['/package.js']) {
      result['/package.json'] = result['/package.js'];
      delete result['/package.js'];
    }
    return result;
  }, [files]);

  const editorTheme: SandpackTheme = {
    colors: {
      surface1: '#272525',
      surface2: '#272525',
      surface3: '#272525',
      clickable: '#d4d4d4',
      base: '#d4d4d4',
      disabled: '#6b6b6b',
      hover: '#2a2a2a',
      accent: '#569cd6',
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
      keyword: '#C586C0',
      tag: '#569CD6',
      punctuation: '#D4D4D4',
      definition: '#61AFEF',
      property: '#9CDCFE',
      static: '#D19A66',
      string: '#98C379',
    },
  };

  const normalizedFiles = useMemo(() => {
    const next: SandpackProviderProps['files'] = { ...originalFiles };
    if ((next as any)['/package.js']) {
      (next as any)['/package.json'] = (next as any)['/package.js'];
      delete (next as any)['/package.js'];
    }
    const headerFile = (next as any)['/src/components/Header.tsx'];
    const headerCode = typeof headerFile === 'string' ? headerFile : headerFile?.code;
    if (typeof headerCode === 'string' && headerCode.includes("import './styles/components/Header.css'")) {
      const cssPath = '/src/components/styles/components/Header.css';
      if (!(next as any)[cssPath]) {
        (next as any)[cssPath] = '/* autogenerated placeholder: Header styles */\n.header{ display: contents; }\n';
      }
    }

    if (!(next as any)['/package.json']) {
      (next as any)['/package.json'] = JSON.stringify({
        name: 'sandbox-app',
        private: true,
        version: '0.0.0',
        type: 'module',
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
        },
      }, null, 2);
    } else {
      try {
        const raw = (next as any)['/package.json'];
        const pkg = typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(String((raw as any)?.code ?? '{}'));
        pkg.dependencies = pkg.dependencies || {};
        const reactVer: string = String(pkg.dependencies.react || '');
        const reactDomVer: string = String(pkg.dependencies['react-dom'] || '');
        const needsAdjust = /^(19|canary|beta|rc)/.test(reactVer) || /^(19|canary|beta|rc)/.test(reactDomVer) || !reactVer || !reactDomVer;
        if (needsAdjust) {
          pkg.dependencies.react = '^18.2.0';
          pkg.dependencies['react-dom'] = '^18.2.0';
          (next as any)['/package.json'] = JSON.stringify(pkg, null, 2);
        }
      } catch {}
    }
    if (!(next as any)['/public/index.html']) {
      (next as any)['/public/index.html'] = `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Sandbox</title>\n  </head>\n  <body>\n    <div id="root"></div>\n  </body>\n</html>\n`;
    }
    if (!(next as any)['/styles.css']) {
      (next as any)['/styles.css'] = `/* default styles */\nhtml,body,#root{height:100%}\nbody{font-family:system-ui, sans-serif;margin:0;background:#0a0a0a;color:#e5e5e5}\n`;
    }
    if (!(next as any)['/index.js']) {
      const hasAppRoot = Boolean((next as any)['/App.tsx'] || (next as any)['/App.js']);
      const hasSrcApp = Boolean((next as any)['/src/App.tsx'] || (next as any)['/src/App.jsx']);
      const hasMainTsx = Boolean((next as any)['/src/main.tsx']);
      const hasMainJsx = Boolean((next as any)['/src/main.jsx']);
      const hasSrcIndexTsx = Boolean((next as any)['/src/index.tsx']);
      const hasSrcIndexJsx = Boolean((next as any)['/src/index.jsx']);

      let indexCode = '';
      if (hasMainTsx) {
        indexCode = `import './styles.css'\nimport './src/main.tsx'\n`;
      } else if (hasMainJsx) {
        indexCode = `import './styles.css'\nimport './src/main.jsx'\n`;
      } else if (hasSrcIndexTsx) {
        indexCode = `import './styles.css'\nimport './src/index.tsx'\n`;
      } else if (hasSrcIndexJsx) {
        indexCode = `import './styles.css'\nimport './src/index.jsx'\n`;
      } else if (hasSrcApp) {
        indexCode = `import React from 'react'\nimport { createRoot } from 'react-dom/client'\nimport App from './src/App'\nimport './styles.css'\nconst root = createRoot(document.getElementById('root'))\nroot.render(<React.StrictMode><App /></React.StrictMode>)\n`;
      } else if (hasAppRoot) {
        indexCode = `import React from 'react'\nimport { createRoot } from 'react-dom/client'\nimport App from './App'\nimport './styles.css'\nconst root = createRoot(document.getElementById('root'))\nroot.render(<React.StrictMode><App /></React.StrictMode>)\n`;
      } else {
        indexCode = `import React from 'react'\nimport { createRoot } from 'react-dom/client'\nimport './styles.css'\nconst root = createRoot(document.getElementById('root'))\nroot.render(<React.StrictMode><div>Sandbox Ready</div></React.StrictMode>)\n`;
      }
      (next as any)['/index.js'] = indexCode;
    }
    if (!(next as any)['/App.js'] && !(next as any)['/App.tsx'] && !(next as any)['/src/main.tsx'] && !(next as any)['/src/index.tsx']) {
      (next as any)['/App.js'] = `export default function App(){ return <h1>Sandbox Ready</h1> }\n`;
    }

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

    const importRegex = /import\s+(?:[^'";]+\s+from\s+)?['"]([^'"]+)['"];?|require\(\s*['"]([^'"]+)['"]\s*\)/g;
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
  }, [originalFiles]);

  const handleCodeUpdate = useCallback((path: string, code: string) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const nextPath = normalized === '/package.js' ? '/package.json' : normalized;
    onFilesChange(nextPath, code);
  }, [onFilesChange]);

  const handleFileOpen = useCallback((path: string) => {
    if (onFileSelect) {
      const normalized = path.startsWith('/') ? path : `/${path}`;
      onFileSelect(normalized);
    }
  }, [onFileSelect]);

  const handleOpenPreview = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    const scopedRoot = previewContainerRef.current;
    const iframe =
      scopedRoot?.querySelector<HTMLIFrameElement>('iframe[data-sandpack-preview-iframe="true"]') ||
      document.querySelector<HTMLIFrameElement>('iframe[data-sandpack-preview-iframe="true"]') ||
      scopedRoot?.querySelector<HTMLIFrameElement>('iframe') ||
      document.querySelector<HTMLIFrameElement>('iframe');
    const src = iframe?.getAttribute('src') || iframe?.dataset?.src || '';
    if (src) {
      try {
        window.open(src, '_blank', 'noopener,noreferrer');
      } catch {}
    }
  }, []);

  return (
    <div
      className={
        'felixel-editor-tight h-full w-full p-0 m-0 ' +
        (isFullscreen ? 'fixed inset-0 z-[100] bg-[#272525]' : '')
      }
      ref={previewContainerRef}
    >
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
        <SandpackBridge onFilesChange={handleCodeUpdate} onFileSelect={handleFileOpen} />
        <SandboxTabs defaultValue="code" className="h-full p-0 rounded-2xl border border-[#1f1d1d] bg-[#272525] text-neutral-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
          <div className="h-[45px] flex items-center gap-2 px-2 border-b border-[#1f1d1d] bg-[#272525]">
            <div className="flex items-center gap-1 px-1">
              <button type="button" className="h-7 w-7 inline-flex items-center justify-center rounded-md text-neutral-400 hover:text-white hover:bg-white/5" aria-label="Zurück">
                <ChevronLeft size={16} />
              </button>
              <button type="button" className="h-7 w-7 inline-flex items-center justify-center rounded-md text-neutral-400 hover:text-white hover:bg-white/5" aria-label="Vor">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flex items-center">
              <div className="inline-flex h-8 items-center rounded-md border border-white/10 bg-[#1f1d1d] overflow-hidden">
                <SandboxTabsTrigger value="preview" className="h-8 w-10 p-0 rounded-none text-neutral-400 data-[state=active]:text-white data-[state=active]:bg-[#272525]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </SandboxTabsTrigger>
                <div className="h-8 w-px bg-white/10" />
                <SandboxTabsTrigger value="code" className="h-8 w-10 p-0 rounded-none text-neutral-400 data-[state=active]:text-white data-[state=active]:bg-[#272525]">
                  <Code2 size={16} />
                </SandboxTabsTrigger>
              </div>
            </div>
            <Toolbar onOpenNewTab={handleOpenPreview} />
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
            <SandboxTabsContent value="preview" className="relative h-full">
              <PreviewPane />
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
          </SandboxLayout>
        </SandboxTabs>
      </SandboxProvider>
    </div>
  );
}
