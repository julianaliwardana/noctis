"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import type { ThemePreference } from "@/lib/theme";
import { setThemePreference, useThemePreference } from "@/lib/themePreference";
import { Segmented, type SegmentedOption } from "@/shared/components/Segmented";

const iconClass = "size-3.5 shrink-0";

const options: SegmentedOption<ThemePreference>[] = [
  { value: "light", label: "Light", icon: <Sun strokeWidth={1.75} className={iconClass} /> },
  { value: "dark", label: "Dark", icon: <Moon strokeWidth={1.75} className={iconClass} /> },
  { value: "system", label: "System", icon: <Monitor strokeWidth={1.75} className={iconClass} /> },
];

interface ThemeToggleProps {
  /** Show the option names next to the icons. Off in the rail, where there is no room. */
  showLabels?: boolean;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function ThemeToggle({ showLabels = false, orientation, className }: ThemeToggleProps) {
  const preference = useThemePreference();

  return (
    <Segmented
      label="Theme"
      value={preference}
      options={options}
      onChange={setThemePreference}
      iconOnly={!showLabels}
      orientation={orientation}
      className={className}
    />
  );
}
