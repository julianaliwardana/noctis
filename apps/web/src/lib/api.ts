import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import { expireSession, waitForSession } from "./session";
import { refreshOutcome, type RefreshOutcome } from "./refreshOutcome";

/** Same origin (Next rewrites /api/*), so cookies can be host-only. */
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
  // The session lives in httpOnly cookies; no token in JS.
  withCredentials: true,
});

/** Shared, so concurrent 401s trigger one refresh. */
let refreshInFlight: Promise<RefreshOutcome> | null = null;

function refreshOnce(): Promise<RefreshOutcome> {
  // Bare axios: a 401 here must not re-enter the interceptor.
  // Body `undefined`, not `null`: with null axios sends a form Content-Type and Fastify answers 415.
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

  // The access cookie lapses every 15 minutes: refresh, then replay.
  if (status === 401 && config && !config.retried && !NO_REFRESH.some((path) => config.url?.startsWith(path))) {
    config.retried = true;
    const outcome = await refreshOnce();
    if (outcome === "renewed") return client(config);

    if (outcome === "expired") {
      expireSession();
      // Park until the user signs back in, then replay.
      await waitForSession();
      config.retried = false;
      return client(config);
    }

    // Refresh unreachable (offline, 429, 5xx): fail this request, don't sign the user out.
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
