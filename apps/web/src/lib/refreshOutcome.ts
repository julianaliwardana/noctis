export type RefreshOutcome = "renewed" | "expired" | "failed";

/** Only a 401 from /auth/refresh ends the session. Offline, 429, 5xx or another 4xx doesn't. */
export function refreshOutcome(status: number | undefined): RefreshOutcome {
  if (status !== undefined && status >= 200 && status < 300) return "renewed";
  if (status === 401) return "expired";
  return "failed";
}
