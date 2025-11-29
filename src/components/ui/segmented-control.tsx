"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Grid, Eye, Code, Database } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export interface SegmentedControlProps {
  tabs?: Tab[];
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  tabs = [
    { id: "workspace", label: "Workspace", icon: <Grid size={16} /> },
    { id: "preview", label: "Preview", icon: <Eye size={16} /> },
    { id: "code", label: "Code", icon: <Code size={16} /> },
    { id: "database", label: "Database", icon: <Database size={16} /> },
  ],
  defaultTab = "preview",
  activeTab: controlledActiveTab,
  onTabChange,
  className,
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<string>(defaultTab);
  
  const currentTab = controlledActiveTab ?? internalActiveTab;

  const handleTabChange = (id: string) => {
    setInternalActiveTab(id);
    onTabChange?.(id);
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="relative inline-flex items-center gap-1 rounded-full bg-zinc-900/50 border border-white/10 p-1 backdrop-blur-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              "relative z-10 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 cursor-pointer",
              currentTab === tab.id
                ? "text-white"
                : "text-zinc-400 hover:text-zinc-300"
            )}
          >
            {currentTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-zinc-800 rounded-full"
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 30,
                }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {tab.icon}
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};




