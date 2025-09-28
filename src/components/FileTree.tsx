"use client";

import React from "react";
import { ChevronDown, ChevronRight, File, Folder, FolderOpen, Code, Braces, Image as ImageIcon, Package, Settings, BookText, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export type FileNode = {
  type: "file" | "folder";
  name: string;
  path: string;
  children?: FileNode[];
};

function fileIcon(name: string): { el: React.ReactNode; className?: string } {
  const lower = name.toLowerCase();
  const ext = lower.split(".").pop() || "";
  // special file names
  if (lower === "package.json") return { el: <Package size={16} />, className: "text-amber-400" };
  if (lower === "readme.md") return { el: <BookText size={16} />, className: "text-purple-300" };
  if (lower.startsWith(".env")) return { el: <Settings size={16} />, className: "text-zinc-400" };
  if (lower === ".gitignore") return { el: <Settings size={16} />, className: "text-zinc-400" };

  switch (ext) {
    case "ts":
    case "tsx":
      return { el: <Code size={16} />, className: "text-sky-400" };
    case "js":
    case "jsx":
      return { el: <Code size={16} />, className: "text-yellow-300" };
    case "json":
      return { el: <Braces size={16} />, className: "text-emerald-400" };
    case "css":
      return { el: <FileText size={16} />, className: "text-pink-400" };
    case "html":
      return { el: <Code size={16} />, className: "text-orange-400" };
    case "md":
    case "mdx":
      return { el: <BookText size={16} />, className: "text-purple-300" };
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
      return { el: <ImageIcon size={16} />, className: "text-teal-300" };
    default:
      return { el: <File size={16} />, className: "text-zinc-400" };
  }
}

type FileTreeProps = {
  tree: FileNode[];
  selectedPath?: string;
  onSelectFile?: (node: FileNode) => void;
  className?: string;
};

export default function FileTree({ tree, selectedPath, onSelectFile, className }: FileTreeProps) {
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());

  const toggle = React.useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  return (
    <div
      className={cn(
        "h-full w-full overflow-y-auto bg-[#0b0b10]/80 backdrop-blur-xl border-r border-white/10",
        "[mask-image:linear-gradient(to_bottom,black,black,transparent_98%)]",
        className
      )}
    >
      <div className="p-2">
        {tree.map((node) => (
          <TreeItem
            key={node.path}
            node={node}
            depth={0}
            expanded={expanded}
            onToggle={toggle}
            onSelectFile={onSelectFile}
            selectedPath={selectedPath}
          />
        ))}
      </div>
    </div>
  );
}

function TreeItem({
  node,
  depth,
  expanded,
  onToggle,
  onSelectFile,
  selectedPath,
}: {
  node: FileNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelectFile?: (node: FileNode) => void;
  selectedPath?: string;
}) {
  const isFolder = node.type === "folder";
  const isOpen = isFolder && expanded.has(node.path);
  const isSelected = node.path === selectedPath;

  const fileMeta = !isFolder ? fileIcon(node.name) : null;

  return (
    <div>
      <button
        type="button"
        className={cn(
          "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
          "hover:bg-cyan-400/10 hover:text-cyan-200",
          isSelected && "bg-cyan-400/15 text-cyan-100 ring-1 ring-cyan-400/30",
          "transition-colors"
        )}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => {
          if (isFolder) onToggle(node.path);
          else onSelectFile?.(node);
        }}
      >
        {isFolder ? (
          <span className="flex items-center text-cyan-300/80">
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        ) : (
          <span className="w-4" />
        )}

        <span className="flex items-center gap-2 text-[13px] text-zinc-300 group-hover:text-cyan-100">
          {isFolder ? (
            isOpen ? <FolderOpen size={16} className="text-cyan-300/80" /> : <Folder size={16} className="text-cyan-300/80" />
          ) : (
            <span className={cn(fileMeta?.className)}>{fileMeta?.el}</span>
          )}
          <span className="truncate">{node.name}</span>
        </span>
      </button>

      {isFolder && isOpen && node.children && node.children.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onSelectFile={onSelectFile}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}


