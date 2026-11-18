/** Public URLs come from env, not Host: through the /api rewrite Host is the web host, which would break the issuer. */
export interface OAuthUrls {
  /** Authorization server issuer and protected-resource origin, e.g. https://noctis-api.julianwardana.dev */
  api: string;
  /** The MCP endpoint: the one resource tokens are issued for. */
  mcp: string;
  /** Web app origin that serves /oauth/authorize. */
  web: string;
}

function origin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

export function oauthUrls(env: NodeJS.ProcessEnv = process.env): OAuthUrls | null {
  const api = origin(env.API_PUBLIC_URL);
  const web = origin(env.WEB_PUBLIC_URL) ?? origin(env.WEB_ORIGIN?.split(",")[0]);
  if (!api || !web) return null;
  return { api, mcp: `${api}/mcp`, web };
}

export function metadataUrls(urls: OAuthUrls) {
  return {
    protectedResource: `${urls.api}/.well-known/oauth-protected-resource`,
    authorizationServer: `${urls.api}/.well-known/oauth-authorization-server`,
  };
}
