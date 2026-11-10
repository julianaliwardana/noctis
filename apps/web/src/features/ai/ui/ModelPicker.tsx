"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Cpu } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ChatModel } from "../types";

interface ModelPickerProps {
  models: ChatModel[];
  value: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
}

const chip =
  "inline-flex h-7 max-w-[11rem] items-center gap-1.5 rounded-full border border-[var(--color-border)] px-2.5 text-xs text-[var(--color-text-muted)]";

/**
 * The options are the server's allowlist, never a free-text field — the server ignores anything
 * else, and the list is what keeps finance data on providers the user has vetted.
 */
export function ModelPicker({ models, value, onChange, disabled }: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  if (models.length === 0) return null;

  const current = models.find((model) => model.id === value) ?? models[0]!;

  // One model is a readout, not a control.
  if (models.length === 1) {
    return (
      <span className={chip} title={current.id}>
        <Cpu aria-hidden className="size-3.5 shrink-0" />
        <span className="truncate">{current.label}</span>
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={`Model: ${current.label}. Change model`}
          className={cn(
            chip,
            "transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-text)]",
            "focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none",
            "disabled:pointer-events-none disabled:opacity-50 data-[state=open]:border-[var(--color-primary)] data-[state=open]:text-[var(--color-text)]",
          )}
        >
          <Cpu aria-hidden className="size-3.5 shrink-0 text-[var(--color-primary-text)]" />
          <span className="truncate">{current.label}</span>
          <ChevronsUpDown aria-hidden className="size-3 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        className="w-64 gap-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 ring-0"
      >
        <p className="px-2 pt-1 pb-1.5 text-xs text-[var(--color-text-muted)]">Model</p>

        <div role="listbox" aria-label="Model" className="flex flex-col gap-0.5">
          {models.map((model, index) => {
            const selected = model.id === current.id;
            return (
              <button
                key={model.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(model.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                  "hover:bg-[color-mix(in_oklab,var(--color-primary)_10%,transparent)] focus-visible:bg-[color-mix(in_oklab,var(--color-primary)_10%,transparent)] focus-visible:outline-none",
                  selected && "bg-[color-mix(in_oklab,var(--color-primary)_14%,transparent)]",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-1.5 text-sm text-[var(--color-text)]">
                    <span className="truncate">{model.label}</span>
                    {index === 0 && <span className="shrink-0 text-xs text-[var(--color-text-muted)]">default</span>}
                  </span>
                  <span className="block truncate text-xs text-[var(--color-text-muted)]">{model.id}</span>
                </span>
                <Check
                  aria-hidden
                  className={cn("size-4 shrink-0 text-[var(--color-primary-text)]", !selected && "invisible")}
                />
              </button>
            );
          })}
        </div>

        <p className="mt-1.5 border-t border-[var(--color-border)] px-2 pt-2 pb-1 text-xs text-[var(--color-text-muted)]">
          Only models your server allows — your finance data stays with them.
        </p>
      </PopoverContent>
    </Popover>
  );
}
