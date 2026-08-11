import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
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

const client = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

/**
 * Shared across concurrent callers so a page that fires five requests at once refreshes once,
 * rather than racing five refreshes and keeping whichever token happened to land last.
 */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  // Bare axios, not `client` — a 401 here must not re-enter the refresh interceptor.
  const { data } = await axios.post<{ accessToken: string }>(`${API_URL}/auth/refresh`, {
    refreshToken,
  });
  setTokens(data.accessToken);
  return data.accessToken;
}

function refreshOnce(): Promise<string | null> {
  refreshInFlight ??= refreshAccessToken()
    .catch(() => null)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(undefined, async (error: AxiosError<{ error?: string }>) => {
  const config = error.config as (InternalAxiosRequestConfig & { retried?: boolean }) | undefined;
  const status = error.response?.status;

  // A 401 is expected every 15 minutes as the access token lapses — trade the refresh token for
  // a fresh one and replay the request before bothering the user about it.
  if (status === 401 && config && !config.retried && !config.url?.startsWith("/auth/")) {
    config.retried = true;
    const token = await refreshOnce();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      return client(config);
    }
    clearToken();
    expireSession();
    // The session dialog is now the only thing the user needs to act on. Rejecting here instead
    // would surface as an unhandled rejection in every mount-effect fetch and store action that
    // has no reason to catch a dead session — so the chain stops quietly.
    return new Promise(() => {});
  }

  throw new ApiError(error.response?.data?.error ?? error.message, status ?? 0);
});

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    client.get<T>(url, config).then((res) => res.data),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    client.post<T>(url, body, config).then((res) => res.data),
  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    client.patch<T>(url, body, config).then((res) => res.data),
  delete: <T = void>(url: string, config?: AxiosRequestConfig) =>
    client.delete<T>(url, config).then((res) => res.data),
};
