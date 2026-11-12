/**
 * Where things live. The API host serves the MCP endpoint, the token endpoint and the metadata;
 * the consent screen is a page of the web app so it can reuse the normal login. Both come from env
 * rather than request headers: the consent page reaches the API through the web app's /api
 * rewrite, where Host is the web host, and an issuer that changed with the route would break every
 * client's metadata check.
 */
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
