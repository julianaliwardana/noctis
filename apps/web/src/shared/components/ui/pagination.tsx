"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** 1 … 4 5 6 … 12 — first, last, the current page and one either side. */
export function pageWindow(current: number, count: number): (number | "gap")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i);
  const pages = new Set([0, count - 1, current - 1, current, current + 1]);
  if (current <= 2) [1, 2, 3].forEach((p) => pages.add(p));
  if (current >= count - 3) [count - 4, count - 3, count - 2].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 0 && p < count).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((page, i) => {
    if (i > 0 && page - sorted[i - 1]! > 1) out.push("gap");
    out.push(page);
  });
  return out;
}

interface PaginationProps {
  /** Zero-based. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** e.g. "11–20 of 56" — shown on the left in every style. */
  summary?: string;
  className?: string;
}

const stepButton =
  "press inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 text-sm font-medium text-[var(--color-text)] outline-none hover:bg-[var(--color-border)]/50 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 pg-compact:w-8 pg-compact:justify-center pg-compact:px-0";

/**
 * Three layouts from one markup (Profile → Appearance → Pagination), switched in CSS so the server
 * render always matches: numbered (page buttons, active page on a sliding pill), simple
 * (Previous / Next + "Page 2 of 6"), compact (arrows + "2 / 6").
 */
export function Pagination({ page, pageCount, onPageChange, summary, className }: PaginationProps) {
  const id = useId();
  const atStart = page <= 0;
  const atEnd = page >= pageCount - 1;

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-sm text-[var(--color-text-muted)]",
        className,
      )}
    >
      <p className="tabular-nums">{summary}</p>

      <div className="flex items-center gap-2 md:gap-3">
        <button type="button" className={stepButton} disabled={atStart} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="size-4" />
          <span className="pg-compact:hidden pg-numbered:max-sm:hidden">Previous</span>
        </button>

        <ol className="hidden items-center gap-1 pg-numbered:flex">
          {pageWindow(page, pageCount).map((item, i) =>
            item === "gap" ? (
              <li key={`gap-${i}`} aria-hidden className="w-6 text-center select-none">
                …
              </li>
            ) : (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => onPageChange(item)}
                  aria-current={item === page ? "page" : undefined}
                  aria-label={`Page ${item + 1}`}
                  className={cn(
                    "press relative flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.94]",
                    item === page
                      ? "font-medium text-[var(--color-primary-fg)]"
                      : "text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/50 hover:text-[var(--color-text)]",
                  )}
                >
                  {item === page && (
                    <motion.span
                      layoutId={`${id}-page`}
                      aria-hidden
                      className="absolute inset-0 rounded-[inherit] bg-[var(--color-primary)] shadow-[0_4px_14px_-4px_color-mix(in_srgb,var(--color-primary)_70%,transparent)]"
                    />
                  )}
                  <span className="relative">{item + 1}</span>
                </button>
              </li>
            ),
          )}
        </ol>

        <span className="hidden tabular-nums whitespace-nowrap text-[var(--color-text)] pg-compact:inline pg-simple:inline">
          <span className="pg-compact:hidden">Page </span>
          {page + 1}
          <span className="pg-compact:hidden"> of </span>
          <span className="hidden pg-compact:inline"> / </span>
          {pageCount}
        </span>

        <button type="button" className={stepButton} disabled={atEnd} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <span className="pg-compact:hidden pg-numbered:max-sm:hidden">Next</span>
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  );
}
