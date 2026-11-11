"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { SummaryBar } from "./SummaryBar";
import { ExpenseForm } from "./ExpenseForm";
import { FinanceCharts } from "./FinanceCharts";
import { TransactionTable } from "./TransactionTable";
import { CategoryManager } from "./CategoryManager";
import { BudgetsCard } from "./BudgetsCard";
import { SubscriptionsCard } from "./SubscriptionsCard";
import { useFinance, type FinanceSnapshot } from "../hooks/useFinance";
import { shortDay } from "../lib/finance.lib";

export function FinanceView({ initial }: { initial: FinanceSnapshot | null }) {
  const {
    expenses,
    categories,
    overview,
    subscriptions,
    loading,
    addExpense,
    removeExpense,
    updateExpense,
    setIncome,
    logSalary,
    setBudget,
    addCategory,
    editCategory,
    removeCategory,
  } = useFinance(initial);

  return (
    <>
      {overview && <SummaryBar overview={overview} onSetIncome={setIncome} onLogSalary={logSalary} />}

      {overview && (
        <div className="order-1 grid items-start gap-4 md:order-none md:grid-cols-2">
          <BudgetsCard
            budgets={overview.budgets}
            categories={categories}
            onSet={setBudget}
            periodLabel={overview.period.mode === "payday" ? `Since ${shortDay(overview.period.start)}` : "This month"}
          />
          {subscriptions && <SubscriptionsCard report={subscriptions} />}
        </div>
      )}

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
        {/* Only while there is nothing to show yet. A refetch after an edit must not unmount the
            table, or its filters, sort and page reset under the user's hands. */}
        {loading && expenses.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Loading transactions…</p>
        ) : (
          <TransactionTable
            categories={categories}
            expenses={expenses}
            onDelete={removeExpense}
            onUpdate={updateExpense}
          />
        )}
      </div>
    </>
  );
}
