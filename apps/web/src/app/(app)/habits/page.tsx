"use client";

import { Card, CardContent } from "@/shared/components/ui/card";
import { HabitForm } from "@/features/habits/ui/HabitForm";
import { HabitList } from "@/features/habits/ui/HabitList";
import { HabitsCalendar } from "@/features/habits/ui/HabitsCalendar";
import { useHabits } from "@/features/habits/hooks/useHabits";

export default function HabitsPage() {
  const { habits, logs, loading, addHabit, logHabit, updateColor, deleteHabit } = useHabits();

  return (
    <div className="flex flex-col gap-6 xl:h-[calc(100dvh-4rem)]">
      <div className="shrink-0">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-text)]">Habits</h1>
        <p className="text-sm text-[var(--color-text-muted)]">{habits.length} tracked</p>
      </div>

      {/* Mobile order is today-first: check habits off, glance at the month, and only then the
          "add a habit" form — which is rare, and tall enough to bury everything below it.
          Desktop keeps the original two-column layout via explicit grid placement. */}
      <div className="grid items-start gap-6 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(320px,380px)_1fr] xl:grid-rows-[auto_minmax(0,1fr)] xl:items-stretch">
        <div className="order-1 xl:order-none xl:col-start-1 xl:row-start-2 xl:min-h-0 xl:overflow-y-auto">
          {loading ? (
            <p className="text-sm text-[var(--color-text-muted)]">Loading habits…</p>
          ) : (
            <HabitList habits={habits} onLog={logHabit} onColorChange={updateColor} onDelete={deleteHabit} />
          )}
        </div>

        <div className="order-2 min-h-0 xl:order-none xl:col-start-2 xl:row-span-2">
          <HabitsCalendar habits={habits} logs={logs} />
        </div>

        <Card className="order-3 shrink-0 xl:order-none xl:col-start-1 xl:row-start-1">
          <CardContent>
            <HabitForm onAdd={addHabit} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
