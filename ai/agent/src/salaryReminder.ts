import { db } from "@noctis/db";
import type { NudgeDecision } from "@noctis/types";
import { SALARY_CATEGORY, currentSalaryCycle, formatCurrency } from "@noctis/utils";
import type { SalaryCycle } from "@noctis/utils";
import { deliverNudge } from "./delivery";

const DAY_MS = 24 * 60 * 60 * 1000;
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDate(date: Date): string {
  const shifted = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return `${shifted.getUTCDate()} ${SHORT_MONTHS[shifted.getUTCMonth()]}`;
}

/**
 * The evening nudge once payday has come with no salary logged — until it is, the old pay cycle
 * keeps running and the budgets keep counting against it. Null when nothing is due.
 */
export function salaryReminder(cycle: SalaryCycle, expected: number | null): NudgeDecision | null {
  if (!cycle.salaryDue) return null;
  const amount = expected === null ? "" : ` (usually ${formatCurrency(expected)})`;
  const when =
    cycle.daysLate === 0 ? "Payday is today" : `Salary was expected ${shortDate(cycle.expectedNext)}, ${cycle.daysLate} ${cycle.daysLate === 1 ? "day" : "days"} ago`;
  return {
    shouldNudge: true,
    title: "Has your salary arrived?",
    message: `${when}. Log it${amount} on the finance page or tell Noctis Chat, and a new pay cycle starts.`,
    type: "finance",
  };
}

export async function remindSalaryDue(userId: string, now: Date = new Date()): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { payday: true, monthlyIncome: true } });
  if (!user?.payday) return;

  const salaries = await db.expense.findMany({
    where: {
      userId,
      type: "income",
      category: { equals: SALARY_CATEGORY, mode: "insensitive" },
      date: { gte: new Date(now.getTime() - 120 * DAY_MS) },
    },
    select: { date: true },
  });

  const reminder = salaryReminder(
    currentSalaryCycle(
      salaries.map((salary) => salary.date),
      user.payday,
      now,
    ),
    user.monthlyIncome,
  );
  if (reminder) await deliverNudge(userId, reminder);
}
