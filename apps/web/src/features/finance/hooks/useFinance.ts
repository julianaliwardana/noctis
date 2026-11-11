"use client";

import { useServerSeed } from "@/lib/useServerSeed";
import { useFinanceStore } from "../store/financeStore";
import type { CategoryDto, ExpenseDto, MonthlySummary, OverviewDto, SubscriptionsDto } from "../api/finance.api";

/** What a Server Component can hand over so the first paint already has the numbers. */
export interface FinanceSnapshot {
  expenses: ExpenseDto[];
  categories: CategoryDto[];
  summary: MonthlySummary;
  /** Only the finance page loads these two; the dashboard's snapshot leaves them out. */
  overview?: OverviewDto;
  subscriptions?: SubscriptionsDto;
}

export function useFinance(initial?: FinanceSnapshot | null) {
  const expenses = useFinanceStore((state) => state.expenses);
  const categories = useFinanceStore((state) => state.categories);
  const summary = useFinanceStore((state) => state.summary);
  const overview = useFinanceStore((state) => state.overview);
  const subscriptions = useFinanceStore((state) => state.subscriptions);
  const loading = useFinanceStore((state) => state.loading);
  const fetchAll = useFinanceStore((state) => state.fetchAll);
  const addExpense = useFinanceStore((state) => state.addExpense);
  const removeExpense = useFinanceStore((state) => state.removeExpense);
  const updateExpense = useFinanceStore((state) => state.updateExpense);
  const setIncome = useFinanceStore((state) => state.setIncome);
  const setBudget = useFinanceStore((state) => state.setBudget);
  const addCategory = useFinanceStore((state) => state.addCategory);
  const editCategory = useFinanceStore((state) => state.editCategory);
  const removeCategory = useFinanceStore((state) => state.removeCategory);

  const snapshot = useServerSeed(
    initial,
    (data) => useFinanceStore.setState({ ...data, loading: false }),
    fetchAll,
  );

  return {
    expenses: snapshot?.expenses ?? expenses,
    categories: snapshot?.categories ?? categories,
    summary: snapshot ? snapshot.summary : summary,
    overview: snapshot?.overview ?? overview,
    subscriptions: snapshot?.subscriptions ?? subscriptions,
    loading: snapshot ? false : loading,
    addExpense,
    removeExpense,
    updateExpense,
    setIncome,
    setBudget,
    addCategory,
    editCategory,
    removeCategory,
  };
}
