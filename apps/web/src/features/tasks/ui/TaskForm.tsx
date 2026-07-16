"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/shared/components/Input";

export interface TaskFormProps {
  onAdd: (title: string) => void;
}

export function TaskForm({ onAdd }: TaskFormProps) {
  const [title, setTitle] = useState("");

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setTitle("");
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Add a task and press enter"
        aria-label="Add a task"
      />
    </form>
  );
}
