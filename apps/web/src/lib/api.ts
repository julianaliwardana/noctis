import { clearToken, getRefreshToken, getToken, setTokens } from "./auth";
import { expireSession } from "./session";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Shared across concurrent callers so a page that fires five requests at once refreshes once,
 * rather than racing five refreshes and keeping whichever token happened to land last.
 */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) return null;

  const { accessToken } = (await res.json()) as { accessToken: string };
  setTokens(accessToken);
  return accessToken;
}

function refreshOnce(): Promise<string | null> {
  refreshInFlight ??= refreshAccessToken()
    .catch(() => null)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

function request(path: string, init: RequestInit, token: string | null): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await request(path, init, getToken());

  // A 401 is expected every 15 minutes as the access token lapses — trade the refresh token for
  // a fresh one and replay the request before bothering the user about it.
  if (res.status === 401 && !path.startsWith("/auth/")) {
    const refreshed = await refreshOnce();
    if (refreshed) {
      res = await request(path, init, refreshed);
    } else {
      clearToken();
      expireSession();
    }
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(body?.error ?? res.statusText, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
