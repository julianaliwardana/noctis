import { apiFetch } from "@/lib/api";

export function recordSession(startedAt: string, endedAt: string): Promise<void> {
  return apiFetch<void>("/pomodoro", { method: "POST", body: JSON.stringify({ startedAt, endedAt }) });
}
