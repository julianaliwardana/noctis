import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { PomodoroSession, Task } from "@noctis/db";

export function json(value: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

export function fail(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

export function taskView(task: Task) {
  return {
    id: task.id,
    title: task.title,
    notes: task.notes,
    dueAt: task.dueAt?.toISOString() ?? null,
    recurrence: task.recurrence,
    completed: task.completed,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
  };
}

export function focusView(session: PomodoroSession) {
  const minutes = session.endedAt ? Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60_000) : null;
  return {
    id: session.id,
    phase: session.phase,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    minutes,
  };
}
