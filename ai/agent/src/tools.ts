import { db } from "@noctis/db";
import { formatCurrency } from "@noctis/utils";

export interface ChatResult {
  message: string;
  action?: { type: string; summary: string };
  /**
   * Deletes are proposed, never executed here. A misheard "hapus" against a habit streak is
   * unrecoverable, so the model only names the record and the client confirms it through the
   * normal REST endpoint — which re-checks ownership anyway.
   */
  pendingDelete?: PendingDelete;
}

export interface PendingDelete {
  kind: "task" | "habit" | "transaction" | "category";
  id: string;
  label: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isConsecutiveDay(previous: Date, current: Date): boolean {
  const previousDay = new Date(previous);
  previousDay.setHours(0, 0, 0, 0);
  const currentDay = new Date(current);
  currentDay.setHours(0, 0, 0, 0);
  return currentDay.getTime() - previousDay.getTime() === DAY_MS;
}

export type Resolution<T> = { ok: true; item: T } | { ok: false; message: string };

/**
 * Turns the name the model said into one of the user's records. The model is never given ids —
 * small models echo cuids unreliably — so everything is addressed by name and resolved here.
 * An exact match wins; failing that a unique substring match; anything else asks rather than guesses.
 */
export function resolveByName<T>(
  items: T[],
  nameOf: (item: T) => string,
  query: string,
  label: string,
): Resolution<T> {
  const needle = query.trim().toLowerCase();
  if (needle === "") return { ok: false, message: `Which ${label} did you mean?` };

  const exact = items.filter((item) => nameOf(item).toLowerCase() === needle);
  if (exact.length === 1) return { ok: true, item: exact[0] as T };

  const partial = items.filter((item) => nameOf(item).toLowerCase().includes(needle));
  if (partial.length === 1) return { ok: true, item: partial[0] as T };
  if (partial.length === 0) return { ok: false, message: `I couldn't find a ${label} matching "${query}".` };

  return {
    ok: false,
    message: `More than one ${label} matches "${query}": ${partial.map(nameOf).join(", ")}. Which one?`,
  };
}

export async function createTask(
  userId: string,
  input: { title: string; dueAt?: string; notes?: string },
): Promise<ChatResult> {
  const due = input.dueAt ? new Date(input.dueAt) : null;
  const task = await db.task.create({
    data: {
      userId,
      title: input.title,
      dueAt: due && !Number.isNaN(due.getTime()) ? due : null,
      notes: input.notes ?? null,
    },
  });

  return {
    message: `Added "${task.title}" to your tasks${task.dueAt ? `, due ${task.dueAt.toLocaleString()}` : ""}.`,
    action: { type: "CREATE_TASK", summary: `Created task: ${task.title}` },
  };
}

export async function completeTask(userId: string, title: string): Promise<ChatResult> {
  const tasks = await db.task.findMany({ where: { userId, completed: false } });
  const found = resolveByName(tasks, (task) => task.title, title, "task");
  if (!found.ok) return { message: found.message };

  const task = await db.task.update({
    where: { id: found.item.id },
    data: { completed: true, completedAt: new Date() },
  });

  return {
    message: `Marked "${task.title}" as done.`,
    action: { type: "COMPLETE_TASK", summary: `Completed task: ${task.title}` },
  };
}

export async function deleteTask(userId: string, title: string): Promise<ChatResult> {
  const tasks = await db.task.findMany({ where: { userId } });
  const found = resolveByName(tasks, (task) => task.title, title, "task");
  if (!found.ok) return { message: found.message };

  return {
    message: `Delete the task "${found.item.title}"?`,
    pendingDelete: { kind: "task", id: found.item.id, label: found.item.title },
  };
}

export async function createHabit(
  userId: string,
  input: { name: string; daysOfWeek?: number[]; color?: string },
): Promise<ChatResult> {
  const days = input.daysOfWeek?.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  const habit = await db.habit.create({
    data: {
      userId,
      name: input.name,
      daysOfWeek: days && days.length > 0 ? days : [0, 1, 2, 3, 4, 5, 6],
      ...(input.color ? { color: input.color } : {}),
    },
  });

  return {
    message: `Tracking "${habit.name}" — log it once a day to build a streak.`,
    action: { type: "CREATE_HABIT", summary: `Created habit: ${habit.name}` },
  };
}

export async function logHabit(userId: string, name: string): Promise<ChatResult> {
  const habits = await db.habit.findMany({ where: { userId } });
  const found = resolveByName(habits, (habit) => habit.name, name, "habit");
  if (!found.ok) return { message: found.message };

  const habit = found.item;
  const now = new Date();
  const today = startOfToday();
  const tomorrow = new Date(today.getTime() + DAY_MS);

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
  const updated = await db.habit.update({
    where: { id: habit.id },
    data: { streak: nextStreak, longestStreak: Math.max(habit.longestStreak, nextStreak) },
  });

  return {
    message: `Logged ${updated.name} — ${updated.streak} day streak.`,
    action: { type: "LOG_HABIT", summary: `Logged habit: ${updated.name}` },
  };
}

export async function deleteHabit(userId: string, name: string): Promise<ChatResult> {
  const habits = await db.habit.findMany({ where: { userId } });
  const found = resolveByName(habits, (habit) => habit.name, name, "habit");
  if (!found.ok) return { message: found.message };

  return {
    message: `Stop tracking "${found.item.name}"? Its logs and streak go with it.`,
    pendingDelete: { kind: "habit", id: found.item.id, label: found.item.name },
  };
}

export async function addTransaction(
  userId: string,
  input: { title: string; amount: number; category: string; type?: "income" | "expense"; date?: string },
): Promise<ChatResult> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { message: "I need a positive amount to record that." };
  }

  const type = input.type === "income" ? "income" : "expense";
  const when = input.date ? new Date(input.date) : null;
  const categories = await db.category.findMany({ where: { userId } });
  const found = resolveByName(categories, (category) => category.name, input.category, "category");

  const expense = await db.expense.create({
    data: {
      userId,
      title: input.title,
      amount: input.amount,
      // An unmatched category is not worth blocking the entry — it falls back and is backfilled on listing.
      category: found.ok ? found.item.name : input.category,
      type,
      ...(when && !Number.isNaN(when.getTime()) ? { date: when } : {}),
    },
  });

  return {
    message: `Logged ${type} "${expense.title}" — ${formatCurrency(expense.amount)} under ${expense.category}.`,
    action: { type: "ADD_TRANSACTION", summary: `Added ${type}: ${expense.title}` },
  };
}

export async function deleteTransaction(userId: string, title: string): Promise<ChatResult> {
  const expenses = await db.expense.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 50 });
  const found = resolveByName(expenses, (expense) => expense.title, title, "transaction");
  if (!found.ok) return { message: found.message };

  return {
    message: `Delete "${found.item.title}" (${formatCurrency(found.item.amount)})?`,
    pendingDelete: { kind: "transaction", id: found.item.id, label: found.item.title },
  };
}

export async function createCategory(
  userId: string,
  input: { name: string; color?: string },
): Promise<ChatResult> {
  const name = input.name.trim();
  if (name === "") return { message: "What should the category be called?" };

  const existing = await db.category.findFirst({ where: { userId, name } });
  if (existing) return { message: `You already have a "${existing.name}" category.` };

  const category = await db.category.create({
    data: { userId, name, ...(input.color ? { color: input.color } : {}) },
  });

  return {
    message: `Added the "${category.name}" category.`,
    action: { type: "CREATE_CATEGORY", summary: `Created category: ${category.name}` },
  };
}

export async function deleteCategory(userId: string, name: string): Promise<ChatResult> {
  const categories = await db.category.findMany({ where: { userId } });
  const found = resolveByName(categories, (category) => category.name, name, "category");
  if (!found.ok) return { message: found.message };
  if (categories.length === 1) return { message: "That's your only category — I'll keep it." };

  // Same fallback rule financeService.deleteCategory applies when the client confirms.
  const remaining = categories.filter((category) => category.id !== found.item.id);
  const fallback = remaining.find((category) => category.name === "Other") ?? remaining[0];

  return {
    message: `Delete "${found.item.name}"? Its transactions move to ${(fallback as { name: string }).name}.`,
    pendingDelete: { kind: "category", id: found.item.id, label: found.item.name },
  };
}

export async function getSummary(userId: string, period: "today" | "week" | "month"): Promise<ChatResult> {
  const now = new Date();
  const start =
    period === "today"
      ? startOfToday()
      : period === "week"
        ? new Date(now.getTime() - 7 * DAY_MS)
        : new Date(now.getFullYear(), now.getMonth(), 1);

  const entries = await db.expense.findMany({
    where: { userId, date: { gte: start } },
    select: { amount: true, type: true },
  });

  const income = entries.reduce((sum, e) => (e.type === "income" ? sum + e.amount : sum), 0);
  const spend = entries.reduce((sum, e) => (e.type === "expense" ? sum + e.amount : sum), 0);
  const net = income - spend;

  return {
    message: `This ${period}: ${formatCurrency(spend)} spent, ${formatCurrency(income)} in, ${
      net < 0 ? `${formatCurrency(Math.abs(net))} down` : `${formatCurrency(net)} up`
    }.`,
  };
}
