"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import type { HabitDto, HabitLogDto } from "../api/habits.api";

export interface HabitsCalendarProps {
  habits: HabitDto[];
  logs: Record<string, HabitLogDto[]>;
}

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MAX_CHIPS = 3;

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

function isScheduled(habit: HabitDto, date: Date): boolean {
  if (date < startOfDay(new Date(habit.createdAt))) return false;
  if (habit.endDate && date > startOfDay(new Date(habit.endDate))) return false;
  return habit.daysOfWeek.includes(date.getDay());
}

/** 42 cells: the 6-week grid containing the given month. */
function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

interface Chip {
  name: string;
  color: string;
  completed: boolean;
}

export function HabitsCalendar({ habits, logs }: HabitsCalendarProps) {
  const today = startOfDay(new Date());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  function shiftMonth(delta: number): void {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function chipsFor(date: Date): Chip[] {
    return habits
      .filter((habit) => isScheduled(habit, date))
      .map((habit) => ({
        name: habit.name,
        color: habit.color,
        completed: (logs[habit.id] ?? []).some((log) => isSameDay(new Date(log.date), date)),
      }));
  }

  const cells = monthGrid(viewYear, viewMonth);
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex min-h-0 flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] xl:h-full">
      <div className="flex shrink-0 items-center gap-2 p-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setViewYear(today.getFullYear());
            setViewMonth(today.getMonth());
          }}
        >
          Today
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
          <ChevronLeft />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => shiftMonth(1)}>
          <ChevronRight />
        </Button>
        <h2 className="ml-1 text-lg font-medium text-[var(--color-text)]">{monthLabel}</h2>
      </div>

      <div className="grid shrink-0 grid-cols-7 border-t border-[var(--color-border)]">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="border-r border-[var(--color-border)] py-1.5 text-center text-[11px] font-medium tracking-wide text-[var(--color-text-muted)] last:border-r-0"
          >
            {weekday}
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
        {cells.map((date, index) => {
          const inMonth = date.getMonth() === viewMonth;
          const isToday = isSameDay(date, today);
          const chips = chipsFor(date);
          const overflow = chips.length - MAX_CHIPS;

          return (
            <div
              key={index}
              className={cn(
                "flex min-h-24 flex-col gap-1 overflow-hidden border-t border-r border-[var(--color-border)] p-1.5 [&:nth-child(7n)]:border-r-0 xl:min-h-0",
                !inMonth && "bg-[var(--color-border)]/10",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center self-start rounded-full text-xs",
                  isToday
                    ? "bg-[var(--color-habits)] font-semibold text-white"
                    : inMonth
                      ? "text-[var(--color-text)]"
                      : "text-[var(--color-text-muted)]",
                )}
              >
                {date.getDate()}
              </span>

              {chips.slice(0, MAX_CHIPS).map((chip, chipIndex) => (
                <span
                  key={chipIndex}
                  title={`${chip.name}${chip.completed ? " ✓" : ""}`}
                  className={cn(
                    "truncate rounded px-1.5 py-0.5 text-[11px] leading-tight font-medium",
                    chip.completed ? "text-white" : "opacity-80",
                  )}
                  style={
                    chip.completed
                      ? { backgroundColor: chip.color }
                      : { backgroundColor: `${chip.color}2e`, color: chip.color }
                  }
                >
                  {chip.name}
                </span>
              ))}
              {overflow > 0 && (
                <span className="px-1.5 text-[11px] text-[var(--color-text-muted)]">{overflow} more</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
