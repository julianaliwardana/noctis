import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Task } from "@noctis/db";
import { z } from "zod";
import * as pomodoroRepository from "../pomodoro/pomodoro.repository";
import * as tasksRepository from "../tasks/tasks.repository";
import * as tasksService from "../tasks/tasks.service";
import { fail, focusView, json, taskView } from "./mcp.views";

const MINUTE_MS = 60_000;
/** A little clock drift between the client and the server is fine; a session in the future is not. */
const FUTURE_TOLERANCE_MS = 5 * MINUTE_MS;

/** Open tasks: soonest due first, undated ones after, oldest first. */
function byDue(a: Task, b: Task): number {
  if (a.dueAt && b.dueAt) return a.dueAt.getTime() - b.dueAt.getTime();
  if (a.dueAt) return -1;
  if (b.dueAt) return 1;
  return a.createdAt.getTime() - b.createdAt.getTime();
}

/** Done tasks: most recently finished first. */
function byCompleted(a: Task, b: Task): number {
  return (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0);
}

export function openTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => !task.completed).sort(byDue);
}

/**
 * Tools for working from a code editor (Claude Code, VS Code): read and close tasks, and log a
 * focus session. Adding tasks is `add_task`, registered with the server-health tools.
 */
export function registerDevTools(server: McpServer, userId: string): void {
  server.registerTool(
    "list_tasks",
    {
      title: "List tasks",
      description:
        "The user's Noctis tasks. Open ones come soonest-due first; done ones most recently finished first. Filter by a case-insensitive substring of the title or notes, e.g. a client or project name. Use the returned id with complete_task.",
      inputSchema: {
        status: z.enum(["open", "done", "all"]).default("open"),
        query: z.string().trim().min(1).optional().describe("Substring of the title or notes, e.g. 'megatama'"),
        limit: z.number().int().min(1).max(100).default(30),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ status, query, limit }) => {
      const needle = query?.toLowerCase();
      const all = (await tasksRepository.findAllByUser(userId)).filter(
        (task) => !needle || task.title.toLowerCase().includes(needle) || (task.notes ?? "").toLowerCase().includes(needle),
      );

      const open = status === "done" ? [] : openTasks(all);
      const done = status === "open" ? [] : all.filter((task) => task.completed).sort(byCompleted);
      const tasks = [...open, ...done];

      return json({ total: tasks.length, tasks: tasks.slice(0, limit).map(taskView) });
    },
  );

  server.registerTool(
    "complete_task",
    {
      title: "Complete task",
      description:
        "Marks a task done by id (from list_tasks). A recurring task isn't closed: it moves to its next due date, and the result says 'rescheduled' with the new date. Only call it when the user says the task is done.",
      inputSchema: { id: z.string().min(1) },
      annotations: { idempotentHint: true },
    },
    async ({ id }) => {
      const before = await tasksRepository.findById(id, userId);
      if (!before) return fail(`No task with id "${id}".`);
      if (before.completed) return json({ status: "already_done", task: taskView(before) });

      const after = await tasksService.completeTask(id, userId);
      if (!after) return fail(`No task with id "${id}".`);
      return json({ status: after.completed ? "completed" : "rescheduled", task: taskView(after) });
    },
  );

  server.registerTool(
    "log_focus",
    {
      title: "Log focus session",
      description:
        "Records a finished focus session (a pomodoro) of the given length, ending now or at `endedAt`. Noctis's timer runs in the browser and only saves finished sessions, so this logs work done elsewhere, e.g. 'log 50 minutes of focus on the portfolio'. It does not start a timer.",
      inputSchema: {
        minutes: z.number().int().min(1).max(240),
        endedAt: z.string().datetime({ offset: true }).optional().describe("When it ended, ISO 8601 with offset. Defaults to now."),
      },
    },
    async ({ minutes, endedAt }) => {
      const end = endedAt ? new Date(endedAt) : new Date();
      if (end.getTime() > Date.now() + FUTURE_TOLERANCE_MS) return fail("That session ends in the future.");

      const session = await pomodoroRepository.create(userId, {
        phase: "focus",
        startedAt: new Date(end.getTime() - minutes * MINUTE_MS),
        endedAt: end,
      });
      return json({ status: "logged", session: focusView(session) });
    },
  );
}
