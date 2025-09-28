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
}: SandboxTabsListProps): ReactNode => (
  <div
    className={cn(
      'inline-flex w-full shrink-0 items-center justify-start border-b bg-secondary p-2 text-muted-foreground',
      className
    )}
    role="tablist"
    {...props}
  />
);

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

  return (
    <button
      aria-selected={selectedTab === value}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 font-medium text-sm ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow',
        className
      )}
      data-state={selectedTab === value ? 'active' : 'inactive'}
      onClick={handleClick}
      role="tab"
      {...props}
    />
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
        'flex-1 overflow-y-auto ring-offset-background transition-opacity duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        selectedTab === value
          ? 'h-auto w-auto opacity-100'
          : 'pointer-events-none absolute h-0 w-0 opacity-0',
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
    className={cn('h-full', className)}
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

// Custom: Codicon-based File Explorer mirroring Windsurf/VS Code explorer icons
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
  if (n === 'package.json') return 'codicon-symbol-package';
  if (n === 'package-lock.json' || n === 'yarn.lock' || n === 'pnpm-lock.yaml') return 'codicon-lock';
  // docs
  if (n === 'readme' || n === 'readme.md' || n === 'changelog.md' || n === 'license') return 'codicon-book';
  // env & git
  if (n.startsWith('.env')) return 'codicon-key';
  if (n.startsWith('.git')) return 'codicon-git-commit';
  // config files
  if (n === 'tsconfig.json' || n === 'jsconfig.json') return 'codicon-gear';
  if (n.startsWith('.eslintrc')) return 'codicon-gear';
  if (n.startsWith('.prettierrc')) return 'codicon-gear';
  if (n === '.editorconfig') return 'codicon-gear';
  if (n === '.npmrc' || n === '.nvmrc') return 'codicon-gear';
  if (n === 'dockerfile' || n.startsWith('docker-compose')) return 'codicon-gear';
  return undefined;
};

const iconByExt = (ext: string): string | undefined => {
  switch (ext) {
    // docs/markdown
    case '.md':
    case '.markdown':
      return 'codicon-markdown';
    // data/config
    case '.json':
    case '.jsonc':
      return 'codicon-json';
    case '.yml':
    case '.yaml':
      return 'codicon-file';
    case '.toml':
    case '.ini':
      return 'codicon-gear';
    // markup/styles
    case '.html':
    case '.htm':
      return 'codicon-file-code';
    case '.xml':
      return 'codicon-file-code';
    case '.css':
    case '.scss':
    case '.sass':
    case '.less':
    case '.styl':
      return 'codicon-symbol-color';
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
      return 'codicon-file-code';
    // scripts
    case '.sh':
    case '.bash':
    case '.zsh':
    case '.bat':
    case '.cmd':
    case '.ps1':
      return 'codicon-terminal';
    // database / queries / data
    case '.sql':
      return 'codicon-database';
    case '.csv':
    case '.tsv':
      return 'codicon-table';
    // text/docs
    case '.txt':
    case '.log':
      return 'codicon-file-text';
    case '.pdf':
      return 'codicon-file';
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
      return 'codicon-file';
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
      return 'codicon-file';
    // archives
    case '.zip':
    case '.tar':
    case '.gz':
    case '.tgz':
    case '.rar':
    case '.7z':
      return 'codicon-archive';
    // locks/keys
    case '.lock':
      return 'codicon-lock';
  }
  return undefined;
};

const iconByFolderName = (name: string, open: boolean): string => {
  const n = name.toLowerCase();
  // Keep base folder icons for consistency; reserved for future special cases
  switch (n) {
    case 'node_modules':
      return open ? 'codicon-folder-opened' : 'codicon-folder';
    case 'src':
    case 'lib':
    case 'public':
    case 'assets':
    case 'styles':
    case 'config':
    case 'scripts':
    case 'tests':
    case '__tests__':
      return open ? 'codicon-folder-opened' : 'codicon-folder';
    default:
      return open ? 'codicon-folder-opened' : 'codicon-folder';
  }
};

const codiconFor = (node: TreeNode, open: boolean): string => {
  if (node.isDir) return iconByFolderName(node.name, open);

  const name = node.name.toLowerCase();
  const byName = iconByFilename(name);
  if (byName) return byName;
  const byExt = iconByExt(getExt(name));
  if (byExt) return byExt;
  return 'codicon-file';
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
        <li key={node.path} className={cn('px-2 py-1 text-sm cursor-pointer flex items-center gap-2 rounded-md hover:bg-secondary/50', isActive && 'bg-secondary/70 text-foreground')}
            onClick={() => openFile(node.path)}>
          <i className={cn('codicon', iconClass, 'text-[16px] leading-none')} aria-hidden />
          <span className="truncate">{node.name}</span>
        </li>
      );
    }

    if (node.path !== '/' && node.isDir) {
      return (
        <li key={node.path} className="px-2 py-1 text-sm">
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => toggle(node.path)}>
            <i className={cn('codicon', iconClass, 'text-[16px] leading-none')} aria-hidden />
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
      <ul className={cn('h-full overflow-auto p-2 space-y-0.5', className)}>
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
