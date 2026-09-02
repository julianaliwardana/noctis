import { NextResponse, type NextRequest } from "next/server";
import { authRedirect } from "@/lib/authRedirect";

/**
 * Replaces the old client-side AuthGuard. The session cookies are httpOnly, so the gate moved to
 * the one place that can still read them — the server — which also means no blank first paint
 * while the browser works out whether anyone is signed in.
 */
const REFRESH_COOKIE = "noctis_refresh";

export function middleware(request: NextRequest): NextResponse {
  const to = authRedirect(request.cookies.has(REFRESH_COOKIE), request.nextUrl.pathname);
  return to ? NextResponse.redirect(new URL(to, request.url)) : NextResponse.next();
}

export const config = {
  // Everything except Next's own assets and any path with a file extension (sw.js, manifest.json,
  // icons) — those are served to signed-out visitors too and must not redirect.
  matcher: ["/((?!_next/|.*\\.).*)"],
};
