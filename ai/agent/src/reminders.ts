/**
 * Rule-based reminders, pushed whether or not the AI nudge decides to speak:
 * - every 15 min: a task with a due time in the next 30 minutes
 * - 08:00: tasks due today (+ overdue count), subscriptions billing today or tomorrow
 * - 21:00: habits scheduled today that aren't logged yet
 * Dates use the process time zone (TZ=Asia/Jakarta in production), same as the habits module.
 */
import type IORedis from "ioredis";
import { db } from "@noctis/db";
import type { NudgeDecision } from "@noctis/types";
import { formatCurrency } from "@noctis/utils";
import { deliverNudge } from "./delivery";

const SHOWN = 3;
export const DUE_SOON_WINDOW_MS = 30 * 60 * 1000;

function listOf(names: string[], total = names.length): string {
  const shown = names.slice(0, SHOWN).join(", ");
  const more = total - Math.min(names.length, SHOWN);
  return more > 0 ? `${shown} and ${more} more` : shown;
}

function startOfDay(date: Date): Date {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** The task form stores "no time picked" as local midnight: those are day-level, not timed. */
export function hasDueTime(dueAt: Date): boolean {
  return dueAt.getHours() !== 0 || dueAt.getMinutes() !== 0;
}

/** Day of `date`'s month a subscription bills: its billing day, clamped to the month's last day. */
export function billingDate(billingDay: number, date: Date): Date {
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return new Date(date.getFullYear(), date.getMonth(), Math.min(Math.max(billingDay, 1), last));
}

// ── Message builders (pure, see reminders.check.ts) ──────────────────────────

export function taskDueSoonReminder(title: string, dueAt: Date): NudgeDecision {
  return { shouldNudge: true, title: `Due at ${clock(dueAt)}: ${title}`, message: "Open Tasks to finish it or push it back.", type: "task" };
}

export function tasksTodayReminder(dueToday: string[], overdue: number): NudgeDecision | null {
  if (dueToday.length === 0 && overdue === 0) return null;
  const overdueLabel = `${overdue} overdue ${overdue === 1 ? "task" : "tasks"}`;
  if (dueToday.length === 0) {
    return { shouldNudge: true, title: overdueLabel, message: "Clear or reschedule them today.", type: "task" };
  }
  const overdueText = overdue > 0 ? `${overdueLabel} still open.` : "";
  return {
    shouldNudge: true,
    title: dueToday.length === 1 ? "1 task due today" : `${dueToday.length} tasks due today`,
    message: [`${listOf(dueToday)}.`, overdueText].filter(Boolean).join(" "),
    type: "task",
  };
}

export interface DuePayment {
  name: string;
  amount: number;
  today: boolean;
}

export function paymentsReminder(payments: DuePayment[]): NudgeDecision | null {
  if (payments.length === 0) return null;
  const total = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const line = payments
    .slice(0, SHOWN)
    .map((payment) => `${payment.name} ${formatCurrency(payment.amount)} ${payment.today ? "today" : "tomorrow"}`)
    .join(", ");
  const more = payments.length > SHOWN ? ` and ${payments.length - SHOWN} more` : "";
  return {
    shouldNudge: true,
    title: payments.length === 1 ? `Upcoming payment: ${payments[0]!.name}` : `${payments.length} payments coming up`,
    message: `${line}${more}.${payments.length > 1 ? ` ${formatCurrency(total)} in total.` : ""} Make sure the balance covers it.`,
    type: "finance",
  };
}

export function habitsLeftReminder(names: string[]): NudgeDecision | null {
  if (names.length === 0) return null;
  return {
    shouldNudge: true,
    title: names.length === 1 ? `Habit left today: ${names[0]}` : `${names.length} habits left today`,
    message: names.length === 1 ? "Still time to keep the streak going." : `${listOf(names)}. Still time to keep the streaks going.`,
    type: "habit",
  };
}

// ── Runners ──────────────────────────────────────────────────────────────────

/** Every 15 minutes. Redis remembers each (task, due time) so a reminder fires once. */
export async function remindTasksDueSoon(redis: IORedis, now: Date = new Date()): Promise<void> {
  const tasks = await db.task.findMany({
    where: { completed: false, dueAt: { gt: now, lte: new Date(now.getTime() + DUE_SOON_WINDOW_MS) } },
    select: { id: true, userId: true, title: true, dueAt: true },
  });

  for (const task of tasks) {
    if (!task.dueAt || !hasDueTime(task.dueAt)) continue;
    const key = `noctis:reminded:task:${task.id}:${task.dueAt.getTime()}`;
    const first = await redis.set(key, "1", "EX", 2 * 24 * 60 * 60, "NX");
    if (first !== "OK") continue;
    await deliverNudge(task.userId, taskDueSoonReminder(task.title, task.dueAt), { url: "/tasks", tag: `task-${task.id}` });
  }
}

/** Morning: what's due today, plus anything overdue. */
export async function remindTasksToday(userId: string, now: Date = new Date()): Promise<void> {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const [dueToday, overdue] = await Promise.all([
    db.task.findMany({
      where: { userId, completed: false, dueAt: { gte: today, lt: tomorrow } },
      orderBy: { dueAt: "asc" },
      select: { title: true },
    }),
    db.task.count({ where: { userId, completed: false, dueAt: { lt: today } } }),
  ]);
  const reminder = tasksTodayReminder(
    dueToday.map((task) => task.title),
    overdue,
  );
  if (reminder) await deliverNudge(userId, reminder, { url: "/tasks", tag: "tasks-today" });
}

/** Morning: registered subscriptions that bill today or tomorrow and haven't been charged yet this month. */
export async function remindPaymentsDue(userId: string, now: Date = new Date()): Promise<void> {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const subscriptions = await db.subscription.findMany({
    where: { userId, active: true },
    select: { name: true, expectedAmount: true, billingDay: true, matchTitle: true },
  });

  const due: DuePayment[] = [];
  for (const subscription of subscriptions) {
    const isToday = billingDate(subscription.billingDay, today).getTime() === today.getTime();
    const isTomorrow = billingDate(subscription.billingDay, tomorrow).getTime() === tomorrow.getTime();
    if (!isToday && !isTomorrow) continue;

    const billOn = isToday ? today : tomorrow;
    const monthStart = new Date(billOn.getFullYear(), billOn.getMonth(), 1);
    const charged = await db.expense.findFirst({
      where: {
        userId,
        type: "expense",
        date: { gte: monthStart, lt: addDays(billOn, 1) },
        title: { contains: subscription.matchTitle || subscription.name, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (charged) continue;
    due.push({ name: subscription.name, amount: subscription.expectedAmount, today: isToday });
  }

  due.sort((a, b) => Number(b.today) - Number(a.today));
  const reminder = paymentsReminder(due);
  if (reminder) await deliverNudge(userId, reminder, { url: "/finance", tag: "payments-due" });
}

/** Evening: habits scheduled for today with no log yet. */
export async function remindHabitsLeft(userId: string, now: Date = new Date()): Promise<void> {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const habits = await db.habit.findMany({
    where: {
      userId,
      daysOfWeek: { has: today.getDay() },
      createdAt: { lt: tomorrow },
      OR: [{ endDate: null }, { endDate: { gte: today } }],
      logs: { none: { date: { gte: today, lt: tomorrow } } },
    },
    orderBy: { createdAt: "asc" },
    select: { name: true },
  });
  const reminder = habitsLeftReminder(habits.map((habit) => habit.name));
  if (reminder) await deliverNudge(userId, reminder, { url: "/habits", tag: "habits-left" });
}
