"use client";

import { useEffect } from "react";
import { useFinanceStore } from "../store/financeStore";

export function useFinance() {
  const expenses = useFinanceStore((state) => state.expenses);
  const summary = useFinanceStore((state) => state.summary);
  const loading = useFinanceStore((state) => state.loading);
  const fetchAll = useFinanceStore((state) => state.fetchAll);
  const addExpense = useFinanceStore((state) => state.addExpense);
  const removeExpense = useFinanceStore((state) => state.removeExpense);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { expenses, summary, loading, addExpense, removeExpense };
}
