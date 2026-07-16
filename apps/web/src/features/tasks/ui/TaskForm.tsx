"use client";

import { useState, type FormEvent } from "react";
import { format, isSameDay } from "date-fns";
import { Clock, Repeat } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Calendar } from "@/shared/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { cn } from "@/lib/utils";
import type { CreateTaskInput } from "../api/tasks.api";

export interface TaskFormProps {
  onAdd: (input: CreateTaskInput) => void;
}

const RECURRENCE_OPTIONS = [
  { value: "none", label: "Does not repeat" },
  { value: "FREQ=DAILY", label: "Daily" },
  { value: "FREQ=WEEKLY", label: "Weekly" },
  { value: "FREQ=MONTHLY", label: "Monthly" },
];

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function TaskForm({ onAdd }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [recurrence, setRecurrence] = useState("none");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<Date | undefined>();
  const [draftTime, setDraftTime] = useState("");
  const [draftRecurrence, setDraftRecurrence] = useState("none");

  const today = startOfToday();
  const tomorrow = addDays(today, 1);

  function reset(): void {
    setTitle("");
    setNotes("");
    setDate(undefined);
    setTime("");
    setRecurrence("none");
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    const dueAt = date ? new Date(`${format(date, "yyyy-MM-dd")}T${time || "00:00"}`).toISOString() : undefined;

    onAdd({
      title: trimmed,
      notes: notes.trim() || undefined,
      dueAt,
      recurrence: recurrence === "none" ? undefined : recurrence,
    });
    reset();
  }

  function toggleQuickDate(target: Date): void {
    setDate((current) => (current && isSameDay(current, target) ? undefined : target));
  }

  function openPicker(): void {
    setDraftDate(date);
    setDraftTime(time);
    setDraftRecurrence(recurrence);
    setPopoverOpen(true);
  }

  function applyPicker(): void {
    setDate(draftDate);
    setTime(draftTime);
    setRecurrence(draftRecurrence);
    setPopoverOpen(false);
  }

  const customLabel =
    date && !isSameDay(date, today) && !isSameDay(date, tomorrow)
      ? format(date, time ? "MMM d, h:mm a" : "MMM d")
      : null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a task" aria-label="Task title" />
      <Textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Details"
        rows={1}
        className="min-h-8"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => toggleQuickDate(today)}
          aria-pressed={Boolean(date && isSameDay(date, today))}
          className={cn(date && isSameDay(date, today) && "border-primary bg-primary/10 text-primary")}
        >
          Today
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => toggleQuickDate(tomorrow)}
          aria-pressed={Boolean(date && isSameDay(date, tomorrow))}
          className={cn(date && isSameDay(date, tomorrow) && "border-primary bg-primary/10 text-primary")}
        >
          Tomorrow
        </Button>

        <Popover open={popoverOpen} onOpenChange={(open) => (open ? openPicker() : setPopoverOpen(false))}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size={customLabel ? "sm" : "icon-sm"}
              aria-label="Pick date and time"
              className={cn(customLabel && "border-primary text-primary")}
            >
              <Clock />
              {customLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto">
            <Calendar mode="single" selected={draftDate} onSelect={setDraftDate} autoFocus />
            <div className="flex items-center gap-2 border-t border-border pt-2.5">
              <Clock className="size-4 text-muted-foreground" />
              <Input
                type="time"
                value={draftTime}
                onChange={(event) => setDraftTime(event.target.value)}
                aria-label="Due time"
                className="h-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Repeat className="size-4 text-muted-foreground" />
              <Select value={draftRecurrence} onValueChange={setDraftRecurrence}>
                <SelectTrigger className="h-8 w-full" aria-label="Repeat frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setPopoverOpen(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={applyPicker}>
                Done
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button type="submit" size="sm" className="ml-auto">
          Add task
        </Button>
      </div>
    </form>
  );
}
