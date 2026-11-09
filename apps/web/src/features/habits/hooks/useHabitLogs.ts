"use client";

import { useEffect } from "react";
import { useHabitsStore } from "../store/habitsStore";
import type { HabitLogDto } from "../api/habits.api";

/**
 * Logs for one habit. Pass `initial` when the page already has them from the server: the row then
 * skips its own request (it would otherwise fire before the page has seeded the store).
 */
export function useHabitLogs(habitId: string, initial?: HabitLogDto[]): HabitLogDto[] {
  const logs = useHabitsStore((state) => state.logs[habitId]);
  const fetchLogs = useHabitsStore((state) => state.fetchLogs);
  const hasInitial = initial !== undefined;

  useEffect(() => {
    if (!hasInitial) fetchLogs(habitId);
  }, [habitId, fetchLogs, hasInitial]);

  return logs ?? initial ?? [];
}
