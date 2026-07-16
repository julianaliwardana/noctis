"use client";

import { useHabitLogs } from "../hooks/useHabitLogs";
import { cn } from "@/shared/utils/cn";
import type { HabitDto } from "../api/habits.api";

export interface HabitCardProps {
  habit: HabitDto;
  onLog: (id: string) => void;
}

function lastSevenDays(): Date[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export function HabitCard({ habit, onLog }: HabitCardProps) {
  const logs = useHabitLogs(habit.id);
  const days = lastSevenDays();
  const today = days[days.length - 1] as Date;
  const loggedToday = logs.some((log) => isSameDay(new Date(log.date), today));

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--color-text)]">{habit.name}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{habit.streak} day streak</p>
        </div>
        <button
          type="button"
          onClick={() => onLog(habit.id)}
          disabled={loggedToday}
          aria-label={loggedToday ? `${habit.name} logged today` : `Log ${habit.name}`}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm transition-colors",
            loggedToday
              ? "border-[var(--color-habits)] bg-[var(--color-habits)] text-white"
              : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-habits)]",
          )}
        >
          ✓
        </button>
      </div>
      <div className="flex gap-1.5">
        {days.map((day) => {
          const done = logs.some((log) => isSameDay(new Date(log.date), day));
          return (
            <span
              key={day.toISOString()}
              className={cn("h-2 flex-1 rounded-full", done ? "bg-[var(--color-habits)]" : "bg-[var(--color-border)]")}
              aria-hidden
            />
          );
        })}
      </div>
    </div>
  );
}
