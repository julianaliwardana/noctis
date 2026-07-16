"use client";

import { useState } from "react";
import { Repeat } from "lucide-react";
import { formatDate } from "@noctis/utils";
import { cn } from "@/lib/utils";
import type { TaskDto } from "../api/tasks.api";

export interface TaskCardProps {
  task: TaskDto;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

function isOverdue(task: TaskDto): boolean {
  return !task.completed && task.dueAt !== null && new Date(task.dueAt) < new Date();
}

export function TaskCard({ task, onComplete, onDelete }: TaskCardProps) {
  const [completing, setCompleting] = useState(false);
  const overdue = isOverdue(task);
  const done = task.completed || completing;

  function handleComplete(): void {
    if (task.completed) return;
    setCompleting(true);
    window.setTimeout(() => onComplete(task.id), 200);
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--color-border)]/20",
        overdue && "border-l-2 border-[var(--color-tasks)] pl-2.5",
      )}
    >
      <button
        type="button"
        onClick={handleComplete}
        aria-label={task.completed ? "Completed" : `Complete "${task.title}"`}
        className={cn(
          "h-5 w-5 shrink-0 rounded-full border-2 transition-all duration-200",
          done ? "border-[var(--color-tasks)] bg-[var(--color-tasks)]" : "border-[var(--color-border)]",
        )}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm text-[var(--color-text)] transition-opacity duration-200",
            done && "opacity-50 line-through",
          )}
        >
          {task.title}
          {task.recurrence && (
            <Repeat
              className="ml-1.5 inline h-3 w-3 text-[var(--color-text-muted)]"
              strokeWidth={2}
              aria-label="Recurring task"
            />
          )}
        </p>
        {task.notes && (
          <p className={cn("truncate text-xs text-[var(--color-text-muted)]", done && "opacity-50")}>
            {task.notes}
          </p>
        )}
        {task.dueAt && (
          <p
            className={cn(
              "text-xs text-[var(--color-text-muted)]",
              overdue && "font-medium text-[var(--color-tasks)]",
            )}
          >
            {formatDate(task.dueAt)}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDelete(task.id)}
        aria-label={`Remove "${task.title}"`}
        className="shrink-0 rounded-md px-2 py-1 text-xs text-[var(--color-text-muted)] opacity-0 transition-opacity hover:text-[var(--color-passwords)] group-hover:opacity-100"
      >
        Remove
      </button>
    </div>
  );
}
