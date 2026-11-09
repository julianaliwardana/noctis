export type RefreshOutcome = "renewed" | "expired" | "failed";

/**
 * Only a 401 from /auth/refresh means the session is really over. Anything else — no response
 * (offline), 429, 5xx, or a 4xx from a broken request — says nothing about the session, and
 * treating it as "signed out" is how a client bug once logged everyone out every 15 minutes.
 */
export function refreshOutcome(status: number | undefined): RefreshOutcome {
  if (status !== undefined && status >= 200 && status < 300) return "renewed";
  if (status === 401) return "expired";
  return "failed";
}
