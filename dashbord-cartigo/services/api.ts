import { z } from "zod";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api").replace(
  /\/+$/,
  ""
);
const ACCESS_TOKEN_STORAGE_KEY = "cartigo.access_token";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | null;
  requiresAuth?: boolean;
  retryOnAuthError?: boolean;
};

const refreshResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).nullable().optional(),
});

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;
const authFailureListeners = new Set<() => void>();
const accessTokenListeners = new Set<(token: string | null) => void>();

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function buildApiUrl(path: string) {
  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}

function debugAuth(message: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.debug(`[auth] ${message}`, details ?? {});
}

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStoredAccessToken() {
  if (!canUseBrowserStorage()) {
    return null;
  }

  const storedToken = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  return storedToken && storedToken.trim() ? storedToken : null;
}

function writeStoredAccessToken(token: string | null) {
  if (!canUseBrowserStorage()) {
    return;
  }

  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}

function notifyAccessTokenListeners(token: string | null) {
  accessTokenListeners.forEach((listener) => listener(token));
}

function buildDebugHeaders(headers: Headers) {
  return Object.fromEntries(
    Array.from(headers.entries()).map(([key, value]) => [
      key,
      key.toLowerCase() === "authorization" && value
        ? "Bearer [present]"
        : value,
    ])
  );
}

function isPlainObject(value: RequestOptions["body"]): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !(value instanceof FormData);
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (response.status === 204) {
    return null;
  }

  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }

  return response.text().catch(() => null);
}

async function performFetch(input: string, init: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (error) {
    throw new ApiError(
      "Impossible de contacter le serveur. Verifiez que l'API est demarree.",
      0,
      error
    );
  }
}

function extractErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const message = "message" in payload ? payload.message : null;

  return typeof message === "string" && message.trim() ? message : null;
}

function notifyAuthFailure() {
  authFailureListeners.forEach((listener) => listener());
}

export function subscribeToAuthFailure(listener: () => void) {
  authFailureListeners.add(listener);

  return () => {
    authFailureListeners.delete(listener);
  };
}

export function subscribeToAccessToken(listener: (token: string | null) => void) {
  accessTokenListeners.add(listener);

  return () => {
    accessTokenListeners.delete(listener);
  };
}

export function hydrateAccessToken() {
  if (accessToken) {
    return accessToken;
  }

  const storedToken = readStoredAccessToken();

  if (!storedToken) {
    return null;
  }

  accessToken = storedToken;
  debugAuth("Hydrated access token from localStorage.", {
    hasToken: true,
    tokenLength: storedToken.length,
  });

  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  writeStoredAccessToken(token);
  notifyAccessTokenListeners(token);
  debugAuth(token ? "Stored access token." : "Cleared access token.", {
    hasToken: Boolean(token),
    tokenLength: token?.length ?? 0,
  });
}

export function clearAccessToken() {
  setAccessToken(null);
}

export function getAccessToken() {
  return accessToken ?? hydrateAccessToken();
}

export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      debugAuth("Refreshing access token.", {
        hasToken: Boolean(getAccessToken()),
      });

      const response = await performFetch(buildApiUrl("/auth/refresh-token"), {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const payload = await parseResponse(response);

      if (!response.ok) {
        throw new ApiError(
          extractErrorMessage(payload) || "Session expiree.",
          response.status,
          payload
        );
      }

      const data =
        payload && typeof payload === "object" && "data" in payload ? payload.data : payload;
      const parsed = refreshResponseSchema.parse(data);
      setAccessToken(parsed.accessToken);
      debugAuth("Access token refreshed successfully.", {
        hasToken: true,
        tokenLength: parsed.accessToken.length,
      });

      return parsed.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function resolveAccessToken(path: string) {
  const existingToken = getAccessToken();

  if (existingToken) {
    return existingToken;
  }

  debugAuth("No access token available for protected request.", {
    path,
    hasToken: false,
  });

  return null;
}

export async function getValidAccessToken(path = "/") {
  return resolveAccessToken(path);
}

async function performApiRequest<T>(
  path: string,
  options: RequestOptions = {},
  unwrapData = true
) {
  const {
    body,
    headers,
    requiresAuth = true,
    retryOnAuthError = true,
    ...init
  } = options;

  const requestHeaders = new Headers(headers);
  let resolvedAccessToken: string | null = null;

  if (isPlainObject(body) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (!requestHeaders.has("Accept")) {
    requestHeaders.set("Accept", "application/json");
  }

  if (requiresAuth) {
    resolvedAccessToken = await resolveAccessToken(path);

    if (!resolvedAccessToken) {
      debugAuth("Blocking protected request because no token is available.", {
        path,
        hasToken: false,
      });
      throw new ApiError("Authentification requise.", 401);
    }

    requestHeaders.set("Authorization", `Bearer ${resolvedAccessToken}`);
  }

  const serializedBody: BodyInit | undefined = isPlainObject(body)
    ? JSON.stringify(body)
    : body ?? undefined;

  debugAuth("Sending API request.", {
    path,
    method: init.method ?? "GET",
    requiresAuth,
    hasToken: Boolean(resolvedAccessToken),
    headers: buildDebugHeaders(requestHeaders),
  });

  const response = await performFetch(buildApiUrl(path), {
    ...init,
    headers: requestHeaders,
    credentials: "include",
    body: serializedBody,
  });

  if (response.status === 401 && requiresAuth && retryOnAuthError) {
    debugAuth("Protected request returned 401. Trying access token refresh.", {
      path,
      method: init.method ?? "GET",
      hasToken: Boolean(resolvedAccessToken),
    });

    try {
      const nextAccessToken = await refreshAccessToken();

      return performApiRequest<T>(
        path,
        {
          ...options,
          headers: {
            ...Object.fromEntries(requestHeaders.entries()),
            Authorization: `Bearer ${nextAccessToken}`,
          },
          retryOnAuthError: false,
        },
        unwrapData
      );
    } catch (error) {
      clearAccessToken();
      notifyAuthFailure();
      debugAuth("Access token refresh failed after 401 response.", {
        path,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    debugAuth("API request failed.", {
      path,
      method: init.method ?? "GET",
      status: response.status,
      hasToken: Boolean(resolvedAccessToken),
      headers: buildDebugHeaders(requestHeaders),
    });
    throw new ApiError(
      extractErrorMessage(payload) || "Une erreur est survenue.",
      response.status,
      payload
    );
  }

  if (unwrapData && payload && typeof payload === "object" && "data" in payload) {
    return payload.data as T;
  }

  return payload as T;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  return performApiRequest<T>(path, options, true);
}

export async function apiRequestRaw<T>(path: string, options: RequestOptions = {}) {
  return performApiRequest<T>(path, options, false);
}
