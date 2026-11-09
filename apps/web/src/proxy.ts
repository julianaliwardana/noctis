import { NextResponse, type NextRequest } from "next/server";
import { authRedirect, loginUrl, safeNext } from "@/lib/authRedirect";
import { accessCookieName, refreshCookieName } from "@/lib/authCookies";
import { apiInternalUrl } from "@/lib/apiInternalUrl";
import { cookieFromSetCookie, withCookie } from "@/lib/setCookie";

/**
 * Next 16 renamed middleware to proxy; it runs on the Node.js runtime.
 *
 * 1. Auth gate (UX only — the API checks the tokens on every request): signed-out visitors go to
 *    /login?next=…, signed-in ones are kept off the auth pages.
 * 2. Server-side refresh. The access cookie lives 15 minutes, so after any idle spell a page load
 *    arrives with only the refresh cookie and the Server Components would have nothing to fetch
 *    with. Refreshing here, before rendering, means the first paint carries real data; the new
 *    access cookie goes both to the browser and into this request for the render.
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
      // Everything except Next's own assets, the /api proxy (the API answers 401 itself — a redirect
      // to an HTML login page would break every fetch), and any path with a file extension (sw.js,
      // manifest.json, icons), which signed-out visitors need too.
      source: "/((?!_next/|api/|.*\\.).*)",
      // Link prefetches fetch only the static shell (partialPrefetching), which holds no user data,
      // and refreshing the session for each one would burn the refresh rate limit. Next strips these
      // headers from `request` inside proxy, so they can only be matched here.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
