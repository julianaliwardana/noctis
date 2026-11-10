"use client";

import { Card, CardContent } from "@/shared/components/ui/card";
import { TaskForm } from "@/features/tasks/ui/TaskForm";
import { TaskList } from "@/features/tasks/ui/TaskList";
import { useTasks } from "@/features/tasks/hooks/useTasks";
import { PageHeader } from "@/shared/components/PageHeader";

export default function TasksPage() {
  const { tasks, loading, addTask, completeTask, removeTask } = useTasks();
  const openCount = tasks.filter((task) => !task.completed).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Tasks" description={`${openCount} open`} />

      <Card>
        <CardContent>
          <TaskForm onAdd={addTask} />
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading tasks…</p>
      ) : (
        <TaskList tasks={tasks} onComplete={completeTask} onDelete={removeTask} />
      )}
    </div>
  );
}
