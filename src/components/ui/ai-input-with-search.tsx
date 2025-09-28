"use client";

import { Globe, Paperclip, Send } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAutoResizeTextarea } from "@/components/hooks/use-auto-resize-textarea";

interface AIInputWithSearchProps {
  id?: string;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  onSubmit?: (value: string, withSearch: boolean) => void;
  onFileSelect?: (file: File) => void;
  className?: string;
  hideSearchToggle?: boolean;
  maxWidthClass?: string;
}

export function AIInputWithSearch({
  id = "ai-input-with-search",
  placeholder = "Search the web...",
  minHeight = 48,
  maxHeight = 164,
  onSubmit,
  onFileSelect,
  className,
  hideSearchToggle = false,
  maxWidthClass = "max-w-xl",
}: AIInputWithSearchProps) {
  const [value, setValue] = useState("");
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight,
    maxHeight,
  });
  const [showSearch, setShowSearch] = useState(true);

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit?.(value, showSearch);
      setValue("");
      adjustHeight(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect?.(file);
    }
  };

  return (
    <div className={cn("w-full py-4", className)}>
      <div className={cn("relative mx-auto", maxWidthClass)}>
        <div className="relative flex flex-col rounded-xl bg-black/5 dark:bg-white/5 overflow-hidden">
          <div
            className="overflow-hidden"
            style={{ maxHeight: `${maxHeight}px` }}
          >
            <textarea
              id={id}
              value={value}
              placeholder={placeholder}
              className="w-full px-4 pt-5 pb-3 bg-transparent border-0 outline-none dark:text-white placeholder:text-black/70 dark:placeholder:text-white/70 resize-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 shadow-none focus:shadow-none"
              ref={textareaRef}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              onChange={(e) => {
                setValue(e.target.value);
                adjustHeight();
              }}
              style={{ appearance: "none" as any }}
            />
          </div>

          <div className="h-[48px] bg-transparent">
            <div className="absolute left-3 bottom-3 flex items-center gap-2">
              <label className="cursor-pointer rounded-lg p-2 bg-black/5 dark:bg-white/5">
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <Paperclip className="w-4 h-4 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors" />
              </label>
              {!hideSearchToggle && (
                <button
                  type="button"
                  onClick={() => setShowSearch(!showSearch)}
                  className={cn(
                    "rounded-full transition-all flex items-center gap-2 px-1.5 py-1 border h-8",
                    showSearch
                      ? "bg-sky-500/15 border-sky-400 text-sky-500"
                      : "bg-black/5 dark:bg-white/5 border-transparent text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                  )}
                >
                  <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    <motion.div
                      animate={{
                        rotate: showSearch ? 180 : 0,
                        scale: showSearch ? 1.1 : 1,
                      }}
                      whileHover={{
                        rotate: showSearch ? 180 : 15,
                        scale: 1.1,
                        transition: {
                          type: "spring",
                          stiffness: 300,
                          damping: 10,
                        },
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 25,
                      }}
                    >
                      <Globe
                        className={cn(
                          "w-4 h-4",
                          showSearch
                            ? "text-sky-500"
                            : "text-inherit"
                        )}
                      />
                    </motion.div>
                  </div>
                  <AnimatePresence>
                    {showSearch && (
                      <motion.span
                        initial={{ width: 0, opacity: 0 }}
                        animate={{
                          width: "auto",
                          opacity: 1,
                        }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-base overflow-hidden whitespace-nowrap text-sky-500 flex-shrink-0"
                      >
                        Search
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              )}
            </div>
            <div className="absolute right-3 bottom-3">
              <button
                type="button"
                onClick={handleSubmit}
                className={cn(
                  "rounded-lg p-2 transition-colors",
                  value
                    ? "bg-sky-500/15 text-sky-500"
                    : "bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AIInputWithSearchDemo() {
  return (
    <div className="space-y-8 min-w-[350px]">
      <div>
        <AIInputWithSearch 
          onSubmit={(value, withSearch) => {
            console.log('Message:', value);
            console.log('Search enabled:', withSearch);
          }}
          onFileSelect={(file) => {
            console.log('Selected file:', file);
          }}
        />
      </div>
    </div>
  );
}


