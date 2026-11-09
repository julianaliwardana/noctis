/** Value of cookie `name` from a list of Set-Cookie headers, or null if absent or being cleared. */
export function cookieFromSetCookie(setCookies: string[], name: string): string | null {
  for (const header of setCookies) {
    const [pair = ""] = header.split(";");
    const eq = pair.indexOf("=");
    if (eq < 0 || pair.slice(0, eq).trim() !== name) continue;
    const value = pair.slice(eq + 1).trim();
    const maxAge = /;\s*max-age=(-?\d+)/i.exec(header)?.[1];
    if (!value || (maxAge !== undefined && Number(maxAge) <= 0)) return null;
    return value;
  }
  return null;
}

/** `cookieHeader` with `name=value` set, replacing any existing entry for that name. */
export function withCookie(cookieHeader: string | null, name: string, value: string): string {
  const others = (cookieHeader ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part && !part.startsWith(`${name}=`));
  return [...others, `${name}=${value}`].join("; ");
}
