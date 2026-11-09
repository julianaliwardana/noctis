import { create } from "zustand";

/**
 * Set when a request 401s and the refresh token could not save it. The app stays on screen and
 * a dialog lets the user sign in again in place; requests that hit the dead session wait (see
 * `waitForSession`) and are replayed once they do, so the page carries on where it was.
 */
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
