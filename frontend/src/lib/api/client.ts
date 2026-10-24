import { env } from "@/config/env";
import { ApiError, parseApiError } from "@/lib/api/errors";
import { endpoints } from "@/lib/api/endpoints";

type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  query?: Record<string, QueryValue>;
  body?: unknown;
  formData?: FormData;
  signal?: AbortSignal;
  skipRefresh?: boolean;
}

let accessToken: string | null = null;
let refreshToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setRefreshToken(token: string | null) {
  refreshToken = token;
}

export function clearMemoryTokens() {
  accessToken = null;
  refreshToken = null;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((part) => part.trim());
  const match = parts.find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const url = new URL(
    `${env.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`,
    typeof window === "undefined" ? "http://localhost" : window.location.origin,
  );
  if (env.apiBaseUrl.startsWith("http")) {
    const absolute = new URL(
      `${env.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`,
    );
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== "") {
          absolute.searchParams.set(key, String(value));
        }
      }
    }
    return absolute;
  }
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url;
}

function headers(formData?: FormData) {
  const result = new Headers();
  if (!formData) result.set("Accept", "application/json");
  if (!formData) result.set("Content-Type", "application/json");
  const csrf = readCookie("csrftoken");
  if (csrf) result.set("X-CSRFToken", csrf);
  if (env.authStrategy === "bearer" && accessToken) {
    result.set("Authorization", `Bearer ${accessToken}`);
  }
  return result;
}

async function parseBody(response: Response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { detail: text };
  }
}

async function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(buildUrl(endpoints.refresh), {
          method: "POST",
          credentials: "include",
          headers: headers(),
          body: JSON.stringify(
            env.authStrategy === "bearer" && refreshToken
              ? { refresh: refreshToken }
              : {},
          ),
        });
        if (!response.ok) return false;
        const payload = (await parseBody(response)) as {
          access?: string;
          refresh?: string;
        } | null;
        if (payload?.access) accessToken = payload.access;
        if (payload?.refresh) refreshToken = payload.refresh;
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    credentials: "include",
    headers: headers(options.formData),
    body: options.formData
      ? options.formData
      : options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
    signal: options.signal,
  });

  if (
    response.status === 401 &&
    !options.skipRefresh &&
    path !== endpoints.refresh &&
    path !== endpoints.login &&
    path !== endpoints.me
  ) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, skipRefresh: true });
    }
    unauthorizedHandler?.();
  }

  const payload = await parseBody(response);
  if (!response.ok) {
    throw parseApiError(response.status, payload);
  }
  return payload as T;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
