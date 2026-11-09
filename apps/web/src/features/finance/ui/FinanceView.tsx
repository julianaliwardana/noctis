"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { SummaryBar } from "./SummaryBar";
import { ExpenseForm } from "./ExpenseForm";
import { FinanceCharts } from "./FinanceCharts";
import { TransactionTable } from "./TransactionTable";
import { CategoryManager } from "./CategoryManager";
import { useFinance, type FinanceSnapshot } from "../hooks/useFinance";

export function FinanceView({ initial }: { initial: FinanceSnapshot | null }) {
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
  } = useFinance(initial);

  return (
    <>
      {summary && <SummaryBar summary={summary} />}

      {/* Mobile pulls the charts above this form: the form is ~450px tall, which pushed every
          chart off the first two screens. order-* only applies below md, so desktop is unchanged. */}
      <Card className="order-3 md:order-none">
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

      <div className="order-2 md:order-none">
        <FinanceCharts categories={categories} expenses={expenses} />
      </div>

      <div className="order-4 md:order-none">
        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Loading transactions…</p>
        ) : (
          <TransactionTable categories={categories} expenses={expenses} onDelete={removeExpense} />
        )}
      </div>
    </>
  );
}
