/**
 * Where the Fastify API lives on the internal network. Used by the /api rewrite (resolved at
 * `next build`) and by server-side fetches in the proxy and Server Components (read at runtime).
 * Default: the compose service in production, the local API in dev.
 */
export function apiInternalUrl(): string {
  const fallback = process.env.NODE_ENV === "production" ? "http://api:3001" : "http://localhost:3001";
  return (process.env.API_INTERNAL_URL || fallback).replace(/\/$/, "");
}
