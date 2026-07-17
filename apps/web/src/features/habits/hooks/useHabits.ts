"use client";

import { useEffect } from "react";
import { useHabitsStore } from "../store/habitsStore";

export function useHabits() {
  const habits = useHabitsStore((state) => state.habits);
  const logs = useHabitsStore((state) => state.logs);
  const loading = useHabitsStore((state) => state.loading);
  const fetchHabits = useHabitsStore((state) => state.fetchHabits);
  const addHabit = useHabitsStore((state) => state.addHabit);
  const logHabit = useHabitsStore((state) => state.logHabit);
  const updateColor = useHabitsStore((state) => state.updateColor);
  const deleteHabit = useHabitsStore((state) => state.deleteHabit);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  return { habits, logs, loading, addHabit, logHabit, updateColor, deleteHabit };
}
