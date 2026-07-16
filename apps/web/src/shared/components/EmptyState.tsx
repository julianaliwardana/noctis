import type { ReactNode } from "react";
import { cn } from "../utils/cn";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] p-10 text-center",
        className,
      )}
    >
      <p className="font-[family-name:var(--font-display)] text-lg text-[var(--color-text)]">
        {title}
      </p>
      {description && (
        <p className="max-w-sm text-sm text-[var(--color-text-muted)]">{description}</p>
      )}
      {action}
    </div>
  );
}
