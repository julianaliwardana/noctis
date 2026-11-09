import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import { expireSession } from "./session";

/**
 * Same origin, always: Next rewrites /api/* to the API (next.config.ts). That's what lets the
 * session cookies be host-only — a separate API host would need parent-domain cookies.
 */
const API_URL = "/api";

/** Auth calls that must not trigger a refresh-and-retry when they 401. */
const NO_REFRESH = ["/auth/login", "/auth/register", "/auth/refresh"];

export class ApiError extends Error {
  status: number;
  /** The parsed error body — a 429 carries `retryAfter`, for instance. */
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const client = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  // The session is a pair of httpOnly cookies the browser attaches itself; nothing here ever holds
  // the token, so an XSS payload has nothing to steal.
  withCredentials: true,
});

/**
 * Shared across concurrent callers so a page that fires five requests at once refreshes once,
 * rather than racing five refreshes against each other.
 */
let refreshInFlight: Promise<boolean> | null = null;

function refreshOnce(): Promise<boolean> {
  // Bare axios, not `client` — a 401 here must not re-enter the refresh interceptor.
  refreshInFlight ??= axios
    .post(`${API_URL}/auth/refresh`, null, { withCredentials: true })
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

client.interceptors.response.use(undefined, async (error: AxiosError<{ error?: string }>) => {
  const config = error.config as (InternalAxiosRequestConfig & { retried?: boolean }) | undefined;
  const status = error.response?.status;

  // A 401 is expected every 15 minutes as the access cookie lapses — trade the refresh cookie for
  // a fresh one and replay the request before bothering the user about it.
  if (status === 401 && config && !config.retried && !NO_REFRESH.some((path) => config.url?.startsWith(path))) {
    config.retried = true;
    if (await refreshOnce()) return client(config);

    expireSession();
    // The session dialog is now the only thing the user needs to act on. Rejecting here instead
    // would surface as an unhandled rejection in every mount-effect fetch and store action that
    // has no reason to catch a dead session — so the chain stops quietly.
    return new Promise(() => {});
  }

  throw new ApiError(error.response?.data?.error ?? error.message, status ?? 0, error.response?.data);
});

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    client.get<T>(url, config).then((res) => res.data),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    client.post<T>(url, body, config).then((res) => res.data),
  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    client.put<T>(url, body, config).then((res) => res.data),
  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    client.patch<T>(url, body, config).then((res) => res.data),
  delete: <T = void>(url: string, config?: AxiosRequestConfig) =>
    client.delete<T>(url, config).then((res) => res.data),
};
