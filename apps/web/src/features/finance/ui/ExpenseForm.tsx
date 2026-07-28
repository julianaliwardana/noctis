"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { format, isSameDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/shared/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Calendar } from "@/shared/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group";
import { categoryNames, colorFor } from "../lib/finance.lib";
import type { CategoryDto, CreateExpenseInput, ExpenseDto } from "../api/finance.api";

export interface ExpenseFormProps {
  categories: CategoryDto[];
  expenses: ExpenseDto[];
  manageSlot?: React.ReactNode;
  onAdd: (input: CreateExpenseInput) => void;
}

export function ExpenseForm({ categories, expenses, manageSlot, onAdd }: ExpenseFormProps) {
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [date, setDate] = useState<Date>(() => new Date());
  const [dateOpen, setDateOpen] = useState(false);

  const names = useMemo(() => categoryNames(categories, expenses), [categories, expenses]);
  const parsed = Number(amount);
  const valid = title.trim() !== "" && category !== "" && Number.isFinite(parsed) && parsed > 0;

  // Categories load after first paint, and a rename or delete can retire the selected one.
  useEffect(() => {
    if (names.length > 0 && !names.includes(category)) setCategory(names.find((n) => n === "Other") ?? (names[0] as string));
  }, [names, category]);

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    if (!valid) return;

    onAdd({ title: title.trim(), amount: parsed, category, type, date: date.toISOString() });
    setAmount("");
    setTitle("");
    setDate(new Date());
  }

  return (
    <form onSubmit={handleSubmit} className="@container">
      <FieldGroup className="gap-4">
        <div className="grid gap-4 @md:grid-cols-[9rem_1fr]">
          <Field>
            <FieldLabel htmlFor="expense-amount">Amount</FieldLabel>
            <Input
              id="expense-amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
              inputMode="decimal"
              className="font-[family-name:var(--font-mono)]"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="expense-title">Description</FieldLabel>
            <Input
              id="expense-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What was it for?"
            />
          </Field>
        </div>

        <div className="grid gap-4 @md:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="expense-category">Category</FieldLabel>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="expense-category" className="w-full">
                <SelectValue placeholder="Pick a category" />
              </SelectTrigger>
              <SelectContent>
                {names.map((name) => (
                  <SelectItem key={name} value={name}>
                    <span
                      aria-hidden
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: colorFor(categories, name) }}
                    />
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="expense-date">Date</FieldLabel>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button id="expense-date" type="button" variant="outline" className="justify-start font-normal">
                  <CalendarIcon />
                  {isSameDay(date, new Date()) ? "Today" : format(date, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(next) => {
                    if (next) setDate(next);
                    setDateOpen(false);
                  }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
          </Field>

          <Field>
            <FieldLabel htmlFor="expense-type">Type</FieldLabel>
            <ToggleGroup
              id="expense-type"
              type="single"
              value={type}
              onValueChange={(next) => next && setType(next as "income" | "expense")}
              variant="outline"
              className="w-full"
            >
              <ToggleGroupItem
                value="expense"
                className="flex-1 data-[state=on]:bg-[var(--chart-expense)]/12 data-[state=on]:text-[var(--chart-expense)]"
              >
                Expense
              </ToggleGroupItem>
              <ToggleGroupItem
                value="income"
                className="flex-1 data-[state=on]:bg-[var(--chart-income)]/12 data-[state=on]:text-[var(--chart-income)]"
              >
                Income
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>
        </div>

        <div className="flex flex-col gap-2 @md:flex-row @md:justify-end">
          {manageSlot}
          <Button type="submit" disabled={!valid}>
            Add {type}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
