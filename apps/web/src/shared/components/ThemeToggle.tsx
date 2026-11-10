"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import type { ThemePreference } from "@/lib/theme";
import { setThemePreference, useThemePreference } from "@/lib/themePreference";
import { cn } from "@/lib/utils";

const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

interface ThemeToggleProps {
  /** Show the option names next to the icons. Off in the rail, where there is no room. */
  showLabels?: boolean;
  className?: string;
}

/** Neutral on purpose: the selected option is a tonal chip, not cobalt — it reports a setting. */
export function ThemeToggle({ showLabels = false, className }: ThemeToggleProps) {
  const preference = useThemePreference();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn(
        "flex items-center gap-0.5 rounded-lg border border-[var(--color-border)] p-0.5",
        className,
      )}
    >
      {options.map(({ value, label, icon: Icon }) => {
        const selected = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={showLabels ? undefined : label}
            title={showLabels ? undefined : label}
            onClick={() => setThemePreference(value)}
            className={cn(
              "flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
              selected
                ? "bg-[var(--color-border)] text-[var(--color-text)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
            )}
          >
            <Icon strokeWidth={1.75} className="size-3.5 shrink-0" />
            {showLabels && label}
          </button>
        );
      })}
    </div>
  );
}
