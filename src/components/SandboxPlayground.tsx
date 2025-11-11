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
} from '@/components/ui/shadcn-io/sandbox/index';
import type { SandpackProviderProps } from '@codesandbox/sandpack-react';
import { Nodebox } from '@codesandbox/nodebox';
import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { Loader } from '@/components/ai-elements/loader';
import type { SandpackTheme } from '@codesandbox/sandpack-react';
import { useSandpack } from '@codesandbox/sandpack-react';
import { ChevronLeft, ChevronRight, Code2, Monitor, ExternalLink, RotateCcw, Maximize2, MoreVertical, Terminal, AlertTriangle } from 'lucide-react';

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
  const [nodeboxReady, setNodeboxReady] = useState<boolean>(false);
  const [nodeboxStatus, setNodeboxStatus] = useState<'idle' | 'connecting' | 'syncing' | 'starting' | 'running' | 'error'>('idle');
  const [nodeboxError, setNodeboxError] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const [logBuffer, setLogBuffer] = useState<Array<{ type: 'stdout' | 'stderr'; message: string }>>([]);
  const [currentPreviewUrl, setCurrentPreviewUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const runtimeIframeRef = useRef<HTMLIFrameElement | null>(null);
  const nodeboxPreviewRef = useRef<HTMLIFrameElement | null>(null);
  const nodeboxRef = useRef<Nodebox | null>(null);
  const shellRef = useRef<any>(null);
  const activeProcessRef = useRef<any>(null);
  const lastSyncedFilesRef = useRef<Record<string, string>>({});
  const initialRunCompletedRef = useRef<boolean>(false);
  const restartOnFsChangeRef = useRef<boolean>(false);
  const textDecoder = useMemo(() => new TextDecoder(), []);

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

  const appendLog = useCallback((type: 'stdout' | 'stderr', payload: string | Uint8Array) => {
    const raw = typeof payload === 'string' ? payload : textDecoder.decode(payload);
    const cleaned = raw.replace(/\u001B\[[0-9;]*m/g, ''); // Strip ANSI codes
    setLogBuffer((prev) => {
      const next = [...prev, { type, message: cleaned }];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
    const label = type === 'stderr' ? '[Nodebox stderr]' : '[Nodebox stdout]';
    // Zusätzlich im Browser-Console-Log ausgeben
    console[type === 'stderr' ? 'error' : 'log'](`${label} ${cleaned}`);
  }, [textDecoder]);

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
    const next: SandpackProviderProps['files'] = { ...originalFiles };
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
    if (!(next as any)['/package.json']) {
      (next as any)['/package.json'] = JSON.stringify({
        name: 'sandbox-app',
        private: true,
        version: '0.0.0',
        type: 'module',
        scripts: {
          dev: 'node server.mjs',
          start: 'node server.mjs'
        },
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0'
        }
      }, null, 2);
    } else {
      // Normalize provided package.json to React 18 for Sandpack compatibility
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
    if (!(next as any)['/server.mjs']) {
      (next as any)['/server.mjs'] = [
        "import http from 'http';",
        "",
        "const port = Number(process.env.PORT) || 3000;",
        "",
        "const server = http.createServer((req, res) => {",
        "  res.setHeader('Content-Type', 'text/html; charset=utf-8');",
        "  res.writeHead(200);",
        "  res.end('<!doctype html><html><head><title>Sandbox</title></head><body><h1>Sandbox Ready (Node)</h1></body></html>');",
        "});",
        "",
        "server.listen(port, () => {",
        "  // eslint-disable-next-line no-console",
        "  console.log(`Server listening on http://localhost:${port}`);",
        "});",
        ""
      ].join('\\n');
    }
    if (!(next as any)['/public/index.html']) {
      (next as any)['/public/index.html'] = `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Sandbox</title>\n  </head>\n  <body>\n    <div id="root"></div>\n  </body>\n</html>\n`;
    }
    if (!(next as any)['/styles.css']) {
      (next as any)['/styles.css'] = `/* default styles */\nhtml,body,#root{height:100%}\nbody{font-family:system-ui, sans-serif;margin:0;background:#0a0a0a;color:#e5e5e5}\n`;
    }
    // If no explicit index entry exists, create one that points to common app patterns
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
  }, [originalFiles]);

  const nodeboxFiles = useMemo(() => {
    const flattened: Record<string, string> = {};
    Object.entries(originalFiles ?? {}).forEach(([path, code]) => {
      if (typeof code !== 'string') {
        return;
      }
      const sanitized = path.replace(/^\/+/, '');
      if (!sanitized) {
        return;
      }
      flattened[sanitized] = code;
    });
    if (!flattened['package.json']) {
      flattened['package.json'] = JSON.stringify(
        {
          name: 'nodebox-app',
          private: true,
          version: '0.0.0',
          type: 'module',
        },
        null,
        2
      );
    }
    return flattened;
  }, [originalFiles]);

  const effectiveFiles = useMemo(() => {
    const files = { ...nodeboxFiles };
    const rawPkg = files['package.json'];
    try {
      const pkg = rawPkg ? JSON.parse(rawPkg) : { name: 'nodebox-app', private: true, version: '0.0.0' };
      pkg.scripts = pkg.scripts ?? {};
      const deps = (pkg.dependencies = pkg.dependencies ?? {});

      const hasNext = Boolean(deps.next) || Object.keys(files).some((p) => p.startsWith('pages/') || p.startsWith('app/'));
      const serverCandidates = [
        'server.mjs',
        'server.cjs',
        'server.js',
        'server.ts',
        'src/server.ts',
        'src/server.js',
        'api/index.ts',
        'api/index.js',
        'app/server.ts',
        'app/server.js',
        'functions/server.ts',
        'functions/server.js',
      ];
      const serverEntry = serverCandidates.find((c) => files[c]);
      const hasExpress = Boolean(deps.express);

      if (hasNext) {
        // Ensure minimal Next deps for Nodebox (SWC wasm) if not present
        if (!deps['@next/swc-wasm-nodejs']) {
          // Pin to version known to work in the browser runtime
          deps['@next/swc-wasm-nodejs'] = '12.1.6';
          if (!deps.next) {
            deps.next = '12.1.6';
          }
          if (!deps.react) {
            deps.react = '18.2.0';
          }
          if (!deps['react-dom']) {
            deps['react-dom'] = '18.2.0';
          }
        }
        if (!pkg.scripts.dev) {
          pkg.scripts.dev = 'next dev';
        }
        if (!pkg.scripts.start) {
          pkg.scripts.start = 'next start';
        }
        // Seed a minimal page if none provided
        const hasPages = Object.keys(files).some((p) => p.startsWith('pages/')) || Object.keys(files).some((p) => p.startsWith('app/'));
        if (!hasPages) {
          files['pages/index.jsx'] = `export default function Page(){return (<main style={{fontFamily:'system-ui, sans-serif',padding:24}}><h1>Next.js + Nodebox</h1><p>Diese Seite wurde automatisch erzeugt.</p></main>)}\n`;
        }
      } else if (hasExpress && serverEntry) {
        if (!pkg.scripts.start) {
          pkg.scripts.start = `node ${serverEntry}`;
        }
        if (!pkg.scripts.dev) {
          pkg.scripts.dev = pkg.scripts.start;
        }
      }

      files['package.json'] = JSON.stringify(pkg, null, 2);
    } catch {
      // If parsing fails, keep original raw package.json (already ensured above)
    }
    return files;
  }, [nodeboxFiles]);

  const packageJson = useMemo(() => {
    const raw = effectiveFiles['package.json'];
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn('[SandboxPlayground] Konnte package.json nicht parsen:', error);
      return null;
    }
  }, [effectiveFiles]);

  type NodeCommandConfig = {
    binary: string;
    args: string[];
    label: string;
    restartOnFsChange: boolean;
  };

  const nodeCommand = useMemo<NodeCommandConfig | null>(() => {
    const pkg = packageJson;
    const scripts = pkg?.scripts ?? {};

    const createScriptCommand = (name: string): NodeCommandConfig => ({
      binary: 'npm',
      args: ['run', name],
      label: `npm run ${name}`,
      restartOnFsChange: false,
    });

    if (typeof scripts.dev === 'string') {
      return createScriptCommand('dev');
    }

    if (typeof scripts.start === 'string') {
      return createScriptCommand('start');
    }

    if (typeof scripts.preview === 'string') {
      return createScriptCommand('preview');
    }

    const entryCandidates = [
      'server.mjs',
      'server.cjs',
      'server.js',
      'server.ts',
      'src/server.ts',
      'src/server.js',
      'api/index.ts',
      'api/index.js',
      'app/server.ts',
      'app/server.js',
      'functions/server.ts',
      'functions/server.js',
    ];

    const entry = entryCandidates.find((candidate) =>
      Object.prototype.hasOwnProperty.call(nodeboxFiles, candidate)
    );

    if (entry) {
      return {
        binary: 'node',
        args: [entry],
        label: `node ${entry}`,
        restartOnFsChange: true,
      };
    }

    return null;
  }, [nodeboxFiles, packageJson]);

  useEffect(() => {
    if (!runtimeIframeRef.current) {
      return;
    }

    const runtime = new Nodebox({
      iframe: runtimeIframeRef.current,
      runtimeUrl: 'https://nodebox-runtime.codesandbox.io',
    });

    nodeboxRef.current = runtime;
    let disposed = false;

    setNodeboxStatus('connecting');
    setNodeboxReady(false);
    setPreviewReady(false);
    setNodeboxError(null);

    runtime
      .connect()
      .then(() => {
        if (disposed) {
          return;
        }
        setNodeboxReady(true);
        setNodeboxStatus('syncing');
      })
      .catch((error: unknown) => {
        if (disposed) {
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        setNodeboxStatus('error');
        setNodeboxError(message);
      });

    return () => {
      disposed = true;
      setNodeboxReady(false);
      setCurrentPreviewUrl(null);
      setPreviewReady(false);
      initialRunCompletedRef.current = false;
      lastSyncedFilesRef.current = {};
      restartOnFsChangeRef.current = false;
      const shell = shellRef.current;
      if (shell && typeof shell.kill === 'function') {
        shell.kill().catch(() => undefined);
      }
      shellRef.current = null;
      activeProcessRef.current = null;
      nodeboxRef.current = null;
    };
  }, []);

  const syncNodeboxFs = useCallback(async () => {
    const runtime = nodeboxRef.current;
    if (!runtime) {
      return;
    }

    const files = effectiveFiles;
    const previous = lastSyncedFilesRef.current;
    const previousKeys = Object.keys(previous);
    const currentKeys = Object.keys(files);

    if (previousKeys.length === 0) {
      await runtime.fs.init(files);
      lastSyncedFilesRef.current = { ...files };
      return;
    }

    const currentSet = new Set(currentKeys);

    // Entfernte Dateien löschen
    for (const removed of previousKeys) {
      if (currentSet.has(removed)) {
        continue;
      }
      try {
        await runtime.fs.rm(removed, { force: true, recursive: true });
      } catch (error) {
        console.warn('[Nodebox] Entfernen fehlgeschlagen:', removed, error);
      }
    }

    // Geänderte oder neue Dateien schreiben
    for (const [path, content] of Object.entries(files)) {
      if (previous[path] === content) {
        continue;
      }
      const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
      if (dir) {
        try {
          await runtime.fs.mkdir(dir, { recursive: true });
        } catch (mkdirError) {
          // mkdir kann fehlschlagen, wenn das Verzeichnis bereits existiert
        }
      }
      await runtime.fs.writeFile(path, content);
    }

    lastSyncedFilesRef.current = { ...files };
  }, [nodeboxFiles]);

  const startNodeboxProcess = useCallback(async () => {
    const runtime = nodeboxRef.current;
    if (!runtime || !nodeCommand) {
      return;
    }
    if (!nodeboxPreviewRef.current) {
      return;
    }

    setNodeboxStatus('starting');
    setNodeboxError(null);
    setPreviewReady(false);
    setCurrentPreviewUrl(null);
    nodeboxPreviewRef.current.setAttribute('src', 'about:blank');

    if (shellRef.current && typeof shellRef.current.kill === 'function') {
      try {
        await shellRef.current.kill();
      } catch (error) {
        console.warn('[Nodebox] Konnte vorherigen Prozess nicht sauber beenden:', error);
      }
      shellRef.current = null;
    }

    const shell = runtime.shell.create();
    shellRef.current = shell;

    shell.stdout.on('data', (data: unknown) => {
      appendLog('stdout', data as string | Uint8Array);
    });
    shell.stderr.on('data', (data: unknown) => {
      appendLog('stderr', data as string | Uint8Array);
    });
    shell.on('exit', (code: number) => {
      appendLog('stdout', `↯ Prozess beendet (Exit Code ${code})`);
    });

    try {
      let process = await shell.runCommand(nodeCommand.binary, nodeCommand.args, {
        env: {
          PORT: '3000',
          HOSTNAME: '0.0.0.0',
        },
      });
      // Fallback: some Nodebox npm stubs support "npm dev" directly (docs example)
      if (!process && nodeCommand.binary === 'npm' && nodeCommand.args[0] === 'run' && nodeCommand.args[1] === 'dev') {
        appendLog('stdout', 'No process returned for "npm run dev", trying "npm dev" fallback…');
        process = await shell.runCommand('npm', ['dev'], {
          env: {
            PORT: '3000',
            HOSTNAME: '0.0.0.0',
          },
        });
      }

      activeProcessRef.current = process;
      setNodeboxStatus('starting');

      try {
        let preview: any = null;
        try {
          preview = await runtime.preview.getByShellId(process.id, 30000);
        } catch {
          // Fallback: try common dev ports
          const portsToTry = [3000, 3001, 5173, 8080];
          for (const port of portsToTry) {
            try {
              appendLog('stdout', `Waiting for preview on port ${port}…`);
              preview = await runtime.preview.waitForPort(port, 15000);
              if (preview) break;
            } catch {
              // continue
            }
          }
        }
        if (preview?.url) {
          setCurrentPreviewUrl(preview.url);
          if (nodeboxPreviewRef.current) {
            nodeboxPreviewRef.current.setAttribute('src', preview.url);
          }
          setPreviewReady(true);
          setNodeboxStatus('running');
        } else {
          throw new Error('Preview URL not found (shell + port probes failed)');
        }
      } catch (previewError) {
        const fallbackMessage = previewError instanceof Error ? previewError.message : String(previewError);
        appendLog('stderr', `⚠️ Vorschau konnte nicht geladen werden: ${fallbackMessage}`);
        setNodeboxError('Nodebox konnte keine Vorschau finden. Prüfe, ob dein Server einen Port öffnet.');
        setNodeboxStatus('error');
        setPreviewReady(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      appendLog('stderr', `❌ Start fehlgeschlagen: ${message}`);
      setNodeboxError(message);
      setNodeboxStatus('error');
      setPreviewReady(false);
    }
  }, [appendLog, nodeCommand]);

  useEffect(() => {
    restartOnFsChangeRef.current = nodeCommand?.restartOnFsChange ?? false;
    initialRunCompletedRef.current = false;
  }, [nodeCommand]);

  useEffect(() => {
    if (nodeCommand || !shellRef.current) {
      return;
    }
    const shell = shellRef.current;
    if (typeof shell.kill === 'function') {
      shell.kill().catch(() => undefined);
    }
    shellRef.current = null;
    activeProcessRef.current = null;
  }, [nodeCommand]);

  useEffect(() => {
    if (!nodeboxReady) {
      return;
    }

    if (!nodeCommand) {
      setNodeboxStatus('error');
      setNodeboxError('Kein Startskript gefunden. Lege in package.json ein "dev" oder "start" Skript an.');
      setPreviewReady(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        setNodeboxError(null);
        setNodeboxStatus('syncing');
        await syncNodeboxFs();
        if (cancelled) {
          return;
        }

        if (!initialRunCompletedRef.current) {
          await startNodeboxProcess();
          if (!cancelled) {
            initialRunCompletedRef.current = true;
          }
        } else if (restartOnFsChangeRef.current) {
          await startNodeboxProcess();
        } else {
          setNodeboxStatus('running');
          setPreviewReady(true);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        appendLog('stderr', `❌ Dateisynchronisation fehlgeschlagen: ${message}`);
        setNodeboxStatus('error');
        setNodeboxError(message);
        setPreviewReady(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [appendLog, nodeCommand, nodeboxReady, startNodeboxProcess, syncNodeboxFs]);

  const handleRestart = useCallback(async () => {
    if (!nodeboxReady || !nodeCommand) {
      return;
    }
    try {
      setNodeboxStatus('syncing');
      setNodeboxError(null);
      await syncNodeboxFs();
      initialRunCompletedRef.current = true;
      await startNodeboxProcess();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      appendLog('stderr', `❌ Neustart fehlgeschlagen: ${message}`);
      setNodeboxError(message);
      setNodeboxStatus('error');
      setPreviewReady(false);
    }
  }, [appendLog, nodeCommand, nodeboxReady, startNodeboxProcess, syncNodeboxFs]);

  const toggleLogs = useCallback(() => {
    setShowLogs((previous) => !previous);
  }, []);

  const clearLogs = useCallback(() => {
    setLogBuffer([]);
  }, []);

  const hasLogs = logBuffer.length > 0;
  const statusLabel = useMemo(() => {
    switch (nodeboxStatus) {
      case 'connecting':
        return 'Verbinde mit Nodebox…';
      case 'syncing':
        return 'Dateien synchronisieren…';
      case 'starting':
        return 'Starte Vorschau…';
      case 'running':
        return previewReady ? 'Nodebox läuft' : 'Vorschau wird geladen…';
      case 'error':
        return 'Fehler in der Nodebox-Vorschau';
      default:
        return 'Nodebox wird vorbereitet…';
    }
  }, [nodeboxStatus, previewReady]);

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
    <div className={"felixel-editor-tight h-full w-full p-0 m-0 " + (isFullscreen ? "fixed inset-0 z-[100] bg-[oklch(0.172 0 82.16)]" : "") } ref={previewContainerRef}>
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
        <SandboxTabs defaultValue="code" className="h-full p-0 rounded-2xl border border-[#1a1a1a] bg-[oklch(0.172 0 82.16)] text-neutral-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
          {/* Top bar */}
          <div className="h-[45px] flex items-center gap-2 px-2 border-b border-[#1a1a1a] bg-[oklch(0.172 0 82.16)]">
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
                <SandboxTabsTrigger value="preview" className="h-8 w-10 p-0 rounded-none text-neutral-400 data-[state=active]:text-white data-[state=active]:bg-[oklch(0.172 0 82.16)]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-icon lucide-eye">
                    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </SandboxTabsTrigger>
                <div className="h-8 w-px bg-white/10" />
                <SandboxTabsTrigger value="code" className="h-8 w-10 p-0 rounded-none text-neutral-400 data-[state=active]:text-white data-[state=active]:bg-[oklch(0.172 0 82.16)]">
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
                const iframe =
                  root.querySelector<HTMLIFrameElement>('#nodebox-preview-iframe') ??
                  root.querySelector<HTMLIFrameElement>('iframe:not(#nodebox-runtime-iframe)');
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
            <SandboxTabsContent value="preview" className="relative h-full">
              <div className="relative h-full w-full overflow-hidden rounded-b-2xl bg-[#0d0d0d]">
                <iframe
                  id="nodebox-preview-iframe"
                  ref={nodeboxPreviewRef}
                  title="Nodebox Preview"
                  className="h-full w-full border-0 bg-[#0d0d0d] text-left"
                  allow="accelerometer; ambient-light-sensor; autoplay; camera; encrypted-media; fullscreen; geolocation; gyroscope; magnetometer; microphone; midi; payment; usb; xr-spatial-tracking"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups allow-modals"
                />
                <iframe
                  id="nodebox-runtime-iframe"
                  ref={runtimeIframeRef}
                  title="Nodebox Runtime"
                  className="hidden"
                  src="about:blank"
                  aria-hidden="true"
                />
                {(!previewReady || nodeboxStatus === 'connecting' || nodeboxStatus === 'syncing' || nodeboxStatus === 'starting') && (
                  <div className="absolute inset-0 z-20 grid place-items-center bg-black/60 backdrop-blur-sm transition-opacity">
                    <div className="flex items-center gap-2 rounded-md border border-white/10 bg-black/70 px-3 py-2 text-neutral-200 shadow-inner">
                      <Loader size={16} className="animate-spin" />
                      <span className="text-sm font-medium">{statusLabel}</span>
                    </div>
                  </div>
                )}
                {nodeboxError && (
                  <div className="absolute inset-6 z-30 rounded-xl border border-red-500/50 bg-red-500/15 p-4 backdrop-blur">
                    <div className="flex items-start gap-3 text-sm text-red-100">
                      <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                      <div className="space-y-3">
                        <div>
                          <p className="font-medium tracking-wide text-red-100">Nodebox-Fehler</p>
                          <p className="mt-1 whitespace-pre-wrap break-words text-red-100/80">{nodeboxError}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border border-red-300/40 bg-red-400/10 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-red-100 transition hover:bg-red-400/20"
                            onClick={handleRestart}
                          >
                            <RotateCcw size={14} />
                            Erneut versuchen
                          </button>
                          {currentPreviewUrl && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-white transition hover:bg-white/10"
                              onClick={() => {
                                try {
                                  window.open(currentPreviewUrl, '_blank', 'noopener,noreferrer');
                                } catch (error) {
                                  console.error('Konnte Vorschau nicht öffnen', error);
                                }
                              }}
                            >
                              <ExternalLink size={14} />
                              Im Tab öffnen
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="pointer-events-none absolute top-3 right-3 z-40 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRestart}
                    title="Nodebox neu starten"
                    className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/60 text-neutral-200 transition hover:border-white/30 hover:text-white"
                  >
                    <RotateCcw size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={toggleLogs}
                    title={showLogs ? 'Logs ausblenden' : hasLogs ? 'Logs anzeigen' : 'Noch keine Logs'}
                    className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/60 text-neutral-200 transition hover:border-white/30 hover:text-white disabled:opacity-50"
                    disabled={!hasLogs && !showLogs}
                  >
                    <Terminal size={15} />
                  </button>
                </div>
                {showLogs && (
                  <div className="pointer-events-auto absolute bottom-3 right-3 z-40 w-[min(460px,calc(100%-24px))] max-h-[45%] overflow-hidden rounded-xl border border-white/10 bg-black/85 shadow-lg backdrop-blur">
                    <div className="flex items-center justify-between border-b border-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-neutral-300">
                      <span>Nodebox Logs</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={clearLogs}
                          className="rounded-md bg-white/5 px-2 py-1 text-[10px] font-semibold tracking-wide text-neutral-200 transition hover:bg-white/10"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={toggleLogs}
                          className="rounded-md bg-white/5 p-1 text-neutral-200 transition hover:bg-white/10"
                          aria-label="Logs schließen"
                        >
                          <ChevronRight size={12} className="transform rotate-90" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-[calc(100%-40px)] space-y-1 overflow-y-auto bg-black/60 px-3 py-2 font-mono text-[11px] leading-5 text-neutral-100">
                      {hasLogs ? (
                        logBuffer.slice(-120).map((entry, index) => (
                          <div
                            key={`${entry.type}-${index}-${entry.message.length}`}
                            className={entry.type === 'stderr' ? 'text-red-300' : 'text-emerald-300'}
                          >
                            {entry.message.trim() || ' '}
                          </div>
                        ))
                      ) : (
                        <div className="text-neutral-500">Noch keine Ausgaben.</div>
                      )}
                  </div>
                </div>
              )}
              </div>
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
