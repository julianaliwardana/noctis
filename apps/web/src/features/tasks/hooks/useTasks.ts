"use client";

import { useServerSeed } from "@/lib/useServerSeed";
import { useTasksStore } from "../store/tasksStore";
import type { TaskDto } from "../api/tasks.api";

export interface TasksSnapshot {
  tasks: TaskDto[];
}

export function useTasks(initial?: TasksSnapshot | null) {
  const tasks = useTasksStore((state) => state.tasks);
  const loading = useTasksStore((state) => state.loading);
  const fetchTasks = useTasksStore((state) => state.fetchTasks);
  const addTask = useTasksStore((state) => state.addTask);
  const completeTask = useTasksStore((state) => state.completeTask);
  const removeTask = useTasksStore((state) => state.removeTask);

  const snapshot = useServerSeed(
    initial,
    (data) => useTasksStore.setState({ tasks: data.tasks, loading: false }),
    fetchTasks,
  );

  return { tasks: snapshot?.tasks ?? tasks, loading: snapshot ? false : loading, addTask, completeTask, removeTask };
}
