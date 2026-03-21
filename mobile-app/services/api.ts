import { APP_CONFIG } from '@/constants/app';

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
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

async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

async function request<T>(path: string, options: RequestOptions = {}) {
  let response: Response;

  try {
    response = await fetch(`${APP_CONFIG.apiBaseUrl}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (networkError) {
    const cause =
      networkError instanceof Error ? networkError.message : 'Network request failed';

    throw new ApiError(
      `Impossible de joindre l'API Cartigo (${APP_CONFIG.apiBaseUrl}). V\u00e9rifie que le backend tourne et que cet appareil peut l'atteindre.`,
      0,
      { cause }
    );
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'message' in payload
        ? String(payload.message)
        : 'Une erreur est survenue.';

    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export const apiClient = {
  get<T>(path: string, options: Omit<RequestOptions, 'body' | 'method'> = {}) {
    return request<T>(path, { ...options, method: 'GET' });
  },
  post<T>(path: string, body?: unknown, options: Omit<RequestOptions, 'body' | 'method'> = {}) {
    return request<T>(path, { ...options, method: 'POST', body });
  },
  patch<T>(path: string, body?: unknown, options: Omit<RequestOptions, 'body' | 'method'> = {}) {
    return request<T>(path, { ...options, method: 'PATCH', body });
  },
  delete<T>(path: string, options: Omit<RequestOptions, 'body' | 'method'> = {}) {
    return request<T>(path, { ...options, method: 'DELETE' });
  },
};
