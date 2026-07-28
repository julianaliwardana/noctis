"use client";

import { useState } from "react";
import { Check, Plus, Tags, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PALETTE, paletteVar } from "../lib/finance.lib";
import type { CategoryDto, CategoryInput, ExpenseDto } from "../api/finance.api";

export interface CategoryManagerProps {
  categories: CategoryDto[];
  expenses: ExpenseDto[];
  onAdd: (name: string, color: string) => Promise<void>;
  onEdit: (id: string, input: CategoryInput) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

function ColorPicker({ value, onPick }: { value: string; onPick: (hex: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Change colour"
          className="size-5 shrink-0 rounded-full border border-[var(--color-border)]"
          style={{ backgroundColor: paletteVar(value) }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto">
        <div className="flex gap-1.5">
          {PALETTE.map((hex) => (
            <button
              key={hex}
              type="button"
              aria-label={`Use colour ${hex}`}
              aria-pressed={hex === value.toLowerCase()}
              onClick={() => {
                onPick(hex);
                setOpen(false);
              }}
              className={cn(
                "flex size-6 items-center justify-center rounded-full",
                hex === value.toLowerCase() && "ring-2 ring-[var(--color-text)] ring-offset-2 ring-offset-[var(--color-surface)]",
              )}
              style={{ backgroundColor: paletteVar(hex) }}
            >
              {hex === value.toLowerCase() && <Check className="size-3.5 text-white" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CategoryManager({ categories, expenses, onAdd, onEdit, onRemove }: CategoryManagerProps) {
  const [open, setOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState(PALETTE[0] as string);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function usageOf(name: string): number {
    return expenses.filter((expense) => expense.category === name).length;
  }

  /** Every mutation goes through here so a rejected rename/delete surfaces instead of vanishing. */
  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function submitNew(): Promise<void> {
    const name = draftName.trim();
    if (name === "") return;

    await run(() => onAdd(name, draftColor));
    setDraftName("");
  }

  async function rename(category: CategoryDto, next: string): Promise<void> {
    const name = next.trim();
    if (name === "" || name === category.name) return;
    await run(() => onEdit(category.id, { name }));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Tags />
          Categories
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Categories</DialogTitle>
          <DialogDescription>
            Renaming moves its transactions too. Deleting one moves them to Other.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {categories.map((category) => {
            const used = usageOf(category.name);
            return (
              <div key={category.id} className="flex items-center gap-2">
                <ColorPicker value={category.color} onPick={(color) => run(() => onEdit(category.id, { color }))} />
                <Input
                  defaultValue={category.name}
                  key={`${category.id}-${category.name}`}
                  aria-label={`Rename ${category.name}`}
                  disabled={busy}
                  onBlur={(event) => rename(category, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                    if (event.key === "Escape") event.currentTarget.value = category.name;
                  }}
                  className="h-8 flex-1"
                />
                <span className="w-16 shrink-0 text-right text-xs text-[var(--color-text-muted)]">
                  {used === 0 ? "unused" : `${used} tx`}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={busy || categories.length === 1}
                  aria-label={`Delete ${category.name}`}
                  onClick={() => run(() => onRemove(category.id))}
                  className="text-[var(--color-text-muted)] hover:text-destructive"
                >
                  <Trash2 />
                </Button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 border-t border-[var(--color-border)] pt-3">
          <ColorPicker value={draftColor} onPick={setDraftColor} />
          <Input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitNew();
              }
            }}
            placeholder="New category"
            aria-label="New category name"
            disabled={busy}
            className="h-8 flex-1"
          />
          <Button type="button" size="sm" disabled={busy || draftName.trim() === ""} onClick={submitNew}>
            <Plus />
            Add
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
