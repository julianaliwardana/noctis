import type { NudgeSlot } from "@noctis/types";
import type { UserContext } from "./context";

export function systemPrompt(): string {
  return [
    "You are Noctis, a calm personal productivity assistant.",
    "You help with tasks, habits, and finances. Be concise and precise.",
    "Never invent data you were not given in the context.",
    "You have no access to the user's saved passwords and must say so if asked.",
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

  const categories = context.categories.length ? context.categories.join(", ") : "None";

  const transactions = context.recentTransactions.length
    ? context.recentTransactions
        .map((entry) => `- ${entry.title}: ${entry.amount} ${entry.category} (${entry.type})`)
        .join("\n")
    : "None";

  return [
    `Pending tasks:\n${tasks}`,
    `Habits:\n${habits}`,
    `Expense categories: ${categories}`,
    `Recent transactions:\n${transactions}`,
    `Spend this month: ${context.monthSpend}`,
  ].join("\n\n");
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
    `Current date and time: ${new Date().toISOString()}`,
    "",
    formatContext(context),
    "",
    `User message: "${message}"`,
    "",
    "If the user is asking you to do something, respond with ONLY one JSON tool call.",
    "Refer to tasks, habits, categories and transactions by their name exactly as listed above — never by id.",
    "Resolve relative dates against the current date and time and send them as ISO 8601 strings.",
    "",
    '{ "intent": "CREATE_TASK", "title": string, "dueAt"?: string, "notes"?: string }',
    '{ "intent": "COMPLETE_TASK", "title": string }',
    '{ "intent": "DELETE_TASK", "title": string }',
    '{ "intent": "CREATE_HABIT", "name": string, "daysOfWeek"?: number[], "color"?: string }',
    '{ "intent": "LOG_HABIT", "name": string }',
    '{ "intent": "DELETE_HABIT", "name": string }',
    '{ "intent": "ADD_TRANSACTION", "title": string, "amount": number, "category": string, "type"?: "income"|"expense", "date"?: string }',
    '{ "intent": "DELETE_TRANSACTION", "title": string }',
    '{ "intent": "CREATE_CATEGORY", "name": string, "color"?: string }',
    '{ "intent": "DELETE_CATEGORY", "name": string }',
    '{ "intent": "GET_SUMMARY", "period": "today"|"week"|"month" }',
    "",
    "daysOfWeek is 0 for Sunday through 6 for Saturday, and colors are #rrggbb.",
    "Otherwise, respond with ONLY this JSON shape:",
    '{ "intent": "REPLY", "message": string }',
  ].join("\n");
}
