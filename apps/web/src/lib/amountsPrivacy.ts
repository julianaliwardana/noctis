import { useCallback, useSyncExternalStore } from "react";
import { formatCurrency } from "@noctis/utils";

/** "Hide amounts": a per-browser mask on money figures. Hides what is drawn, not what is loaded. */
const STORAGE_KEY = "noctis:hide-amounts";
export const AMOUNT_MASK = "Rp •••••";

const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Another tab changed it.
  const onStorage = (event: StorageEvent): void => {
    if (event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function setAmountsHidden(hidden: boolean): void {
  try {
    if (hidden) window.localStorage.setItem(STORAGE_KEY, "1");
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode / storage disabled: the choice just won't outlive the page.
  }
  listeners.forEach((listener) => listener());
}

/** The server renders masked, so hidden amounts never flash. */
const hiddenOnServer = (): boolean => true;

export function useAmountsHidden(): boolean {
  return useSyncExternalStore(subscribe, read, hiddenOnServer);
}

/** `formatCurrency`, or the mask while amounts are hidden. Pass `format` for another notation. */
export function useMoney(): (amount: number, format?: (amount: number) => string) => string {
  const hidden = useAmountsHidden();
  return useCallback(
    (amount, format = formatCurrency) => (hidden ? AMOUNT_MASK : format(amount)),
    [hidden],
  );
}
