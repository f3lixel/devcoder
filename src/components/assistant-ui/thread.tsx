import type { FC } from "react";
import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, CopyIcon, RefreshCwIcon, ArrowDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root className="text-foreground bg-background box-border flex h-full flex-col overflow-hidden">
      <ThreadPrimitive.Viewport autoScroll className="flex h-full flex-col items-center overflow-y-auto scrollbar-hide scroll-smooth bg-inherit px-4 pt-6">
        <ThreadPrimitive.Empty>
          <div className="flex w-full max-w-4xl flex-1 flex-col items-center justify-center py-12">
            <p className="text-lg font-semibold opacity-90">How can I help you today?</p>
          </div>
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            AssistantMessage,
            EditComposer: EditComposer,
          }}
        />

        <ThreadPrimitive.If empty={false}>
          <div className="min-h-8 flex-grow" />
        </ThreadPrimitive.If>

        <ThreadPrimitive.ScrollToBottom asChild>
          <div className="sticky bottom-4 self-end">
            <TooltipIconButton
              tooltip="Scroll to bottom"
              variant="outline"
              className="rounded-full backdrop-blur bg-background/60"
            >
              <ArrowDownIcon />
            </TooltipIconButton>
          </div>
        </ThreadPrimitive.ScrollToBottom>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="grid w-full max-w-4xl auto-rows-auto grid-cols-[1fr_auto] gap-y-2 py-4">
      {/* Chat bubble aligned to the right */}
      <div className="relative col-start-2 row-start-2 max-w-[80%] self-end justify-self-end">
        <div className="inline-block whitespace-normal break-normal rounded-full border border-primary/30 bg-primary/15 px-5 py-2 text-[15px] leading-7 shadow-sm">
          <MessagePrimitive.Parts />
        </div>
        {/* Tail */}
        <div className="absolute -bottom-1 right-6 h-3 w-3 rotate-45 border border-primary/30 bg-primary/15" />
      </div>
      <BranchPicker className="col-span-full col-start-1 row-start-3 -mr-1 justify-end" />
      <UserActionBar />
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root hideWhenRunning autohide="not-last" className="col-start-1 row-start-2 mt-2.5 mr-3 flex flex-col items-end">
      {/* Only edit action for now */}
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <div className="my-4 w-full max-w-4xl rounded-xl bg-white/5 p-3">
      <ComposerPrimitive.Root>
        <ComposerPrimitive.Input className="h-8 w-full resize-none bg-transparent p-0 outline-none" />
        <div className="mt-2 flex items-center justify-end gap-2">
          <ComposerPrimitive.Cancel asChild>
            <button className="rounded px-2 py-1 text-sm opacity-80 hover:opacity-100">Cancel</button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <button className="rounded bg-primary px-2 py-1 text-sm text-primary-foreground">Update</button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </div>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative grid w-full max-w-4xl grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr] py-4">
      <div className="col-span-2 col-start-2 row-start-1 my-1.5 max-w-[80%] break-words leading-7">
        <MessagePrimitive.Parts components={{ Text: MarkdownText, tools: { Fallback: ToolFallback } }} />
        <MessageError />
      </div>
      <AssistantActionBar />
      <BranchPicker className="col-start-2 row-start-2 -ml-2 mr-2" />
    </MessagePrimitive.Root>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="mt-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
        <ErrorPrimitive.Message className="line-clamp-3" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      className="col-start-3 row-start-2 -ml-1 flex gap-1 text-white/70 data-[floating]:absolute data-[floating]:rounded-md data-[floating]:border data-[floating]:bg-background data-[floating]:p-1 data-[floating]:shadow-sm"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy">
          <MessagePrimitive.If copied>
            <CheckIcon />
          </MessagePrimitive.If>
          <MessagePrimitive.If copied={false}>
            <CopyIcon />
          </MessagePrimitive.If>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip="Refresh">
          <RefreshCwIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
    </ActionBarPrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({ className, ...rest }) => {
  return (
    <BranchPickerPrimitive.Root hideWhenSingleBranch className={cn("inline-flex items-center text-xs text-white/60", className)} {...rest}>
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="mx-1 font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};


