import { EmptyState } from "@/shared/components/EmptyState";
import { TaskCard } from "./TaskCard";
import type { TaskDto } from "../api/tasks.api";

export interface TaskListProps {
  tasks: TaskDto[];
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

interface TaskGroups {
  overdue: TaskDto[];
  today: TaskDto[];
  upcoming: TaskDto[];
  noDate: TaskDto[];
}

function groupTasks(tasks: TaskDto[]): TaskGroups {
  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const groups: TaskGroups = { overdue: [], today: [], upcoming: [], noDate: [] };

  for (const task of tasks) {
    if (task.completed) continue;

    if (!task.dueAt) {
      groups.noDate.push(task);
      continue;
    }

    const due = new Date(task.dueAt);
    if (due < today) groups.overdue.push(task);
    else if (due < tomorrow) groups.today.push(task);
    else groups.upcoming.push(task);
  }

  return groups;
}

export function TaskList({ tasks, onComplete, onDelete }: TaskListProps) {
  const active = tasks.filter((task) => !task.completed);

  if (active.length === 0) {
    return (
      <EmptyState
        title="Nothing on your list"
        description="Add your first task above — it'll show up here, grouped by when it's due."
      />
    );
  }

  const groups = groupTasks(tasks);
  const sections: Array<[string, TaskDto[]]> = [
    ["Overdue", groups.overdue],
    ["Today", groups.today],
    ["Upcoming", groups.upcoming],
    ["No date", groups.noDate],
  ];

  return (
    <div className="flex flex-col gap-6">
      {sections.map(([label, items]) =>
        items.length > 0 ? (
          <div key={label}>
            <h3 className="mb-1 px-3 text-xs font-medium tracking-wide text-[var(--color-text-muted)] uppercase">
              {label}
            </h3>
            <div className="flex flex-col">
              {items.map((task) => (
                <TaskCard key={task.id} task={task} onComplete={onComplete} onDelete={onDelete} />
              ))}
            </div>
          </div>
        ) : null,
      )}
    </div>
  );
}
