const AUTH_PAGES = ["/login", "/register"];
const HOME = "/dashboard";

export function authRedirect(signedIn: boolean, pathname: string): string | null {
  const onAuthPage = AUTH_PAGES.includes(pathname);
  if (!signedIn && !onAuthPage) return "/login";
  if (signedIn && onAuthPage) return HOME;
  return null;
}

/** Safe `?next=` target: same-site paths only (`//host` and `/\host` are other hosts), never the auth pages. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return HOME;
  const pathname = next.split(/[?#]/)[0] ?? "";
  return AUTH_PAGES.includes(pathname) ? HOME : next;
}

/** `/login?next=…` for a signed-out visitor who asked for `path`; plain `/login` from the root. */
export function loginUrl(path: string): string {
  return path === "/" || path === HOME ? "/login" : `/login?next=${encodeURIComponent(path)}`;
}
