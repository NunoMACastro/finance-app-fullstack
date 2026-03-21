/**
 * HTTP Client — Axios instance with JWT interceptors.
 *
 * Features:
 *  • Automatically attaches Bearer token to every request
 *  • On 401, attempts a single token refresh and retries the original request
 *  • Queues concurrent requests during refresh to avoid race conditions
 *  • Normalises errors into a predictable { code, message, details } shape
 */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getActiveAccountIdHeader } from "./account-store";
import { config } from "./config";
import { tokenStore } from "./token-store";
import type { ApiError } from "./types";

const ACCOUNT_SCOPED_PATHS = ["/transactions", "/budgets", "/income-categories", "/recurring-rules", "/stats"] as const;

// ---- Create instance ----
export const httpClient = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: config.requestTimeout,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

function normalizeRequestPath(url?: string): string {
  if (!url) return "";

  const path = url.split("?")[0]?.split("#")[0] ?? "";
  if (/^https?:\/\//i.test(path)) {
    try {
      return new URL(path).pathname;
    } catch {
      return path;
    }
  }

  return path.startsWith("/") ? path : `/${path}`;
}

function isAccountScopedRequest(url?: string): boolean {
  const pathname = normalizeRequestPath(url);
  return ACCOUNT_SCOPED_PATHS.some((basePath) => pathname === basePath || pathname.startsWith(`${basePath}/`));
}

// ---- Request interceptor: attach JWT ----
httpClient.interceptors.request.use((req) => {
  const token = tokenStore.getAccess();
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }

  const accountId = getActiveAccountIdHeader();
  if (accountId && isAccountScopedRequest(req.url)) {
    req.headers["X-Account-Id"] = accountId;
  } else if ("X-Account-Id" in req.headers) {
    delete req.headers["X-Account-Id"];
  }
  return req;
});

// ---- Response interceptor: 401 → refresh + retry ----
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else if (token) resolve(token);
  });
  pendingQueue = [];
}

function canRetryAfterRefresh(config: InternalAxiosRequestConfig & { authRetrySafe?: boolean }): boolean {
  const method = config.method?.toUpperCase();
  if (config.authRetrySafe === true) return true;
  return method === "GET" || method === "HEAD" || method === "OPTIONS";
}

httpClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiError>) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      authRetrySafe?: boolean;
    };

    // Only intercept 401 and only retry once
    if (error.response?.status !== 401 || original._retry || !canRetryAfterRefresh(original)) {
      return Promise.reject(normaliseError(error));
    }

    original._retry = true;

    if (isRefreshing) {
      // Another refresh is in progress — wait for it
      return new Promise<string>((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((newToken) => {
        original.headers.Authorization = `Bearer ${newToken}`;
        return httpClient(original);
      });
    }

    isRefreshing = true;

    try {
      const { data } = await axios.post<{ accessToken: string }>(
        `${config.apiBaseUrl}/auth/refresh`,
        {},
        {
          withCredentials: true,
          timeout: config.requestTimeout,
        },
      );

      tokenStore.setAccess(data.accessToken);
      processQueue(null, data.accessToken);

      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return httpClient(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent("auth:logout"));
      return Promise.reject(normaliseError(error));
    } finally {
      isRefreshing = false;
    }
  },
);

// ---- Error normalisation ----
function normaliseError(error: AxiosError<ApiError>): ApiError {
  if (error.response?.data?.code) {
    return error.response.data;
  }

  if (error.response) {
    return {
      code: `HTTP_${error.response.status}`,
      message: error.response.statusText || "Erro de servidor",
    };
  }

  if (error.code === "ECONNABORTED") {
    return { code: "TIMEOUT", message: "O pedido excedeu o tempo limite" };
  }

  if (!error.response) {
    return { code: "NETWORK_ERROR", message: "Sem ligacao ao servidor" };
  }

  return { code: "UNKNOWN", message: error.message || "Erro desconhecido" };
}

/**
 * Type guard to check if an error is our normalised ApiError.
 */
export function isApiError(err: unknown): err is ApiError {
  return typeof err === "object" && err !== null && "code" in err && "message" in err;
}
