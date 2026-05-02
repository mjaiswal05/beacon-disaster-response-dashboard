/**
 * Generic HTTP request utility for the Beacon dashboard.
 *
 * All service files should use this instead of calling fetch() or
 * authService.authenticatedFetch() directly.
 *
 * Usage:
 *   import { request } from '../utils/request';
 *
 *   // Authenticated GET (default)
 *   const data = await request.get<MyType>('/api/core/v1/incidents', {
 *     params: { page_size: 50 },
 *   });
 *
 *   // Authenticated POST
 *   const result = await request.post('/api/iam/v1/users', payload);
 *
 *   // Unauthenticated POST (e.g. login)
 *   const token = await request.post('/api/iam/v1/auth/login', creds, { auth: false });
 *
 *   // DELETE with no response body
 *   await request.del('/api/iam/v1/users/123');
 */

import { authService } from "../services/auth";

// Base URL - empty string in dev so Vite proxy handles routing

const BASE_URL = import.meta.env.DEV
  ? ""
  : import.meta.env.VITE_API_BASE_URL || "https://beacon-tcd.tech";

// Types

export interface RequestOptions {
  /** Attach Bearer token. Defaults to true. Set false only for public endpoints. */
  auth?: boolean;
  /** Optional AbortSignal for request cancellation / timeouts. */
  signal?: AbortSignal;
  /** Query-string parameters appended to the URL. */
  params?: Record<string, string | number | boolean>;
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// Internal helpers

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function combineSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), {
      once: true,
    });
  }
  return controller.signal;
}

function buildUrl(path: string, params?: RequestOptions["params"]): string {
  const base = `${BASE_URL}${path}`;
  if (!params || Object.keys(params).length === 0) return base;
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  return `${base}?${qs}`;
}

async function execute<T>(
  method: Method,
  path: string,
  body?: unknown,
  { auth = true, signal, params }: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(path, params);

  // 120-second timeout unless caller already provided a signal
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), 120_000);
  const effectiveSignal = signal
    ? combineSignals(signal, timeoutController.signal)
    : timeoutController.signal;

  const init: RequestInit = {
    method,
    signal: effectiveSignal,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  async function attemptRequest(): Promise<Response> {
    return auth
      ? authService.authenticatedFetch(url, init)
      : fetch(url, {
          ...init,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });
  }

  try {
    let res = await attemptRequest();

    // 429: rate limited - wait for Retry-After then retry once
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("Retry-After") ?? "5") * 1000;
      await sleep(retryAfter);
      res = await attemptRequest();
    }
    // 5xx: server error - retry once after 2s
    else if (res.status >= 500) {
      await sleep(2000);
      res = await attemptRequest();
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.message ??
          err.error?.message ??
          `${method} ${path} failed: ${res.status}`,
      );
    }

    // Handle empty-body responses (204 No Content, void endpoints)
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Public API

export const request = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return execute<T>("GET", path, undefined, options);
  },

  post<T = void>(
    path: string,
    body: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return execute<T>("POST", path, body, options);
  },

  put<T = void>(
    path: string,
    body: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return execute<T>("PUT", path, body, options);
  },

  patch<T = void>(
    path: string,
    body: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return execute<T>("PATCH", path, body, options);
  },

  del<T = void>(path: string, options?: RequestOptions): Promise<T> {
    return execute<T>("DELETE", path, undefined, options);
  },
};
