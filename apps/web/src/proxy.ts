import { NextResponse, type NextRequest } from "next/server";
import { authRedirect, loginUrl, safeNext } from "@/lib/authRedirect";
import { accessCookieName, refreshCookieName } from "@/lib/authCookies";
import { apiInternalUrl } from "@/lib/apiInternalUrl";
import { cookieFromSetCookie, withCookie } from "@/lib/setCookie";

/**
 * Next 16 proxy (formerly middleware), Node runtime.
 * 1. Auth gate, UX only: the API checks every request.
 * 2. Server-side refresh, so the first paint has data after the 15-minute access cookie lapses.
 */
const production = process.env.NODE_ENV === "production";
const REFRESH_COOKIE = refreshCookieName(production);
const ACCESS_COOKIE = accessCookieName(production);
const AUTH_PAGES = ["/login", "/register"];

type Refresh =
  | { kind: "renewed"; access: string; setCookies: string[] }
  | { kind: "expired"; setCookies: string[] }
  | { kind: "failed" };

async function refreshSession(request: NextRequest, refreshToken: string): Promise<Refresh> {
  const clientIp = request.headers.get("cf-connecting-ip");
  try {
    const response = await fetch(`${apiInternalUrl()}/auth/refresh`, {
      method: "POST",
      headers: { cookie: `${REFRESH_COOKIE}=${refreshToken}`, ...(clientIp ? { "cf-connecting-ip": clientIp } : {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    const setCookies = response.headers.getSetCookie();
    if (response.status === 401) return { kind: "expired", setCookies };
    const access = response.ok ? cookieFromSetCookie(setCookies, ACCESS_COOKIE) : null;
    return access ? { kind: "renewed", access, setCookies } : { kind: "failed" };
  } catch {
    // API unreachable or slow: render anyway; the client fetch path will retry the refresh.
    return { kind: "failed" };
  }
}

function forwardSetCookies(response: NextResponse, setCookies: string[]): NextResponse {
  for (const header of setCookies) response.headers.append("set-cookie", header);
  return response;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  let signedIn = Boolean(refreshToken);
  let refresh: Refresh | null = null;

  if (refreshToken && !request.cookies.has(ACCESS_COOKIE) && !AUTH_PAGES.includes(pathname)) {
    refresh = await refreshSession(request, refreshToken);
    if (refresh.kind === "expired") signedIn = false;
  }

  const to = authRedirect(signedIn, pathname);
  if (to) {
    // Signed out → remember the page so sign-in lands back on it. Signed in on /login → honour it.
    const target = to === "/login" ? loginUrl(pathname + search) : safeNext(request.nextUrl.searchParams.get("next"));
    const redirect = NextResponse.redirect(new URL(target, request.url));
    // A dead session's cookies are cleared on the way to /login.
    return refresh?.kind === "expired" ? forwardSetCookies(redirect, refresh.setCookies) : redirect;
  }

  if (refresh?.kind === "renewed") {
    const headers = new Headers(request.headers);
    headers.set("cookie", withCookie(request.headers.get("cookie"), ACCESS_COOKIE, refresh.access));
    return forwardSetCookies(NextResponse.next({ request: { headers } }), refresh.setCookies);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    {
      // Skip Next assets, /api (the API answers 401 itself) and files (sw.js, manifest, icons).
      source: "/((?!_next/|api/|.*\\.).*)",
      // Skip prefetches: they load only the static shell, and refreshing for each would burn the rate limit.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
