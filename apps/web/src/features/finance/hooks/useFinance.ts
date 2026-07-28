"use client";

import { useEffect } from "react";
import { useFinanceStore } from "../store/financeStore";

export function useFinance() {
  const expenses = useFinanceStore((state) => state.expenses);
  const categories = useFinanceStore((state) => state.categories);
  const summary = useFinanceStore((state) => state.summary);
  const loading = useFinanceStore((state) => state.loading);
  const fetchAll = useFinanceStore((state) => state.fetchAll);
  const addExpense = useFinanceStore((state) => state.addExpense);
  const removeExpense = useFinanceStore((state) => state.removeExpense);
  const addCategory = useFinanceStore((state) => state.addCategory);
  const editCategory = useFinanceStore((state) => state.editCategory);
  const removeCategory = useFinanceStore((state) => state.removeCategory);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    expenses,
    categories,
    summary,
    loading,
    addExpense,
    removeExpense,
    addCategory,
    editCategory,
    removeCategory,
  };
}
