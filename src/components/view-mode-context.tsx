"use client";

import React from "react";

export type ViewMode = "live preview" | "editor";

type ViewModeContextValue = {
  mode: ViewMode;
  setMode: (next: ViewMode) => void;
};

const ViewModeContext = React.createContext<ViewModeContextValue | undefined>(
  undefined
);

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = React.useState<ViewMode>("live preview");

  const value = React.useMemo(() => ({ mode, setMode }), [mode]);

  return (
    <ViewModeContext.Provider value={value}>{children}</ViewModeContext.Provider>
  );
}

export function useViewMode(): ViewModeContextValue {
  const ctx = React.useContext(ViewModeContext);
  if (!ctx) {
    throw new Error("useViewMode must be used within a ViewModeProvider");
  }
  return ctx;
}


