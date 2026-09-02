import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/shared/components/ui/empty";
import { HabitCard } from "./HabitCard";
import type { HabitDto } from "../api/habits.api";

export interface HabitListProps {
  habits: HabitDto[];
  onLog: (id: string, note?: string) => void;
  onColorChange: (id: string, color: string) => void;
  onDelete: (id: string) => void;
}

export function HabitList({ habits, onLog, onColorChange, onDelete }: HabitListProps) {
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
    // No height cap or scroller of its own: on mobile that nested a second scrollbar inside the
    // page and cut the list off at ~2.5 habits. The xl two-column layout gives its column the
    // bounded height and the scroll; everywhere else the list just flows and <main> scrolls.
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
      {habits.map((habit) => (
        <HabitCard key={habit.id} habit={habit} onLog={onLog} onColorChange={onColorChange} onDelete={onDelete} />
      ))}
    </div>
  );
}
