import { AnimatePresence, motion } from "motion/react";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/shared/components/ui/empty";
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
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Nothing on your list</EmptyTitle>
          <EmptyDescription>
            Add your first task above — it&apos;ll show up here, grouped by when it&apos;s due.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
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
            <h3 className="mb-1.5 px-3 text-xs font-medium tracking-wider text-[var(--color-text-muted)] uppercase">
              {label}
            </h3>
            {/* popLayout: a completed task leaves the flow at once and the rest spring up into its
                place, while it slides out on its own. */}
            <div className="flex flex-col">
              <AnimatePresence mode="popLayout" initial={false}>
                {items.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 32, transition: { type: "spring", stiffness: 300, damping: 30 } }}
                  >
                    <TaskCard task={task} onComplete={onComplete} onDelete={onDelete} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : null,
      )}
    </div>
  );
}
