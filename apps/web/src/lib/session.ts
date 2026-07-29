import { create } from "zustand";

/**
 * Set when a request 401s and the refresh token could not save it. The app stays on screen and
 * a dialog asks the user to sign in again, rather than yanking them to /login mid-task.
 */
interface SessionState {
  expired: boolean;
  expire: () => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  expired: false,
  expire: () => set({ expired: true }),
  reset: () => set({ expired: false }),
}));

export function expireSession(): void {
  useSessionStore.getState().expire();
}
