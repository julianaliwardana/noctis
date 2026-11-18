import { create } from "zustand";

/** Set when refresh fails: a dialog lets the user sign in again, and parked requests replay (see waitForSession). */
interface SessionState {
  expired: boolean;
  expire: () => void;
  restore: () => void;
}

let waiters: Array<() => void> = [];

export const useSessionStore = create<SessionState>((set) => ({
  expired: false,
  expire: () => set({ expired: true }),
  restore: () => {
    set({ expired: false });
    const pending = waiters;
    waiters = [];
    for (const resume of pending) resume();
  },
}));

export function expireSession(): void {
  useSessionStore.getState().expire();
}

/** Resolves when the user signs back in. Never rejects: if they leave the page it just never runs. */
export function waitForSession(): Promise<void> {
  return new Promise((resolve) => waiters.push(resolve));
}

/** Call after a successful sign-in from the session dialog. */
export function restoreSession(): void {
  useSessionStore.getState().restore();
}
