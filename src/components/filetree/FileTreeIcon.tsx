"use client";
import { Icon } from "@iconify/react";
import { Folder, FolderOpen } from "lucide-react";

type Props = {
  name: string;
  isDir?: boolean;
  isOpen?: boolean;
  className?: string;
};

const iconMap: Record<string, string> = {
  ts: "vscode-icons:file-type-typescript",
  tsx: "vscode-icons:file-type-reactts",
  js: "vscode-icons:file-type-js",
  jsx: "vscode-icons:file-type-reactjs",
  json: "vscode-icons:file-type-json",
  css: "vscode-icons:file-type-css",
  scss: "vscode-icons:file-type-scss",
  html: "vscode-icons:file-type-html",
  md: "vscode-icons:file-type-markdown",
  png: "vscode-icons:file-type-image",
  jpg: "vscode-icons:file-type-image",
  jpeg: "vscode-icons:file-type-image",
  svg: "vscode-icons:file-type-svg",
  env: "vscode-icons:file-type-dotenv",
  lock: "vscode-icons:file-type-lock",
  yml: "vscode-icons:file-type-yaml",
  yaml: "vscode-icons:file-type-yaml",
  default: "vscode-icons:file-type-code",
};

export function FileTreeIcon({ name, isDir, isOpen, className }: Props) {
  if (isDir) {
    const IconComponent = isOpen ? FolderOpen : Folder;
    return <IconComponent className={`w-4 h-4 text-foreground/80 ${className || ""}`} />;
  }

  const ext = name.split(".").pop() || "default";
  const icon = iconMap[ext] || iconMap.default;

  return <Icon icon={icon} className={`w-4 h-4 text-foreground/80 ${className || ""}`} />;
}


