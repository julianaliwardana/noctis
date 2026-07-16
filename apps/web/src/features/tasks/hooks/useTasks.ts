"use client";

import { useEffect } from "react";
import { useTasksStore } from "../store/tasksStore";

export function useTasks() {
  const tasks = useTasksStore((state) => state.tasks);
  const loading = useTasksStore((state) => state.loading);
  const fetchTasks = useTasksStore((state) => state.fetchTasks);
  const addTask = useTasksStore((state) => state.addTask);
  const completeTask = useTasksStore((state) => state.completeTask);
  const removeTask = useTasksStore((state) => state.removeTask);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, addTask, completeTask, removeTask };
}
