import type { NudgeSlot } from "@noctis/types";
import type { UserContext } from "./context";

export function systemPrompt(): string {
  return [
    "You are Noctis, a calm personal productivity assistant.",
    "You help with tasks, habits, and finances. Be concise and precise.",
    "Never invent data you were not given in the context.",
  ].join(" ");
}

function formatContext(context: UserContext): string {
  const tasks = context.pendingTasks.length
    ? context.pendingTasks
        .map((task) => `- ${task.title}${task.dueAt ? ` (due ${task.dueAt.toISOString()})` : ""}`)
        .join("\n")
    : "None";

  const habits = context.habitStreaks.length
    ? context.habitStreaks.map((habit) => `- ${habit.name}: ${habit.streak} day streak`).join("\n")
    : "None";

  return [`Pending tasks:\n${tasks}`, `Habit streaks:\n${habits}`, `Spend this month: ${context.monthSpend}`].join(
    "\n\n",
  );
}

export function nudgePrompt(context: UserContext, slot: NudgeSlot): string {
  return [
    `It is the ${slot} check-in.`,
    formatContext(context),
    "",
    "Decide whether the user would benefit from a proactive nudge right now.",
    'Respond with ONLY this JSON shape, no markdown fences: { "shouldNudge": boolean, "title": string, "message": string, "type": "task"|"habit"|"finance"|"focus" }',
  ].join("\n");
}

export function chatPrompt(context: UserContext, message: string): string {
  return [
    formatContext(context),
    "",
    `User message: "${message}"`,
    "",
    "If the user is asking you to do something, respond with ONLY one JSON tool call in this shape:",
    '{ "intent": "CREATE_TASK", "title": string, "dueAt"?: string, "notes"?: string }',
    '{ "intent": "COMPLETE_TASK", "taskId": string }',
    '{ "intent": "LOG_HABIT", "habitId": string }',
    '{ "intent": "ADD_EXPENSE", "title": string, "amount": number, "category": string }',
    '{ "intent": "GET_SUMMARY", "period": "today"|"week"|"month" }',
    "Otherwise, respond with ONLY this JSON shape:",
    '{ "intent": "REPLY", "message": string }',
  ].join("\n");
}
