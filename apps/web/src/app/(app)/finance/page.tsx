"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { SummaryBar } from "@/features/finance/ui/SummaryBar";
import { ExpenseForm } from "@/features/finance/ui/ExpenseForm";
import { FinanceCharts } from "@/features/finance/ui/FinanceCharts";
import { TransactionTable } from "@/features/finance/ui/TransactionTable";
import { CategoryManager } from "@/features/finance/ui/CategoryManager";
import { useFinance } from "@/features/finance/hooks/useFinance";

export default function FinancePage() {
  const {
    expenses,
    categories,
    summary,
    loading,
    addExpense,
    removeExpense,
    addCategory,
    editCategory,
    removeCategory,
  } = useFinance();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-text)]">Finance</h1>
        <p className="text-sm text-[var(--color-text-muted)]">This month&apos;s income, expenses, and net.</p>
      </div>

      {summary && <SummaryBar summary={summary} />}

      <Card>
        <CardHeader>
          <CardTitle>Add transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseForm
            categories={categories}
            expenses={expenses}
            onAdd={addExpense}
            manageSlot={
              <CategoryManager
                categories={categories}
                expenses={expenses}
                onAdd={addCategory}
                onEdit={editCategory}
                onRemove={removeCategory}
              />
            }
          />
        </CardContent>
      </Card>

      <FinanceCharts categories={categories} expenses={expenses} />

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading transactions…</p>
      ) : (
        <TransactionTable categories={categories} expenses={expenses} onDelete={removeExpense} />
      )}
    </div>
  );
}
