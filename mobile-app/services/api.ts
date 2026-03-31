import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import { APP_CONFIG } from '@/constants/app';
import { authService } from '@/services/auth.service';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveAccessToken,
  saveRefreshToken,
  updateCustomerSession,
} from '@/services/token.service';

type RequestOptions = AxiosRequestConfig;
type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};
type FailedQueueItem = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const api = axios.create({
  baseURL: APP_CONFIG.apiBaseUrl,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: FailedQueueItem[] = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
      return;
    }

    if (token) {
      resolve(token);
      return;
    }

    reject(new ApiError('Session expiree.', 401, null));
  });

  failedQueue = [];
}

function extractMessage(payload: unknown, fallbackMessage: string) {
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    return String(payload.message);
  }

  return fallbackMessage;
}

function normalizeApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const payload = error.response?.data ?? null;
    const fallbackMessage =
      status === 0
        ? `Impossible de joindre l'API Cartigo (${APP_CONFIG.apiBaseUrl}). Verifie que le backend tourne et que cet appareil peut l'atteindre.`
        : 'Une erreur est survenue.';

    return new ApiError(
      extractMessage(payload, fallbackMessage),
      status,
      payload ?? { cause: error.message }
    );
  }

  if (error instanceof Error) {
    return new ApiError(error.message, 0, { cause: error.message });
  }

  return new ApiError('Une erreur est survenue.', 0, null);
}

api.interceptors.request.use(async (config) => {
  const nextConfig = config;
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return nextConfig;
  }

  const headers =
    nextConfig.headers instanceof AxiosHeaders
      ? nextConfig.headers
      : new AxiosHeaders(nextConfig.headers ?? {});

  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  nextConfig.headers = headers;
  return nextConfig;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;
    const isRefreshRequest = originalRequest?.url?.includes('/customers/refresh-token');

    if (!originalRequest || status !== 401 || originalRequest._retry || isRefreshRequest) {
      throw normalizeApiError(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token) => {
            const headers =
              originalRequest.headers instanceof AxiosHeaders
                ? originalRequest.headers
                : new AxiosHeaders(originalRequest.headers ?? {});

            headers.set('Authorization', `Bearer ${token}`);
            originalRequest.headers = headers;
            resolve(api(originalRequest));
          },
          reject: (queueError) => {
            reject(normalizeApiError(queueError));
          },
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await getRefreshToken();

      if (!refreshToken) {
        throw new ApiError('Session expiree.', 401, null);
      }

      const refreshedSession = await authService.refreshCustomerSession(refreshToken);

      await Promise.all([
        saveAccessToken(refreshedSession.accessToken),
        saveRefreshToken(refreshedSession.refreshToken),
        updateCustomerSession({
          accessToken: refreshedSession.accessToken,
          refreshToken: refreshedSession.refreshToken,
          customer: refreshedSession.customer,
        }),
      ]);

      authService.notifySessionRefresh(refreshedSession);
      processQueue(null, refreshedSession.accessToken);

      const headers =
        originalRequest.headers instanceof AxiosHeaders
          ? originalRequest.headers
          : new AxiosHeaders(originalRequest.headers ?? {});

      headers.set('Authorization', `Bearer ${refreshedSession.accessToken}`);
      originalRequest.headers = headers;

      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      await clearTokens();
      authService.notifyAuthFailure();
      throw normalizeApiError(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

async function request<T>(config: AxiosRequestConfig) {
  try {
    const response = await api.request<T>(config);
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export const apiClient = {
  get<T>(path: string, options: Omit<RequestOptions, 'data' | 'method' | 'url'> = {}) {
    return request<T>({ ...options, method: 'GET', url: path });
  },
  post<T>(path: string, body?: unknown, options: Omit<RequestOptions, 'data' | 'method' | 'url'> = {}) {
    return request<T>({ ...options, method: 'POST', url: path, data: body });
  },
  patch<T>(path: string, body?: unknown, options: Omit<RequestOptions, 'data' | 'method' | 'url'> = {}) {
    return request<T>({ ...options, method: 'PATCH', url: path, data: body });
  },
  delete<T>(path: string, options: Omit<RequestOptions, 'data' | 'method' | 'url'> = {}) {
    return request<T>({ ...options, method: 'DELETE', url: path });
  },
};
