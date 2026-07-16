import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, name, ...props }, ref) => {
    const inputId = id ?? name;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          name={name}
          className={cn(
            "h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)]",
            "placeholder:text-[var(--color-text-muted)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
            error && "border-[var(--color-passwords)]",
            className,
          )}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {error && <span className="text-sm text-[var(--color-passwords)]">{error}</span>}
      </div>
    );
  },
);

Input.displayName = "Input";
