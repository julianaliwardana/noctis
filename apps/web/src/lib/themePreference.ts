import { useSyncExternalStore } from "react";
import { DARK_QUERY, THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme";

function isPreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isPreference(stored) ? stored : "system";
  } catch {
    // Storage can throw in private mode or when blocked; the theme then just follows the system.
    return "system";
  }
}

function resolveIsDark(preference: ThemePreference): boolean {
  if (preference === "system") return window.matchMedia(DARK_QUERY).matches;
  return preference === "dark";
}

function applyTheme(preference: ThemePreference): void {
  const root = document.documentElement;
  const dark = resolveIsDark(preference);
  if (root.classList.contains("dark") === dark) return;

  root.classList.add("theme-switching");
  root.classList.toggle("dark", dark);
  // Two frames: one for the new colours to be computed, one for them to paint, then transitions
  // come back.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.remove("theme-switching"));
  });
}

const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);

  const media = window.matchMedia(DARK_QUERY);
  const onSystemChange = (): void => applyTheme(readPreference());
  // Another tab changed the preference.
  const onStorage = (event: StorageEvent): void => {
    if (event.key !== THEME_STORAGE_KEY) return;
    applyTheme(readPreference());
    onChange();
  };

  media.addEventListener("change", onSystemChange);
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onChange);
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function setThemePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Not persisted, but still applied for this visit.
  }
  applyTheme(preference);
  listeners.forEach((listener) => listener());
}

/** The stored choice — "system" until the user picks one. The server always renders "system". */
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, readPreference, () => "system");
}
