import { formatCurrency } from "@noctis/utils";
import type { MonthlySummary } from "../api/finance.api";

export function SummaryBar({ summary }: { summary: MonthlySummary }) {
  return (
    <div className="grid grid-cols-3 gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div>
        <p className="text-xs text-[var(--color-text-muted)]">Income</p>
        <p className="font-[family-name:var(--font-mono)] text-lg text-[var(--color-habits)]">
          {formatCurrency(summary.income)}
        </p>
      </div>
      <div>
        <p className="text-xs text-[var(--color-text-muted)]">Expenses</p>
        <p className="font-[family-name:var(--font-mono)] text-lg text-[var(--color-tasks)]">
          {formatCurrency(summary.expense)}
        </p>
      </div>
      <div>
        <p className="text-xs text-[var(--color-text-muted)]">Net</p>
        <p className="font-[family-name:var(--font-mono)] text-lg text-[var(--color-finance)]">
          {formatCurrency(summary.net)}
        </p>
      </div>
    </div>
  );
}
