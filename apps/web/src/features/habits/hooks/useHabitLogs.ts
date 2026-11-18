"use client";

import { useEffect } from "react";
import { useHabitsStore } from "../store/habitsStore";
import type { HabitLogDto } from "../api/habits.api";

/** Logs for one habit; skips the fetch when `initial` came from the server. */
export function useHabitLogs(habitId: string, initial?: HabitLogDto[]): HabitLogDto[] {
  const logs = useHabitsStore((state) => state.logs[habitId]);
  const fetchLogs = useHabitsStore((state) => state.fetchLogs);
  const hasInitial = initial !== undefined;

  useEffect(() => {
    if (!hasInitial) fetchLogs(habitId);
  }, [habitId, fetchLogs, hasInitial]);

  return logs ?? initial ?? [];
}
