import { db } from "@noctis/db";
import { formatCurrency, safeParseJSON } from "@noctis/utils";
import { gatherContext } from "./context";
import { systemPrompt, chatPrompt } from "./prompts";
import { createProvider } from "./llm";

const DAY_MS = 24 * 60 * 60 * 1000;

function isConsecutiveDay(previous: Date, current: Date): boolean {
  const previousDay = new Date(previous);
  previousDay.setHours(0, 0, 0, 0);
  const currentDay = new Date(current);
  currentDay.setHours(0, 0, 0, 0);
  return currentDay.getTime() - previousDay.getTime() === DAY_MS;
}

async function getSpendForPeriod(userId: string, period: "today" | "week" | "month"): Promise<number> {
  const now = new Date();
  let start: Date;

  if (period === "today") {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    start = new Date(now.getTime() - 7 * DAY_MS);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const expenses = await db.expense.findMany({
    where: { userId, type: "expense", date: { gte: start } },
    select: { amount: true },
  });

  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

interface ReplyIntent {
  intent: "REPLY";
  message: string;
}

interface CreateTaskIntent {
  intent: "CREATE_TASK";
  title: string;
  dueAt?: string;
  notes?: string;
}

interface CompleteTaskIntent {
  intent: "COMPLETE_TASK";
  taskId: string;
}

interface LogHabitIntent {
  intent: "LOG_HABIT";
  habitId: string;
}

interface AddExpenseIntent {
  intent: "ADD_EXPENSE";
  title: string;
  amount: number;
  category: string;
}

interface GetSummaryIntent {
  intent: "GET_SUMMARY";
  period: "today" | "week" | "month";
}

type ChatIntent =
  | ReplyIntent
  | CreateTaskIntent
  | CompleteTaskIntent
  | LogHabitIntent
  | AddExpenseIntent
  | GetSummaryIntent;

export interface ChatResult {
  message: string;
  action?: { type: string; summary: string };
}

function isChatIntent(value: unknown): value is ChatIntent {
  return typeof value === "object" && value !== null && typeof (value as { intent?: unknown }).intent === "string";
}

export async function handleChat(userId: string, message: string): Promise<ChatResult> {
  const context = await gatherContext(userId);
  const provider = createProvider();
  const raw = await provider.complete(systemPrompt(), chatPrompt(context, message));
  const parsed = safeParseJSON(raw);

  if (!isChatIntent(parsed)) {
    return { message: raw };
  }

  switch (parsed.intent) {
    case "CREATE_TASK": {
      const task = await db.task.create({
        data: {
          userId,
          title: parsed.title,
          dueAt: parsed.dueAt ? new Date(parsed.dueAt) : null,
          notes: parsed.notes,
        },
      });
      return {
        message: `Added "${task.title}" to your tasks.`,
        action: { type: "CREATE_TASK", summary: `Created task: ${task.title}` },
      };
    }

    case "COMPLETE_TASK": {
      const existingTask = await db.task.findFirst({ where: { id: parsed.taskId, userId } });
      if (!existingTask) {
        return { message: "I couldn't find that task." };
      }

      const task = await db.task.update({
        where: { id: parsed.taskId },
        data: { completed: true, completedAt: new Date() },
      });
      return {
        message: `Marked "${task.title}" as done.`,
        action: { type: "COMPLETE_TASK", summary: `Completed task: ${task.title}` },
      };
    }

    case "LOG_HABIT": {
      const habit = await db.habit.findFirst({ where: { id: parsed.habitId, userId } });
      if (!habit) {
        return { message: "I couldn't find that habit." };
      }

      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingLog = await db.habitLog.findFirst({
        where: { habitId: habit.id, date: { gte: today, lt: tomorrow } },
      });
      if (existingLog) {
        return {
          message: `${habit.name} is already logged for today — ${habit.streak} day streak.`,
          action: { type: "LOG_HABIT", summary: `Logged habit: ${habit.name}` },
        };
      }

      const latest = await db.habitLog.findFirst({ where: { habitId: habit.id }, orderBy: { date: "desc" } });
      const nextStreak = latest && isConsecutiveDay(latest.date, now) ? habit.streak + 1 : 1;

      await db.habitLog.create({ data: { habitId: habit.id, date: now } });
      const updated = await db.habit.update({ where: { id: habit.id }, data: { streak: nextStreak } });

      return {
        message: `Logged ${updated.name} — ${updated.streak} day streak.`,
        action: { type: "LOG_HABIT", summary: `Logged habit: ${updated.name}` },
      };
    }

    case "ADD_EXPENSE": {
      const expense = await db.expense.create({
        data: { userId, title: parsed.title, amount: parsed.amount, category: parsed.category, type: "expense" },
      });
      return {
        message: `Logged ${expense.title} — ${formatCurrency(expense.amount)}.`,
        action: { type: "ADD_EXPENSE", summary: `Added expense: ${expense.title}` },
      };
    }

    case "GET_SUMMARY": {
      const spend = await getSpendForPeriod(userId, parsed.period);
      return { message: `This ${parsed.period}, you've spent ${formatCurrency(spend)} so far.` };
    }

    case "REPLY":
    default:
      return { message: parsed.intent === "REPLY" ? parsed.message : raw };
  }
}
