import { apiFetch } from "@/lib/api";

export type PomodoroPhase = "focus" | "short" | "long";

export function recordSession(
  phase: PomodoroPhase,
  startedAt: string,
  endedAt: string,
): Promise<void> {
  return apiFetch<void>("/pomodoro", {
    method: "POST",
    body: JSON.stringify({ phase, startedAt, endedAt }),
  });
}
