"use client";

import { useId, type ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  /** Something to show instead of the label text, e.g. a swatch. The label stays as aria-label. */
  render?: ReactNode;
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  /** Hide the text and keep icons — the label moves to aria-label/title. */
  iconOnly?: boolean;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

/**
 * A radio group whose selected chip slides between options on a spring (shared layoutId), and a
 * hover chip that follows the pointer. Neutral on purpose: it reports a setting, it isn't an action.
 */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  iconOnly = false,
  orientation = "horizontal",
  className,
}: SegmentedProps<T>) {
  const id = useId();

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "relative flex gap-0.5 rounded-lg border border-[var(--color-border)] p-0.5",
        orientation === "vertical" ? "flex-col" : "items-center",
        className,
      )}
      onKeyDown={(event) => {
        const keys = orientation === "vertical" ? ["ArrowUp", "ArrowDown"] : ["ArrowLeft", "ArrowRight"];
        const step = event.key === keys[0] ? -1 : event.key === keys[1] ? 1 : 0;
        if (!step) return;
        event.preventDefault();
        const index = options.findIndex((option) => option.value === value);
        const next = options[(index + step + options.length) % options.length]!;
        onChange(next.value);
        (event.currentTarget.querySelector(`[data-value="${next.value}"]`) as HTMLElement | null)?.focus();
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            data-value={option.value}
            aria-checked={selected}
            aria-label={iconOnly || option.render ? option.label : undefined}
            title={iconOnly ? option.label : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "press relative flex h-7 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[calc(var(--radius)-2px)] px-2.5 text-xs font-medium outline-none select-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] active:scale-[0.96]",
              selected ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
            )}
          >
            {selected && (
              <motion.span
                layoutId={`${id}-selected`}
                aria-hidden
                className="absolute inset-0 rounded-[inherit] bg-[var(--color-border)] shadow-[0_1px_2px_rgb(0_0_0/0.08)]"
              />
            )}
            <span className="relative flex min-w-0 items-center gap-1.5">
              {option.icon}
              {option.render ?? (!iconOnly && <span className="truncate">{option.label}</span>)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
