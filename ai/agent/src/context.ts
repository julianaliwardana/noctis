import { db } from "@noctis/db";

export interface UserContext {
  pendingTasks: Array<{ id: string; title: string; dueAt: Date | null }>;
  habitStreaks: Array<{ id: string; name: string; streak: number }>;
  monthSpend: number;
  lastNudgeAt: Date | null;
}

export async function gatherContext(userId: string): Promise<UserContext> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [pendingTasks, habits, expenses, lastNudge] = await Promise.all([
    db.task.findMany({
      where: { userId, completed: false },
      orderBy: { dueAt: "asc" },
      take: 5,
      select: { id: true, title: true, dueAt: true },
    }),
    db.habit.findMany({
      where: { userId },
      select: { id: true, name: true, streak: true },
    }),
    db.expense.findMany({
      where: { userId, type: "expense", date: { gte: monthStart } },
      select: { amount: true },
    }),
    db.nudge.findFirst({
      where: { userId },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true },
    }),
  ]);

  return {
    pendingTasks,
    habitStreaks: habits,
    monthSpend: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    lastNudgeAt: lastNudge?.sentAt ?? null,
  };
}
