import { NextResponse, type NextRequest } from "next/server";
import { authRedirect, loginUrl, safeNext } from "@/lib/authRedirect";
import { refreshCookieName } from "@/lib/authCookies";

/**
 * Replaces the old client-side AuthGuard. The session cookies are httpOnly, so the gate moved to
 * the one place that can still read them — the server — which also means no blank first paint
 * while the browser works out whether anyone is signed in. Only a UX gate: the API checks the
 * tokens on every request.
 */
const REFRESH_COOKIE = refreshCookieName(process.env.NODE_ENV === "production");

export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const to = authRedirect(request.cookies.has(REFRESH_COOKIE), pathname);
  if (!to) return NextResponse.next();

  // Signed out → remember the page so sign-in lands back on it. Signed in on /login → honour it.
  const target =
    to === "/login" ? loginUrl(pathname + search) : safeNext(request.nextUrl.searchParams.get("next"));
  return NextResponse.redirect(new URL(target, request.url));
}

export const config = {
  // Everything except Next's own assets, the /api proxy (the API answers 401 itself — a redirect to
  // an HTML login page would break every fetch), and any path with a file extension (sw.js,
  // manifest.json, icons), which signed-out visitors need too.
  matcher: ["/((?!_next/|api/|.*\\.).*)"],
};
