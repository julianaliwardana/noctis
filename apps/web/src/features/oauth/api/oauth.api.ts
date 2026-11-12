import { api } from "@/lib/api";

export type OAuthScope = "noctis:read" | "noctis:write";

/** The query an MCP client sent the browser to /oauth/authorize with, passed through untouched. */
export type AuthorizeRequest = Record<string, string>;

export interface AuthorizeInfo {
  clientName: string;
  /** Where the browser goes back to — shown so a look-alike app name can't hide where the code lands. */
  redirectHost: string;
  scopes: OAuthScope[];
}

export interface Connection {
  id: string;
  clientName: string;
  scopes: OAuthScope[];
  createdAt: string;
  lastUsedAt: string | null;
}

export function fetchAuthorizeInfo(request: AuthorizeRequest): Promise<AuthorizeInfo> {
  return api.get<AuthorizeInfo>("/oauth/authorize/info", { params: request });
}

export function decideAuthorization(request: AuthorizeRequest, approve: boolean, scopes?: OAuthScope[]): Promise<{ redirectTo: string }> {
  return api.post<{ redirectTo: string }>("/oauth/authorize", { request, approve, scopes });
}

export function fetchConnections(): Promise<Connection[]> {
  return api.get<Connection[]>("/oauth/grants");
}

export function revokeConnection(id: string): Promise<void> {
  return api.delete(`/oauth/grants/${id}`);
}
