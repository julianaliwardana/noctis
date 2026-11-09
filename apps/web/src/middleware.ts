import { NextResponse, type NextRequest } from "next/server";
import { authRedirect } from "@/lib/authRedirect";
import { refreshCookieName } from "@/lib/authCookies";

/**
 * Replaces the old client-side AuthGuard. The session cookies are httpOnly, so the gate moved to
 * the one place that can still read them — the server — which also means no blank first paint
 * while the browser works out whether anyone is signed in. Only a UX gate: the API checks the
 * tokens on every request.
 */
const REFRESH_COOKIE = refreshCookieName(process.env.NODE_ENV === "production");

export function middleware(request: NextRequest): NextResponse {
  const to = authRedirect(request.cookies.has(REFRESH_COOKIE), request.nextUrl.pathname);
  return to ? NextResponse.redirect(new URL(to, request.url)) : NextResponse.next();
}

export const config = {
  // Everything except Next's own assets, the /api proxy (the API answers 401 itself — a redirect to
  // an HTML login page would break every fetch), and any path with a file extension (sw.js,
  // manifest.json, icons), which signed-out visitors need too.
  matcher: ["/((?!_next/|api/|.*\\.).*)"],
};
