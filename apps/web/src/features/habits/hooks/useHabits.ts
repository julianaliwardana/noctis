"use client";

import { useServerSeed } from "@/lib/useServerSeed";
import { useHabitsStore } from "../store/habitsStore";
import type { HabitDto, HabitLogDto } from "../api/habits.api";

export interface HabitsSnapshot {
  habits: HabitDto[];
  /** Logs per habit id, so streak dots render without one request per habit. */
  logs: Record<string, HabitLogDto[]>;
}

export function useHabits(initial?: HabitsSnapshot | null) {
  const habits = useHabitsStore((state) => state.habits);
  const logs = useHabitsStore((state) => state.logs);
  const loading = useHabitsStore((state) => state.loading);
  const fetchHabits = useHabitsStore((state) => state.fetchHabits);
  const addHabit = useHabitsStore((state) => state.addHabit);
  const logHabit = useHabitsStore((state) => state.logHabit);
  const updateColor = useHabitsStore((state) => state.updateColor);
  const deleteHabit = useHabitsStore((state) => state.deleteHabit);

  const snapshot = useServerSeed(
    initial,
    (data) => useHabitsStore.setState({ habits: data.habits, logs: { ...useHabitsStore.getState().logs, ...data.logs }, loading: false }),
    fetchHabits,
  );

  return {
    habits: snapshot?.habits ?? habits,
    logs: snapshot ? { ...logs, ...snapshot.logs } : logs,
    /** True when logs came from the server, so rows needn't fetch their own. */
    serverLogs: Boolean(initial),
    loading: snapshot ? false : loading,
    addHabit,
    logHabit,
    updateColor,
    deleteHabit,
  };
}
