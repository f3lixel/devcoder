'use client';

import type {
  CodeEditorProps,
  PreviewProps,
  SandpackLayoutProps,
  SandpackProviderProps,
} from '@codesandbox/sandpack-react';
import {
  SandpackCodeEditor,
  SandpackConsole,
  SandpackFileExplorer,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from '@codesandbox/sandpack-react';
import type {
  ButtonHTMLAttributes,
  ComponentProps,
  HTMLAttributes,
  ReactNode,
} from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import {
  Archive,
  Book,
  Braces,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Database,
  File as FileIcon,
  FileCode,
  FileJson,
  FileText,
  Folder as FolderIcon,
  FolderOpen,
  GitCommitVertical,
  Key,
  Lock,
  FileType2,
  Package,
  Palette,
  Settings,
  Shield,
  Terminal,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FileTreeIcon } from '@/components/filetree/FileTreeIcon';

export type SandboxProviderProps = SandpackProviderProps & { className?: string };

export const SandboxProvider = ({
  className,
  children,
  ...props
}: SandboxProviderProps): ReactNode => (
  <div className={cn('size-full', className)}>
    <SandpackProvider className="!size-full !max-h-none" {...props}>
      {children}
    </SandpackProvider>
  </div>
);

export type SandboxLayoutProps = SandpackLayoutProps;

export const SandboxLayout = ({
  className,
  ...props
}: SandboxLayoutProps): ReactNode => (
  <SandpackLayout
    className={cn(
      '!rounded-none !border-none !bg-transparent !h-full',
      className
    )}
    {...props}
  />
);

export type SandboxTabsContextValue = {
  selectedTab: string | undefined;
  setSelectedTab: (value: string) => void;
};

const SandboxTabsContext = createContext<SandboxTabsContextValue | undefined>(
  undefined
);

const useSandboxTabsContext = () => {
  const context = useContext(SandboxTabsContext);

  if (!context) {
    throw new Error(
      'SandboxTabs components must be used within a SandboxTabsProvider'
    );
  }

  return context;
};

export type SandboxTabsProps = HTMLAttributes<HTMLDivElement> & {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
};

export const SandboxTabs = ({
  className,
  defaultValue,
  value,
  onValueChange,
  ...props
}: SandboxTabsProps): ReactNode => {
  const [selectedTab, setSelectedTabState] = useState(value || defaultValue);

  useEffect(() => {
    if (value !== undefined) {
      setSelectedTabState(value);
    }
  }, [value]);

  const setSelectedTab = useCallback(
    (newValue: string) => {
      if (value === undefined) {
        setSelectedTabState(newValue);
      }
      onValueChange?.(newValue);
    },
    [value, onValueChange]
  );

  return (
    <SandboxTabsContext.Provider value={{ selectedTab, setSelectedTab }}>
      <div
        className={cn(
          'group relative flex size-full flex-col overflow-hidden rounded-lg border text-sm',
          className
        )}
        {...props}
        data-selected={selectedTab}
      >
        {props.children}
      </div>
    </SandboxTabsContext.Provider>
  );
};

export type SandboxTabsListProps = HTMLAttributes<HTMLDivElement>;

export const SandboxTabsList = ({
  className,
  ...props
}: SandboxTabsListProps): ReactNode => {
  // Render a right-aligned status strip using Sandpack context
  const sandpackCtx = (() => {
    try {
      // Using hook only in render of this component
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useSandpack();
    } catch {
      return undefined;
    }
  })();

  const isRunning = Boolean(sandpackCtx?.sandpack?.status === 'running');
  const hasError = Boolean((sandpackCtx as any)?.sandpack?.error);

  return (
    <div
      className={cn(
        'inline-flex w-full shrink-0 items-center justify-between border-b bg-secondary p-2 text-muted-foreground',
        className
      )}
      role="tablist"
      {...props}
    >
      <div className="flex items-center gap-1">
        {props.children}
      </div>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <StatusBadge status={isRunning ? 'running' : hasError ? 'error' : 'idle'} label={isRunning ? 'Preview läuft' : hasError ? 'Preview Fehler' : 'Preview bereit'} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">Vorschau-Status</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

export type SandboxTabsTriggerProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick'
> & {
  value: string;
};

export const SandboxTabsTrigger = ({
  className,
  value,
  ...props
}: SandboxTabsTriggerProps): ReactNode => {
  const { selectedTab, setSelectedTab } = useSandboxTabsContext();

  const handleClick = useCallback(() => {
    setSelectedTab(value);
  }, [setSelectedTab, value]);

  const label = value === 'preview' ? 'Preview (Alt+P)' : value === 'code' ? 'Code (Alt+C)' : value === 'console' ? 'Console (Alt+L)' : value;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-selected={selectedTab === value}
          title={label}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 font-medium text-sm ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow',
            className
          )}
          data-state={selectedTab === value ? 'active' : 'inactive'}
          onClick={handleClick}
          role="tab"
          {...props}
        />
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
};

export type SandboxTabsContentProps = HTMLAttributes<HTMLDivElement> & {
  value: string;
};

export const SandboxTabsContent = ({
  className,
  value,
  ...props
}: SandboxTabsContentProps): ReactNode => {
  const { selectedTab } = useSandboxTabsContext();

  return (
    <div
      aria-hidden={selectedTab !== value}
      className={cn(
        'overflow-y-auto ring-offset-background transition-opacity duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        selectedTab === value
          ? 'flex-1 h-full w-full opacity-100'
          : 'flex-none pointer-events-none absolute h-0 w-0 opacity-0',
        className
      )}
      data-state={selectedTab === value ? 'active' : 'inactive'}
      role="tabpanel"
      {...props}
    />
  );
};

export type SandboxCodeEditorProps = CodeEditorProps;

export const SandboxCodeEditor = ({
  showTabs = false,
  ...props
}: SandboxCodeEditorProps): ReactNode => {
  return (
    <SandpackCodeEditor
      showTabs={showTabs}
      {...props}
    />
  );
};

// Editor Tabs with icons (Iconify for files, Lucide for folders)
export const SandboxEditorTabs = ({ className }: { className?: string }): ReactNode => {
  const { sandpack } = useSandpack();

  const openFiles = (sandpack as any)?.openFiles as string[] | undefined;
  const activeFile = sandpack.activeFile as string | undefined;

  const files = openFiles && openFiles.length > 0 ? openFiles : activeFile ? [activeFile] : [];

  const onSelect = (path: string) => {
    sandpack.openFile(path);
  };

  const onClose = (path: string) => {
    const closeFile = (sandpack as any)?.closeFile as ((p: string) => void) | undefined;
    if (closeFile) closeFile(path);
  };

  return (
    <div className={cn('flex items-center gap-1 px-2 py-1 border-b border-border bg-secondary/60', className)}>
      {files.map((path) => {
        const name = path.split('/').filter(Boolean).pop() || path;
        const isActive = path === activeFile;
        return (
          <button
            key={path}
            type="button"
            onClick={() => onSelect(path)}
            className={cn(
              'group inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs',
              'hover:bg-secondary/80',
              isActive ? 'bg-background text-foreground shadow-inner' : 'text-foreground/80'
            )}
            title={path}
          >
            <FileTreeIcon name={name} className="shrink-0" />
            <span className="truncate max-w-[160px] text-left">{name}</span>
            <span
              role="button"
              aria-label={`Close ${name}`}
              className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded hover:bg-foreground/10 text-foreground/60"
              onClick={(e) => { e.stopPropagation(); onClose(path); }}
            >
              ×
            </span>
          </button>
        );
      })}
    </div>
  );
};

// Breadcrumbs with icons for the active file
export const SandboxEditorBreadcrumbs = ({ className }: { className?: string }): ReactNode => {
  const { sandpack } = useSandpack();
  const active = sandpack.activeFile as string | undefined;
  const parts = (active || '/').split('/').filter(Boolean);

  return (
    <div className={cn('flex items-center gap-2 px-2 py-1 text-xs text-foreground/80 border-b border-border bg-secondary/40', className)}>
      {parts.length === 0 ? (
        <span className="text-foreground/60">/</span>
      ) : (
        parts.map((seg, idx) => {
          const isLast = idx === parts.length - 1;
          const name = seg;
          return (
            <div key={idx} className="inline-flex items-center gap-1 min-w-0">
              {idx > 0 && <span className="text-foreground/40">/</span>}
              {isLast ? (
                <>
                  <FileTreeIcon name={name} className="shrink-0" />
                  <span className="truncate max-w-[220px]">{name}</span>
                </>
              ) : (
                <>
                  {/* folder segment */}
                  <FileTreeIcon name={name} isDir className="shrink-0" />
                  <span className="truncate max-w-[180px]">{name}</span>
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export type SandboxConsoleProps = Parameters<typeof SandpackConsole>[0];

export const SandboxConsole = ({
  className,
  ...props
}: SandboxConsoleProps): ReactNode => (
  <SandpackConsole className={cn('h-full', className)} {...props} />
);

export type SandboxPreviewProps = PreviewProps & {
  className?: string;
};

export const SandboxPreview = ({
  className,
  showOpenInCodeSandbox = false,
  ...props
}: SandboxPreviewProps): ReactNode => (
  <SandpackPreview
    className={cn('h-full w-full', className)}
    showOpenInCodeSandbox={showOpenInCodeSandbox}
    {...props}
  />
);

export type SandboxFileExplorerProps = ComponentProps<
  typeof SandpackFileExplorer
>;

export const SandboxFileExplorer = ({
  autoHiddenFiles = true,
  className,
  ...props
}: SandboxFileExplorerProps): ReactNode => (
  <SandpackFileExplorer
    autoHiddenFiles={autoHiddenFiles}
    className={cn('h-full', className)}
    {...props}
  />
);

// Custom: File Explorer with Lucide icons
type TreeNode = {
  name: string;
  path: string;
  children?: Record<string, TreeNode>;
  isDir: boolean;
};

const buildTree = (files: Record<string, any>): TreeNode => {
  const root: TreeNode = { name: '', path: '/', children: {}, isDir: true };
  Object.keys(files).forEach((fullPath) => {
    const parts = fullPath.split('/').filter(Boolean);
    let curr = root;
    let acc = '';
    parts.forEach((part, idx) => {
      acc += '/' + part;
      const isLast = idx === parts.length - 1;
      const isDir = !isLast && true;
      curr.children = curr.children || {};
      if (!curr.children[part]) {
        curr.children[part] = {
          name: part,
          path: acc,
          children: isLast ? undefined : {},
          isDir: isDir,
        };
      }
      curr = curr.children[part];
    });
  });
  return root;
};

// Helpers for file icon detection
const getExt = (name: string): string => {
  const lower = name.toLowerCase();
  // handle double extensions like .d.ts, .test.tsx, .module.css -> take the last one for icon
  const parts = lower.split('.');
  if (parts.length <= 1) return '';
  return '.' + parts[parts.length - 1];
};

const iconByFilename = (name: string): string | undefined => {
  const n = name.toLowerCase();
  // packages and locks
  if (n === 'package.json') return 'package';
  if (n === 'package-lock.json' || n === 'yarn.lock' || n === 'pnpm-lock.yaml') return 'lock';
  // docs
  if (n === 'readme' || n === 'readme.md' || n === 'changelog.md' || n === 'license') return 'book';
  // env & git
  if (n.startsWith('.env')) return 'key';
  if (n.startsWith('.git')) return 'git-commit';
  // config files
  if (n === 'tsconfig.json' || n === 'jsconfig.json') return 'settings';
  if (n.startsWith('.eslintrc')) return 'settings';
  if (n.startsWith('.prettierrc')) return 'settings';
  if (n === '.editorconfig') return 'settings';
  if (n === '.npmrc' || n === '.nvmrc') return 'settings';
  if (n === 'dockerfile' || n.startsWith('docker-compose')) return 'settings';
  return undefined;
};

const iconByExt = (ext: string): string | undefined => {
  switch (ext) {
    // docs/markdown
    case '.md':
    case '.markdown':
      return 'markdown';
    // data/config
    case '.json':
    case '.jsonc':
      return 'json';
    case '.yml':
    case '.yaml':
      return 'file';
    case '.toml':
    case '.ini':
      return 'settings';
    // markup/styles
    case '.html':
    case '.htm':
      return 'file-code';
    case '.xml':
      return 'file-code';
    case '.css':
    case '.scss':
    case '.sass':
    case '.less':
    case '.styl':
      return 'palette';
    // code
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
    case '.ts':
    case '.tsx':
    case '.vue':
    case '.svelte':
    case '.py':
    case '.rb':
    case '.php':
    case '.java':
    case '.c':
    case '.cpp':
    case '.h':
    case '.hpp':
    case '.go':
    case '.rs':
    case '.cs':
    case '.kt':
    case '.swift':
    case '.scala':
      return 'file-code';
    // scripts
    case '.sh':
    case '.bash':
    case '.zsh':
    case '.bat':
    case '.cmd':
    case '.ps1':
      return 'terminal';
    // database / queries / data
    case '.sql':
      return 'database';
    case '.csv':
    case '.tsv':
      return 'file-text';
    // text/docs
    case '.txt':
    case '.log':
      return 'file-text';
    case '.pdf':
      return 'file';
    // images/media
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.svg':
    case '.webp':
    case '.ico':
    case '.bmp':
    case '.tiff':
      return 'file';
    // video/audio
    case '.mp4':
    case '.webm':
    case '.mov':
    case '.avi':
    case '.mkv':
    case '.mp3':
    case '.wav':
    case '.flac':
    case '.ogg':
      return 'file';
    // archives
    case '.zip':
    case '.tar':
    case '.gz':
    case '.tgz':
    case '.rar':
    case '.7z':
      return 'archive';
    // locks/keys
    case '.lock':
      return 'lock';
  }
  return undefined;
};

const iconByFolderName = (name: string, open: boolean): string => {
  const n = name.toLowerCase();
  // Keep base folder icons for consistency; reserved for future special cases
  switch (n) {
    case 'node_modules':
      return open ? 'folder-open' : 'folder';
    case 'src':
    case 'lib':
    case 'public':
    case 'assets':
    case 'styles':
    case 'config':
    case 'scripts':
    case 'tests':
    case '__tests__':
      return open ? 'folder-open' : 'folder';
    default:
      return open ? 'folder-open' : 'folder';
  }
};

const codiconFor = (node: TreeNode, open: boolean): string => {
  if (node.isDir) return iconByFolderName(node.name, open);

  const name = node.name.toLowerCase();
  const byName = iconByFilename(name);
  if (byName) return byName;
  const byExt = iconByExt(getExt(name));
  if (byExt) return byExt;
  return 'file';
};

// Map string keys to Lucide components
const renderLucide = (name: string, open?: boolean): ReactNode => {
  const size = 16;
  switch (name) {
    case 'package':
      return <Package size={size} />;
    case 'lock':
      return <Lock size={size} />;
    case 'book':
      return <Book size={size} />;
    case 'key':
      return <Key size={size} />;
    case 'git-commit':
      return <GitCommitVertical size={size} />;
    case 'settings':
      return <Settings size={size} />;
    case 'markdown':
      return <FileType2 size={size} />;
    case 'json':
      return <FileJson size={size} />;
    case 'file-code':
      return <FileCode size={size} />;
    case 'palette':
      return <Palette size={size} />;
    case 'terminal':
      return <Terminal size={size} />;
    case 'database':
      return <Database size={size} />;
    case 'file-text':
      return <FileText size={size} />;
    case 'archive':
      return <Archive size={size} />;
    case 'folder-open':
      return <FolderOpen size={size} />;
    case 'folder':
      return <FolderIcon size={size} />;
    case 'file':
    default:
      return <FileIcon size={size} />;
  }
};

export type CodiconFileExplorerProps = {
  className?: string;
};

export const CodiconFileExplorer = ({ className }: CodiconFileExplorerProps): ReactNode => {
  const { sandpack } = useSandpack();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ '/': true });

  const tree = buildTree(sandpack.files);

  const toggle = useCallback((p: string) => {
    setExpanded((prev) => ({ ...prev, [p]: !prev[p] }));
  }, []);

  const openFile = useCallback((p: string) => {
    sandpack.openFile(p);
  }, [sandpack]);

  const renderNode = (node: TreeNode) => {
    const isOpen = !!expanded[node.path];
    const iconClass = codiconFor(node, isOpen);
    const isActive = sandpack.activeFile === node.path;
    const hasChildren = !!node.children && Object.keys(node.children).length > 0;

    if (node.path !== '/' && !node.isDir) {
      return (
        <Tooltip key={node.path}>
          <TooltipTrigger asChild>
            <li className={cn('px-0 py-1 text-sm cursor-pointer flex items-center gap-2 rounded-md hover:bg-secondary/50 transition-[transform,background] will-change-transform motion-safe:hover:translate-x-[1px]', isActive && 'bg-secondary/70 text-foreground')}
                onClick={() => openFile(node.path)}>
              <FileTreeIcon name={node.name} className="text-foreground/80" />
              <span className="truncate">{node.name}</span>
            </li>
          </TooltipTrigger>
          <TooltipContent side="right">{node.path}</TooltipContent>
        </Tooltip>
      );
    }

    if (node.path !== '/' && node.isDir) {
      return (
        <li key={node.path} className="px-0 py-1 text-sm">
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => toggle(node.path)}>
            <FileTreeIcon name={node.name} isDir isOpen={isOpen} className="text-foreground/80" />
            <span className="font-medium">{node.name}</span>
          </div>
          {isOpen && hasChildren && (
            <ul className="mt-1 ml-4 space-y-0.5">
              {Object.values(node.children!).sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name)).map((child) => (
                <div key={child.path}>{renderNode(child)}</div>
              ))}
            </ul>
          )}
        </li>
      );
    }

    // root
    return (
      <ul className={cn('h-full overflow-auto px-2 py-2 m-0 list-none space-y-0.5', className)}>
        {node.children && Object.values(node.children)
          .sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name))
          .map((child) => (
            <div key={child.path}>{renderNode(child)}</div>
          ))}
      </ul>
    );
  };

  return (
    <div className={cn('h-full', className)}>
      {renderNode(tree)}
    </div>
  );
};
