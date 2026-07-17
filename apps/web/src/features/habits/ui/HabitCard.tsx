"use client";

import { useState } from "react";
import { Check, StickyNote, Trash2 } from "lucide-react";
import { useHabitLogs } from "../hooks/useHabitLogs";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";
import { HABIT_COLORS } from "../lib/colors";
import type { HabitDto } from "../api/habits.api";

export interface HabitCardProps {
  habit: HabitDto;
  onLog: (id: string, note?: string) => void;
  onColorChange: (id: string, color: string) => void;
  onDelete: (id: string) => void;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export function HabitCard({ habit, onLog, onColorChange, onDelete }: HabitCardProps) {
  const logs = useHabitLogs(habit.id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayLog = logs.find((log) => isSameDay(new Date(log.date), today));
  const loggedToday = todayLog !== undefined;
  const [noteDraft, setNoteDraft] = useState(todayLog?.note ?? "");

  function handleSaveNote(): void {
    onLog(habit.id, noteDraft.trim() || undefined);
  }

  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`Change color for ${habit.name}`}
                className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: habit.color }}
              />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto">
              <div className="flex flex-wrap gap-1.5">
                {HABIT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Set color ${color}`}
                    onClick={() => onColorChange(habit.id, color)}
                    className={cn(
                      "h-6 w-6 rounded-full ring-1 ring-black/10 transition-transform hover:scale-110",
                      habit.color === color && "ring-2 ring-offset-2 ring-offset-[var(--color-surface)]",
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--color-text)]">{habit.name}</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {habit.streak} day streak · best {habit.longestStreak}
            </p>
            {habit.note && (
              <p className="truncate text-xs text-[var(--color-text-muted)]" title={habit.note}>
                {habit.note}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${habit.name}`}
            onClick={() => onDelete(habit.id)}
            className="text-[var(--color-text-muted)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--color-passwords)]"
          >
            <Trash2 />
          </Button>
          <Popover onOpenChange={(open) => open && setNoteDraft(todayLog?.note ?? "")}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Add note for ${habit.name}`}
                style={{ color: todayLog?.note ? habit.color : undefined }}
              >
                <StickyNote />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end">
              <Textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="What's the context? (optional)"
                rows={3}
              />
              <Button type="button" size="sm" onClick={handleSaveNote}>
                Save
              </Button>
            </PopoverContent>
          </Popover>
          <button
            type="button"
            onClick={() => onLog(habit.id)}
            disabled={loggedToday}
            aria-label={loggedToday ? `${habit.name} logged today` : `Log ${habit.name}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm text-[var(--color-text-muted)] transition-colors"
            style={
              loggedToday
                ? { borderColor: habit.color, backgroundColor: habit.color, color: "white" }
                : { borderColor: "var(--color-border)" }
            }
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
}
