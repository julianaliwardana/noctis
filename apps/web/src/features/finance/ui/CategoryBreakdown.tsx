import { formatCurrency } from "@noctis/utils";
import type { ExpenseDto } from "../api/finance.api";

export function CategoryBreakdown({ expenses }: { expenses: ExpenseDto[] }) {
  const totals = new Map<string, number>();
  let max = 0;

  for (const expense of expenses) {
    if (expense.type !== "expense") continue;
    const total = (totals.get(expense.category) ?? 0) + expense.amount;
    totals.set(expense.category, total);
    if (total > max) max = total;
  }

  const entries = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h3 className="text-sm font-medium text-[var(--color-text)]">By category</h3>
      {entries.map(([category, total]) => (
        <div key={category} className="flex items-center gap-3">
          <span className="w-24 shrink-0 truncate text-xs text-[var(--color-text-muted)]">{category}</span>
          <div className="h-1.5 flex-1 rounded-full bg-[var(--color-border)]">
            <div
              className="h-1.5 rounded-full bg-[var(--color-finance)]"
              style={{ width: `${max > 0 ? (total / max) * 100 : 0}%` }}
            />
          </div>
          <span className="w-20 shrink-0 text-right font-[family-name:var(--font-mono)] text-xs text-[var(--color-text)]">
            {formatCurrency(total)}
          </span>
        </div>
      ))}
    </div>
  );
}
