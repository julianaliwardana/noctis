"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import type { CreateExpenseInput } from "../api/finance.api";

const CATEGORIES = ["Food", "Transport", "Bills", "Shopping", "Health", "Other"];

export interface ExpenseFormProps {
  onAdd: (input: CreateExpenseInput) => void;
}

export function ExpenseForm({ onAdd }: ExpenseFormProps) {
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[CATEGORIES.length - 1] as string);
  const [type, setType] = useState<"income" | "expense">("expense");

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const parsed = Number(amount);
    if (!title.trim() || !Number.isFinite(parsed) || parsed <= 0) return;

    onAdd({ title: title.trim(), amount: parsed, category, type });
    setAmount("");
    setTitle("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Amount"
          inputMode="decimal"
          aria-label="Amount"
          className="w-32 font-[family-name:var(--font-mono)]"
        />
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What was it for?"
          aria-label="Description"
          className="flex-1"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Category"
          className="h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs text-[var(--color-text-muted)]"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex overflow-hidden rounded-md border border-[var(--color-border)] text-xs">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={cn("px-2 py-1", type === "expense" ? "bg-[var(--color-finance)] text-white" : "text-[var(--color-text-muted)]")}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={cn("px-2 py-1", type === "income" ? "bg-[var(--color-finance)] text-white" : "text-[var(--color-text-muted)]")}
          >
            Income
          </button>
        </div>
        <Button
          type="submit"
          size="sm"
          className="ml-auto"
          style={{ ["--color-primary" as string]: "var(--color-finance)" }}
        >
          Add expense
        </Button>
      </div>
    </form>
  );
}
