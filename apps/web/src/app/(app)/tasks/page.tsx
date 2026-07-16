"use client";

import { Card } from "@/shared/components/Card";
import { TaskForm } from "@/features/tasks/ui/TaskForm";
import { TaskList } from "@/features/tasks/ui/TaskList";
import { useTasks } from "@/features/tasks/hooks/useTasks";

export default function TasksPage() {
  const { tasks, loading, addTask, completeTask, removeTask } = useTasks();
  const openCount = tasks.filter((task) => !task.completed).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-text)]">Tasks</h1>
        <p className="text-sm text-[var(--color-text-muted)]">{openCount} open</p>
      </div>

      <Card>
        <TaskForm onAdd={(title) => addTask({ title })} />
      </Card>

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading tasks…</p>
      ) : (
        <TaskList tasks={tasks} onComplete={completeTask} onDelete={removeTask} />
      )}
    </div>
  );
}
