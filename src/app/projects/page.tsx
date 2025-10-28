'use client';

import ResizableSplit from "@/components/ResizableSplit";
import ProjectsSidebar from "@/components/ProjectsSidebar";
import dynamic from "next/dynamic";
import { useViewMode } from "@/components/view-mode-context";
import { Suspense, useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { SandpackProviderProps } from "@codesandbox/sandpack-react";
const SandboxPlayground = dynamic(() => import("@/components/SandboxPlayground"), { ssr: false });
import { NewAIChat } from "@/components/NewAIChat";

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
    <div className="h-[100vh] w-full overflow-hidden flex" style={{backgroundColor: "rgba(0, 0, 3, 1)"}}>
      <div className="shrink-0">
        <ProjectsSidebar />
      </div>
      <div className="flex-1 min-w-0">
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

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(files));
    } catch {}
  }, [files, storageKey]);

  const handleNewFiles = useCallback((newFiles: Array<{ path: string; content: string }>) => {
    let firstPath: string | undefined;
    let firstContent: string | undefined;
    setFiles(prevFiles => {
      const next = { ...prevFiles } as SandpackProviderProps['files'];
      newFiles.forEach(file => {
        const normalizedPath = file.path.startsWith('/') ? file.path : `/${file.path}`;
        if (!firstPath) {
          firstPath = normalizedPath;
          firstContent = file.content;
        }
        next[normalizedPath] = file.content;
      });
      return next;
    });
    // Focus the first created/modified file in the editor using the incoming content (avoids race)
    if (firstPath && typeof firstContent === 'string') {
      setCurrentFile({ path: firstPath, content: firstContent });
    }
  }, [setFiles]);

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
      initialPercentLeft={30}
      minPercentLeft={20}
      left={
        <div className="h-full p-3 pr-2 flex pt-16 pb-0">
          <div className="h-full flex-1 min-w-0 rounded-2xl overflow-hidden">
            <Suspense fallback={null}>
              {/* New AI Chat Interface */}
              <NewAIChat
                onNewFiles={handleNewFiles}
                onRunCommand={handleRunCommand}
                files={files}
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