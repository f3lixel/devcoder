"use client";
import * as React from "react";

type TabsContextValue = {
  value: string;
  setValue: (v: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

export function Tabs({ value: valueProp, defaultValue, onValueChange, children, className }: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [internal, setInternal] = React.useState<string>(defaultValue ?? "");
  const controlled = valueProp !== undefined;
  const value = controlled ? (valueProp as string) : internal;
  const setValue = React.useCallback((v: string) => {
    if (!controlled) setInternal(v);
    onValueChange?.(v);
  }, [controlled, onValueChange]);

  React.useEffect(() => {
    if (!controlled && !internal && defaultValue) setInternal(defaultValue);
  }, [controlled, internal, defaultValue]);

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className} role="tablist">{children}</div>;
}

export function TabsTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) return null;
  const isActive = ctx.value === value;
  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => ctx.setValue(value)}
      className={className}
      type="button"
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) return null;
  if (ctx.value !== value) return null;
  return <div role="tabpanel" className={className}>{children}</div>;
}


