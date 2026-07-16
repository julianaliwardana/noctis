"use client";

import { useEffect } from "react";
import { useHabitsStore } from "../store/habitsStore";

export function useHabits() {
  const habits = useHabitsStore((state) => state.habits);
  const loading = useHabitsStore((state) => state.loading);
  const fetchHabits = useHabitsStore((state) => state.fetchHabits);
  const addHabit = useHabitsStore((state) => state.addHabit);
  const logHabit = useHabitsStore((state) => state.logHabit);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  return { habits, loading, addHabit, logHabit };
}
