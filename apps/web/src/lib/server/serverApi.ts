import { cookies, headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { accessCookieName } from "@/lib/authCookies";
import { apiInternalUrl } from "@/lib/apiInternalUrl";

const ACCESS_COOKIE = accessCookieName(process.env.NODE_ENV === "production");

/** Server-side API fetch with the visitor's access cookie. Call inside <Suspense> (PPR). Returns a function so one cookie read serves parallel requests. */
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

/** Runs a loader; null on no session or any failure, and the client fetches instead. */
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
