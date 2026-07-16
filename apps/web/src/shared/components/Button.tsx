import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonTone = "primary" | "tasks" | "habits" | "finance" | "passwords";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: "sm" | "md";
}

const toneVar: Record<ButtonTone, string> = {
  primary: "var(--color-primary)",
  tasks: "var(--color-tasks)",
  habits: "var(--color-habits)",
  finance: "var(--color-finance)",
  passwords: "var(--color-passwords)",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", tone = "primary", size = "md", style, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--btn-accent)]",
          "disabled:pointer-events-none disabled:opacity-50",
          size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm",
          variant === "primary" &&
            "bg-[var(--btn-accent)] text-[var(--color-primary-fg)] hover:brightness-110",
          variant === "secondary" &&
            "border border-[var(--color-border)] bg-transparent text-[var(--color-text)] hover:bg-[var(--color-border)]/30",
          variant === "ghost" &&
            "bg-transparent text-[var(--color-text)] hover:bg-[var(--color-border)]/30",
          className,
        )}
        style={{ ["--btn-accent" as string]: toneVar[tone], ...style }}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
