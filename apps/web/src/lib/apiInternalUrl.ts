/** Internal API URL for the /api rewrite (build) and server fetches (runtime). Defaults: the compose service in production, localhost in dev. */
export function apiInternalUrl(): string {
  const fallback = process.env.NODE_ENV === "production" ? "http://api:3001" : "http://localhost:3001";
  return (process.env.API_INTERNAL_URL || fallback).replace(/\/$/, "");
}
