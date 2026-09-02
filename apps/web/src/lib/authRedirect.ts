const AUTH_PAGES = ["/login", "/register"];

export function authRedirect(signedIn: boolean, pathname: string): string | null {
  const onAuthPage = AUTH_PAGES.includes(pathname);
  if (!signedIn && !onAuthPage) return "/login";
  if (signedIn && onAuthPage) return "/dashboard";
  return null;
}
