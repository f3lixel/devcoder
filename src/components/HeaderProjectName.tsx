"use client";

import * as React from "react";
import { useProject } from "@/components/project-context";
import { ChevronDown } from "lucide-react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Component as InlineDropdown } from "@/components/ui/inline-dropdown";

function useTypewriter(text: string, speedMs = 40) {
  const [display, setDisplay] = React.useState("");
  React.useEffect(() => {
    setDisplay("");
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setDisplay(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speedMs);
    return () => clearInterval(id);
  }, [text, speedMs]);
  return display;
}

export default function HeaderProjectName() {
  const { projectName, setProjectName } = useProject();
  const shown = useTypewriter(projectName ?? "", 30);
  if (!projectName) return null;
  return (
    <Menu>
      <MenuButton
        className="flex items-center whitespace-nowrap text-base font-medium text-white/80 rounded-md px-2 py-1 bg-white/0 shadow-inner shadow-white/5 focus:outline-none data-hover:bg-white/10 data-open:bg-white/10"
        aria-label="Project menu"
      >
        <span>{shown}</span>
        <ChevronDown className="ml-1 h-4 w-4 text-white/70" strokeWidth={2} aria-hidden />
        <span className="ml-1 inline-block w-2 animate-pulse">|</span>
      </MenuButton>

      <MenuItems
        transition
        anchor="bottom start"
        className="w-56 origin-top-left p-0 text-sm/6 text-white transition duration-150 ease-out [--anchor-gap:--spacing(1)] focus:outline-none data-closed:scale-95 data-closed:opacity-0 z-[999] overflow-hidden bg-transparent border-0 shadow-none"
      >
        <InlineDropdown />
      </MenuItems>
    </Menu>
  );
}


