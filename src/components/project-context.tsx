"use client";

import * as React from "react";

type ProjectContextValue = {
  projectName: string | null;
  setProjectName: (name: string | null) => void;
};

const ProjectContext = React.createContext<ProjectContextValue | undefined>(undefined);

export function useProject() {
  const ctx = React.useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projectName, setProjectName] = React.useState<string | null>(null);
  const value = React.useMemo(() => ({ projectName, setProjectName }), [projectName]);
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}


