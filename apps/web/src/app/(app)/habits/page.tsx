"use client";

import { Card, CardContent } from "@/shared/components/ui/card";
import { HabitForm } from "@/features/habits/ui/HabitForm";
import { HabitList } from "@/features/habits/ui/HabitList";
import { useHabits } from "@/features/habits/hooks/useHabits";

export default function HabitsPage() {
  const { habits, loading, addHabit, logHabit } = useHabits();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-text)]">Habits</h1>
        <p className="text-sm text-[var(--color-text-muted)]">{habits.length} tracked</p>
      </div>

      <Card>
        <CardContent>
          <HabitForm onAdd={(name) => addHabit({ name })} />
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading habits…</p>
      ) : (
        <HabitList habits={habits} onLog={logHabit} />
      )}
    </div>
  );
}
