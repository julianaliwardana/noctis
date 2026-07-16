"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/shared/components/Input";

export interface HabitFormProps {
  onAdd: (name: string) => void;
}

export function HabitForm({ onAdd }: HabitFormProps) {
  const [name, setName] = useState("");

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName("");
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Add a habit and press enter"
        aria-label="Add a habit"
      />
    </form>
  );
}
