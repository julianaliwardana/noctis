import { EmptyState } from "@/shared/components/EmptyState";
import { HabitCard } from "./HabitCard";
import type { HabitDto } from "../api/habits.api";

export interface HabitListProps {
  habits: HabitDto[];
  onLog: (id: string) => void;
}

export function HabitList({ habits, onLog }: HabitListProps) {
  if (habits.length === 0) {
    return (
      <EmptyState
        title="No habits yet"
        description="Add your first habit above — log it once a day to start a streak."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {habits.map((habit) => (
        <HabitCard key={habit.id} habit={habit} onLog={onLog} />
      ))}
    </div>
  );
}
