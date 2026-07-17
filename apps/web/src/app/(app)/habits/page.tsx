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

      <div className="grid items-start gap-6 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(320px,380px)_1fr] xl:items-stretch">
        <div className="flex flex-col gap-6 xl:min-h-0 xl:overflow-y-auto">
          <Card className="shrink-0">
            <CardContent>
              <HabitForm onAdd={addHabit} />
            </CardContent>
          </Card>

          {loading ? (
            <p className="text-sm text-[var(--color-text-muted)]">Loading habits…</p>
          ) : (
            <HabitList habits={habits} onLog={logHabit} onColorChange={updateColor} onDelete={deleteHabit} />
          )}
        </div>

        <HabitsCalendar habits={habits} logs={logs} />
      </div>
    </div>
  );
}
