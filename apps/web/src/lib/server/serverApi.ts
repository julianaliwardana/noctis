import { cookies, headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { accessCookieName } from "@/lib/authCookies";
import { apiInternalUrl } from "@/lib/apiInternalUrl";

const ACCESS_COOKIE = accessCookieName(process.env.NODE_ENV === "production");

/**
 * Server Components fetch from the API over the internal network with the visitor's own access
 * cookie, so the first paint can carry real data. Runtime API (cookies) — call it only inside a
 * <Suspense> boundary, which is what turns the caller into a streamed hole under PPR.
 *
 * Returns a function rather than fetching directly so a loader can read the cookie once and
 * fire several requests in parallel.
 */
export async function serverApi(): Promise<(<T>(path: string) => Promise<T>) | null> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  // No access cookie (signed out, or the proxy couldn't refresh it): let the client fetch instead.
  if (!token) return null;

  const clientIp = (await headers()).get("cf-connecting-ip");
  const base = apiInternalUrl();

  return async function get<T>(path: string): Promise<T> {
    const response = await fetch(`${base}${path}`, {
      headers: {
        cookie: `${ACCESS_COOKIE}=${token}`,
        ...(clientIp ? { "cf-connecting-ip": clientIp } : {}),
      },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`GET ${path} → ${response.status}`);
    return (await response.json()) as T;
  };
}

/**
 * Runs a loader against the API, or returns null when there's no usable session or any request
 * fails. Null is never an error for the page: the client view falls back to fetching through the
 * browser, where the axios interceptor can refresh the session and the dialog can handle expiry.
 */
export async function loadOrNull<T>(load: (get: <R>(path: string) => Promise<R>) => Promise<T>): Promise<T | null> {
  const get = await serverApi();
  if (!get) return null;
  try {
    return await load(get);
  } catch (error) {
    // Next aborts in-flight fetches when a prerender pass finishes; that's its signal, not a failure.
    unstable_rethrow(error);
    console.warn("[ssr] falling back to client fetch:", error instanceof Error ? error.message : error);
    return null;
  }
}
