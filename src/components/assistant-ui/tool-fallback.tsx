import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const ToolFallback: ToolCallMessagePartComponent = ({ toolName, argsText, result }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  return (
    <div className="mb-3 w-full rounded-lg border border-white/10">
      <div className="flex items-center gap-2 px-3 py-2">
        <CheckIcon className="h-4 w-4" />
        <p className="flex-1 text-sm">
          Used tool: <b>{toolName}</b>
        </p>
        <Button size="sm" variant="ghost" onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </Button>
      </div>
      {!isCollapsed && (
        <div className="border-t border-dashed border-white/10 p-3 text-xs">
          <div className="mb-2">
            <p className="mb-1 font-medium opacity-80">Args</p>
            <pre className="whitespace-pre-wrap opacity-80">{argsText}</pre>
          </div>
          {result !== undefined && (
            <div className="mt-2 border-t border-dashed border-white/10 pt-2">
              <p className="mb-1 font-medium opacity-80">Result</p>
              <pre className="whitespace-pre-wrap opacity-80">
                {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};





