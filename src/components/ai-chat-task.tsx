"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type TaskStatus = "pending" | "running" | "completed";

export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  duration?: number;
}

interface AIChatTaskProps {
  task: Task;
  onStartTask?: (taskId: string) => void;
  onCompleteTask?: (taskId: string) => void;
}

export function AIChatTask({ task, onStartTask, onCompleteTask }: AIChatTaskProps) {
  const isPending = task.status === "pending";
  const isRunning = task.status === "running";
  const isCompleted = task.status === "completed";

  return (
    <Card
      className={cn(
        "w-full max-w-sm",
        isRunning && "border-blue-500 shadow-lg",
        isCompleted && "border-green-500 shadow-md"
      )}
    >
      <CardHeader>
        <CardTitle>{task.name}</CardTitle>
        <CardDescription>
          Status:{" "}
          <span
            className={cn(
              isPending && "text-gray-500",
              isRunning && "text-blue-500 font-semibold",
              isCompleted && "text-green-500 font-semibold"
            )}
          >
            {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {typeof task.duration !== "undefined" && (
          <div className="mb-2">Geschätzte Dauer: {task.duration} Min.</div>
        )}
        {isRunning && <Progress value={50} className="w-full" />}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {isPending && onStartTask && (
          <Button onClick={() => onStartTask(task.id)}>Start Task</Button>
        )}
        {isRunning && onCompleteTask && (
          <Button onClick={() => onCompleteTask(task.id)} variant="outline">
            Mark as Complete
          </Button>
        )}
        {isCompleted && (
          <span className="flex items-center text-green-600">
            <Check className="mr-1 h-4 w-4" /> Completed
          </span>
        )}
      </CardFooter>
    </Card>
  );
}


