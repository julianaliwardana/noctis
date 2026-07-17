"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { HABIT_COLORS } from "../lib/colors";
import type { CreateHabitInput } from "../api/habits.api";

export interface HabitFormProps {
  onAdd: (input: CreateHabitInput) => void;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DURATION_OPTIONS = [
  { value: "ongoing", label: "Ongoing" },
  { value: "1", label: "For 1 month" },
  { value: "2", label: "For 2 months" },
  { value: "6", label: "For 6 months" },
];

export function HabitForm({ onAdd }: HabitFormProps) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(ALL_DAYS);
  const [duration, setDuration] = useState("ongoing");
  const [color, setColor] = useState(HABIT_COLORS[0] as string);

  function toggleDay(day: number): void {
    setDaysOfWeek((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
    );
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || daysOfWeek.length === 0) return;
    onAdd({
      name: trimmed,
      note: note.trim() || undefined,
      daysOfWeek,
      durationMonths: duration === "ongoing" ? undefined : (Number(duration) as 1 | 2 | 6),
      color,
    });
    setName("");
    setNote("");
    setDaysOfWeek(ALL_DAYS);
    setDuration("ongoing");
  }

  const summary =
    daysOfWeek.length === 7
      ? "Every day"
      : daysOfWeek.length === 0
        ? "Pick at least one day"
        : `Every ${daysOfWeek.map((day) => DAY_NAMES[day]).join(", ")}`;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="habit-name" className="text-xs font-medium text-[var(--color-text-muted)]">
          Habit
        </label>
        <Input
          id="habit-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Eat cake, Meditate, Run 5k"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="habit-note" className="text-xs font-medium text-[var(--color-text-muted)]">
          Note (optional)
        </label>
        <Textarea
          id="habit-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Why this habit? Any context…"
          rows={2}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Repeat on</span>
        <div className="flex gap-1" role="group" aria-label="Days of week">
          {DAY_LABELS.map((label, day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              aria-pressed={daysOfWeek.includes(day)}
              aria-label={DAY_NAMES[day]}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                daysOfWeek.includes(day)
                  ? "border-transparent text-white"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]",
              )}
              style={daysOfWeek.includes(day) ? { backgroundColor: color } : undefined}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">{summary}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[var(--color-text-muted)]">Duration</label>
        <Select value={duration} onValueChange={setDuration}>
          <SelectTrigger className="w-full" aria-label="Duration">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DURATION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">Color</span>
        <div className="flex gap-1.5" role="group" aria-label="Color">
          {HABIT_COLORS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => setColor(swatch)}
              aria-label={`Use color ${swatch}`}
              className={cn(
                "h-6 w-6 rounded-full ring-1 ring-black/10 transition-transform hover:scale-110",
                color === swatch && "ring-2 ring-offset-2 ring-offset-[var(--color-surface)]",
              )}
              style={{ backgroundColor: swatch }}
            />
          ))}
        </div>
      </div>

      <Button type="submit" disabled={!name.trim() || daysOfWeek.length === 0}>
        Add habit
      </Button>
    </form>
  );
}
