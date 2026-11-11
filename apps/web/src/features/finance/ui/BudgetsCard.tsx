"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { ApiError } from "@/lib/api";
import { useAmountsHidden, useMoney } from "@/lib/amountsPrivacy";
import { colorFor, parseRupiah } from "../lib/finance.lib";
import type { BudgetDto, CategoryDto } from "../api/finance.api";

export interface BudgetsCardProps {
  budgets: BudgetDto[];
  categories: CategoryDto[];
  onSet: (category: string, monthlyLimit: number | null) => Promise<void>;
}

/** Wallet top-ups never count as spend, so the server refuses a budget on them. */
const NOT_BUDGETABLE = new Set(["top-up"]);

interface BudgetEditorProps {
  /** Fixed category when editing; a list to choose from when adding. */
  category?: string;
  choices?: string[];
  limit?: number;
  categories: CategoryDto[];
  onSet: BudgetsCardProps["onSet"];
  children: React.ReactNode;
}

function BudgetEditor({ category, choices = [], limit, categories, onSet, children }: BudgetEditorProps) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(category ?? "");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hidden = useAmountsHidden();

  async function save(target: string, value: number | null): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await onSet(target, value);
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Couldn't save that");
    } finally {
      setBusy(false);
    }
  }

  function submit(): void {
    const value = parseRupiah(draft);
    if (picked === "") setError("Pick a category");
    else if (value === null) setError("Enter a monthly limit in rupiah");
    else void save(picked, value);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setPicked(category ?? choices[0] ?? "");
          setDraft(limit === undefined || hidden ? "" : String(limit));
          setError(null);
        }
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <p className="text-sm font-medium">{category ? `${category} budget` : "New budget"}</p>
          {!category && (
            <Select value={picked} onValueChange={setPicked}>
              <SelectTrigger className="w-full" aria-label="Category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {choices.map((name) => (
                  <SelectItem key={name} value={name}>
                    <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: colorFor(categories, name) }} />
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Input
            inputMode="numeric"
            autoFocus={Boolean(category)}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Monthly limit, e.g. 3.000.000"
            aria-label="Monthly limit"
            aria-invalid={error !== null}
            disabled={busy}
          />
          <p className="text-xs text-[var(--color-text-muted)]">You get a notification at 80% and again at 100%.</p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            {category && (
              <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={() => void save(category, null)}>
                Remove
              </Button>
            )}
            <Button type="submit" size="sm" disabled={busy}>
              Save
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function BudgetRow({ budget, categories, onSet }: { budget: BudgetDto } & Pick<BudgetsCardProps, "categories" | "onSet">) {
  const over = budget.state === "over";
  // Finance gold while there is room, the destructive tone once it is gone — never a third hue.
  const tone = over ? "var(--color-destructive)" : "var(--color-finance)";
  const money = useMoney();

  return (
    <li className="group flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: colorFor(categories, budget.category) }} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{budget.category}</span>
        <span className="shrink-0 font-[family-name:var(--font-mono)] text-sm">
          {money(budget.spent)}
          <span className="text-[var(--color-text-muted)]"> / {money(budget.limit)}</span>
        </span>
        <BudgetEditor category={budget.category} limit={budget.limit} categories={categories} onSet={onSet}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit ${budget.category} budget`}
            className="-mr-1 text-[var(--color-text-muted)]"
          >
            <Pencil />
          </Button>
        </BudgetEditor>
      </div>
      <div
        role="progressbar"
        aria-label={`${budget.category} budget used`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, Math.round(budget.percent))}
        className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]"
      >
        <div
          className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500"
          style={{ width: `${Math.min(100, Math.max(0, budget.percent))}%`, backgroundColor: tone }}
        />
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">
        <span style={{ color: budget.state === "ok" ? undefined : tone }}>{Math.round(budget.percent)}% used</span>
        {" · "}
        {over ? `${money(-budget.remaining)} over` : `${money(budget.remaining)} left`}
      </p>
    </li>
  );
}

export function BudgetsCard({ budgets, categories, onSet }: BudgetsCardProps) {
  const taken = new Set(budgets.map((budget) => budget.category));
  const choices = categories
    .map((category) => category.name)
    .filter((name) => !taken.has(name) && !NOT_BUDGETABLE.has(name.toLowerCase()));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budgets</CardTitle>
        {choices.length > 0 && (
          <CardAction>
            <BudgetEditor choices={choices} categories={categories} onSet={onSet}>
              <Button type="button" variant="outline" size="sm">
                <Plus />
                Add
              </Button>
            </BudgetEditor>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {budgets.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            No budgets yet. Set a monthly limit for a category and Noctis tells you when you get close.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {budgets.map((budget) => (
              <BudgetRow key={budget.category} budget={budget} categories={categories} onSet={onSet} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
