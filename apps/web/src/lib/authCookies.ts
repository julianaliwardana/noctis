/** Must match the API's cookie names: `__Host-` in production, bare in dev. */
function prefix(production: boolean): string {
  return production ? "__Host-" : "";
}

export function refreshCookieName(production: boolean): string {
  return `${prefix(production)}noctis_refresh`;
}

export function accessCookieName(production: boolean): string {
  return `${prefix(production)}noctis_access`;
}
