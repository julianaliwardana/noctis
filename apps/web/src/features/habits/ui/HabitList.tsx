import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/shared/components/ui/empty";
import { HabitCard } from "./HabitCard";
import type { HabitDto } from "../api/habits.api";

export interface HabitListProps {
  habits: HabitDto[];
  onLog: (id: string) => void;
}

export function HabitList({ habits, onLog }: HabitListProps) {
  if (habits.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No habits yet</EmptyTitle>
          <EmptyDescription>Add your first habit above — log it once a day to start a streak.</EmptyDescription>
        </EmptyHeader>
      </Empty>
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
