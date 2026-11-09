import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import { expireSession, waitForSession } from "./session";
import { refreshOutcome, type RefreshOutcome } from "./refreshOutcome";

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
let refreshInFlight: Promise<RefreshOutcome> | null = null;

function refreshOnce(): Promise<RefreshOutcome> {
  // Bare axios, not `client` — a 401 here must not re-enter the refresh interceptor.
  //
  // No body: `undefined`, never `null`. For a POST axios defaults Content-Type to
  // application/x-www-form-urlencoded and only drops it when the body is undefined; Fastify has no
  // parser for that type and answered 415, so every refresh failed and the session "expired" every
  // 15 minutes.
  refreshInFlight ??= axios
    .post(`${API_URL}/auth/refresh`, undefined, { withCredentials: true })
    .then(() => refreshOutcome(204))
    .catch((error: AxiosError) => refreshOutcome(error.response?.status))
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
    const outcome = await refreshOnce();
    if (outcome === "renewed") return client(config);

    if (outcome === "expired") {
      expireSession();
      // Park the request until the user signs back in from the session dialog, then replay it — so
      // the page finishes loading instead of staying half-empty. Rejecting instead would surface as
      // an unhandled rejection in every mount-effect fetch that has no reason to catch this.
      await waitForSession();
      config.retried = false;
      return client(config);
    }

    // Refresh couldn't be reached (offline, rate-limited, server error): the session may be fine,
    // so fail this one request normally rather than telling the user they were signed out.
    throw new ApiError("Couldn't reach the server. Try again in a moment.", status, error.response?.data);
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
