"use client";

import { Card, CardContent } from "@/shared/components/ui/card";
import { SummaryBar } from "@/features/finance/ui/SummaryBar";
import { ExpenseForm } from "@/features/finance/ui/ExpenseForm";
import { TransactionList } from "@/features/finance/ui/TransactionList";
import { CategoryBreakdown } from "@/features/finance/ui/CategoryBreakdown";
import { useFinance } from "@/features/finance/hooks/useFinance";

export default function FinancePage() {
  const { expenses, summary, loading, addExpense, removeExpense } = useFinance();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-text)]">Finance</h1>
        <p className="text-sm text-[var(--color-text-muted)]">This month&apos;s income, expenses, and net.</p>
      </div>

      {summary && <SummaryBar summary={summary} />}

      <Card>
        <CardContent>
          <ExpenseForm onAdd={addExpense} />
        </CardContent>
      </Card>

      <CategoryBreakdown expenses={expenses} />

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading transactions…</p>
      ) : (
        <TransactionList expenses={expenses} onDelete={removeExpense} />
      )}
    </div>
  );
}
