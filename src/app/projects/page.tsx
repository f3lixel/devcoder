'use client';

import ResizableSplit from "@/components/ResizableSplit";
import AssistantChat from "@/components/AssistantChat";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { LayoutDashboard, Settings } from "lucide-react";
import dynamic from "next/dynamic";
import { useViewMode } from "@/components/view-mode-context";
import { Suspense, useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { SandpackProviderProps } from "@codesandbox/sandpack-react";

const DEFAULT_STORAGE_KEY = 'sandbox:react:session:v1';

const defaultFiles: SandpackProviderProps['files'] = {
  '/App.js': `import React, { useState } from 'react';
import './styles.css';

export default function App() {
  const [count, setCount] = useState(0);
  
  return (
    <div className="App">
      <h1>React + Sandpack</h1>
      <p>Counter: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
`,
  '/index.js': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
  '/styles.css': `.App {
  font-family: system-ui, sans-serif;
  text-align: center;
  padding: 2rem;
}

button {
  background: #0070f3;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
}

button:hover {
  background: #0051cc;
}
`,
  '/public/index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`,
};

export default function Home() {
  return (
    <Suspense fallback={<div>Loading project...</div>}>
      <HomeContent />
    </Suspense>
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

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(files));
    } catch {}
  }, [files, storageKey]);

  const handleNewFiles = useCallback((newFiles: Array<{ path: string; content: string }>) => {
    const updatedFiles = { ...files };
    let firstPath: string | undefined;
    newFiles.forEach(file => {
      const normalizedPath = file.path.startsWith('/') ? file.path : `/${file.path}`;
      if (!firstPath) firstPath = normalizedPath;
      updatedFiles[normalizedPath] = file.content;
    });
    setFiles(updatedFiles);
    // Focus the first created/modified file in the editor
    if (firstPath) {
      const content = typeof updatedFiles[firstPath] === 'string' 
        ? updatedFiles[firstPath] as string 
        : (updatedFiles[firstPath] as any)?.code || '';
      setCurrentFile({ path: firstPath, content });
    } else if (currentFile && updatedFiles[currentFile.path]) {
      // Otherwise keep current file in sync if it changed
      setCurrentFile({
        path: currentFile.path, 
        content: typeof updatedFiles[currentFile.path] === 'string' 
          ? updatedFiles[currentFile.path] as string 
          : (updatedFiles[currentFile.path] as any)?.code || ''
      });
    }
  }, [files, currentFile]);

  const handleFileChange = useCallback((path: string, code: string) => {
    setFiles(prevFiles => ({
      ...prevFiles,
      [path]: code,
    }));
    // Update current file if it's the one being edited
    if (currentFile?.path === path) {
      setCurrentFile({ path, content: code });
    }
  }, [currentFile]);

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

  return (
    <ResizableSplit
      initialPercentLeft={40}
      minPercentLeft={20}
      left={
        <div className="h-full p-3 pr-[35px] flex gap-3">
          <Sidebar>
            <SidebarBody className="justify-between gap-10">
              <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                <div className="mt-2 flex flex-col gap-2">
                  {[{ label: "go to dashboard", href: "/", icon: (<LayoutDashboard className="text-neutral-300 h-5 w-5" />) },
                    { label: "Settings", href: "#", icon: (<Settings className="text-neutral-300 h-5 w-5" />) }].map((link, idx) => (
                    <SidebarLink key={idx} link={link as any} />
                  ))}
                </div>
              </div>
            </SidebarBody>
          </Sidebar>
          <div className="h-full flex-1 min-w-0 rounded-2xl">
            <Suspense fallback={null}>
              {/* Neue Assistant-Chat-Komponente */}
              <AssistantChat
                onNewFiles={handleNewFiles}
                onRunCommand={handleRunCommand}
                files={files}
                currentFile={currentFile}
                terminalOutput={terminalOutput}
                onFocusFile={handleFileSelect}
              />
            </Suspense>
          </div>
        </div>
      }
      right={
        <div className="h-full pl-0 pr-0">
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