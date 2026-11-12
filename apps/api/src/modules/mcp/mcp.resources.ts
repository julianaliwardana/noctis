import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as financeService from "../finance/finance.service";
import { dayKey, dayRange } from "../finance/finance.insights";
import * as pomodoroRepository from "../pomodoro/pomodoro.repository";
import * as tasksRepository from "../tasks/tasks.repository";
import { openTasks } from "./mcp.devtools";
import { focusView, taskView } from "./mcp.views";

const JSON_MIME = "application/json";

function contents(uri: URL, value: unknown) {
  return { contents: [{ uri: uri.href, mimeType: JSON_MIME, text: JSON.stringify(value, null, 2) }] };
}

/**
 * Read-only snapshots a client can attach as context (in Claude Code: type @ and pick one).
 * Each read is fresh: the server is stateless, so nothing is cached between calls.
 */
export function registerResources(server: McpServer, userId: string): void {
  server.registerResource(
    "open-tasks",
    "noctis://tasks/open",
    {
      title: "Open tasks",
      description: "Every unfinished Noctis task, soonest due first.",
      mimeType: JSON_MIME,
    },
    async (uri) => {
      const tasks = openTasks(await tasksRepository.findAllByUser(userId));
      return contents(uri, { total: tasks.length, tasks: tasks.map(taskView) });
    },
  );

  server.registerResource(
    "finance-period",
    "noctis://finance/period",
    {
      title: "Money this period",
      description: "Income, spend, what is left, days left and every budget for the current pay cycle (or month).",
      mimeType: JSON_MIME,
    },
    async (uri) => contents(uri, await financeService.getMonthOverview(userId)),
  );

  server.registerResource(
    "focus-today",
    "noctis://focus/today",
    {
      title: "Focus today",
      description: "Today's focus sessions (Jakarta day) and the total minutes.",
      mimeType: JSON_MIME,
    },
    async (uri) => {
      const today = dayKey(new Date());
      const range = dayRange(today, today);
      const sessions = range ? await pomodoroRepository.findStartedInRange(userId, range.start, range.end) : [];
      const focus = sessions.filter((session) => session.phase === "focus").map(focusView);
      const totalMinutes = focus.reduce((sum, session) => sum + (session.minutes ?? 0), 0);
      return contents(uri, { day: today, totalMinutes, sessions: focus });
    },
  );
}
