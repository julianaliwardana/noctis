import { db } from "@noctis/db";
import type { NudgeDecision } from "@noctis/types";
import { deliverNudge } from "./delivery";

const SHOWN = 3;

/**
 * The evening reminder for transactions whose category is still a guess (a transfer to someone
 * new, an unnamed store charge). Null when nothing is waiting — no reminder then.
 */
export function reviewReminder(titles: string[], total: number): NudgeDecision | null {
  if (total === 0) return null;
  const shown = titles.slice(0, SHOWN).join(", ");
  const more = total - Math.min(titles.length, SHOWN);
  return {
    shouldNudge: true,
    title: total === 1 ? "1 transaction needs a category" : `${total} transactions need a category`,
    message: more > 0 ? `${shown} and ${more} more.` : `${shown}.`,
    type: "finance",
  };
}

export async function remindPendingReviews(userId: string): Promise<void> {
  const where = { userId, needsReview: true };
  const [total, newest] = await Promise.all([
    db.expense.count({ where }),
    db.expense.findMany({ where, orderBy: { date: "desc" }, take: SHOWN, select: { title: true } }),
  ]);

  const reminder = reviewReminder(
    newest.map((expense) => expense.title),
    total,
  );
  if (reminder) await deliverNudge(userId, reminder);
}
