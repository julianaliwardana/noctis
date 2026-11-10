import { useSyncExternalStore } from "react";
import {
  APPEARANCE_OPTIONS,
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  sanitizeAppearance,
  type Appearance,
  type AppearanceKey,
} from "@/lib/appearance";

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
  } catch {
    return null;
  }
}

// useSyncExternalStore needs the same object back while nothing changed, so the parsed value is
// cached against the raw string it came from.
let cachedRaw: string | null | undefined;
let cached: Appearance = DEFAULT_APPEARANCE;

function readAppearance(): Appearance {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      // Corrupt value: treat as unset.
    }
    cached = sanitizeAppearance(parsed);
  }
  return cached;
}

function applyAppearance(appearance: Appearance): void {
  const root = document.documentElement;
  for (const key of Object.keys(APPEARANCE_OPTIONS) as AppearanceKey[]) {
    root.setAttribute(`data-${key}`, appearance[key]);
  }
}

const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Another tab changed it.
  const onStorage = (event: StorageEvent): void => {
    if (event.key !== APPEARANCE_STORAGE_KEY) return;
    applyAppearance(readAppearance());
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function save(next: Appearance): void {
  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Not persisted, but still applied for this visit.
    cachedRaw = JSON.stringify(next);
    cached = next;
  }
  applyAppearance(next);
  emit();
}

export function setAppearance<K extends AppearanceKey>(key: K, value: Appearance[K]): void {
  save({ ...readAppearance(), [key]: value });
}

export function resetAppearance(): void {
  save({ ...DEFAULT_APPEARANCE });
}

/** The server always renders the defaults; the stored choice arrives on hydration. */
export function useAppearance(): Appearance {
  return useSyncExternalStore(subscribe, readAppearance, () => DEFAULT_APPEARANCE);
}
