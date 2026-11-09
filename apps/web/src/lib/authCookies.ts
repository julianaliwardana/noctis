/**
 * Must match the API's cookie names (apps/api/src/modules/auth/auth.service.ts): `__Host-` in
 * production, where it pins the cookie to this exact host; bare in dev, where Safari won't keep a
 * Secure cookie on http://localhost.
 */
function prefix(production: boolean): string {
  return production ? "__Host-" : "";
}

export function refreshCookieName(production: boolean): string {
  return `${prefix(production)}noctis_refresh`;
}

export function accessCookieName(production: boolean): string {
  return `${prefix(production)}noctis_access`;
}
