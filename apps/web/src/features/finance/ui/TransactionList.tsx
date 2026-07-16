import { formatCurrency, formatDate } from "@noctis/utils";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/shared/components/ui/empty";
import type { ExpenseDto } from "../api/finance.api";

function dayKey(date: string): string {
  return new Date(date).toDateString();
}

export interface TransactionListProps {
  expenses: ExpenseDto[];
  onDelete: (id: string) => void;
}

export function TransactionList({ expenses, onDelete }: TransactionListProps) {
  if (expenses.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No transactions yet</EmptyTitle>
          <EmptyDescription>Add your first expense or income above.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const groups = new Map<string, ExpenseDto[]>();
  for (const expense of expenses) {
    const key = dayKey(expense.date);
    const list = groups.get(key) ?? [];
    list.push(expense);
    groups.set(key, list);
  }

  return (
    <div className="flex flex-col gap-6">
      {Array.from(groups.entries()).map(([key, items]) => (
        <div key={key}>
          <h3 className="mb-1 px-1 text-xs font-medium tracking-wide text-[var(--color-text-muted)] uppercase">
            {formatDate((items[0] as ExpenseDto).date)}
          </h3>
          <div className="flex flex-col">
            {items.map((expense) => (
              <div
                key={expense.id}
                className="group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-[var(--color-border)]/20"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-[var(--color-text)]">{expense.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{expense.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-[family-name:var(--font-mono)] text-sm ${
                      expense.type === "income" ? "text-[var(--color-habits)]" : "text-[var(--color-text)]"
                    }`}
                  >
                    {expense.type === "income" ? "+" : "−"}
                    {formatCurrency(expense.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDelete(expense.id)}
                    aria-label={`Remove ${expense.title}`}
                    className="text-xs text-[var(--color-text-muted)] opacity-0 transition-opacity hover:text-[var(--color-passwords)] group-hover:opacity-100"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
