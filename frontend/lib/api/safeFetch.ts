import { withAuthInit, refreshAuthToken, clearAuthToken } from '@/lib/auth/token';

/**
 * Safe fetch wrapper that prevents silent error swallowing.
 * Returns a discriminated union so callers must handle errors explicitly.
 */
export interface SafeFetchError {
  ok: false;
  status: number;
  statusText: string;
  error: string;
}

export interface SafeFetchSuccess<T> {
  ok: true;
  data: T;
  status: number;
}

export type SafeFetchResult<T> = SafeFetchSuccess<T> | SafeFetchError;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function isAuthRefreshRequest(input: RequestInfo | URL): boolean {
  const url = typeof input === 'string' ? input : input.toString();
  return url.includes('/api/auth/refresh');
}

async function fetchWithAuthRetry<T>(
  fetcher: () => Promise<SafeFetchResult<T>>,
  input: RequestInfo | URL,
  context?: string
): Promise<SafeFetchResult<T>> {
  const result = await fetcher();

  // On 401, try to refresh the session once and retry the request.
  // Skip refresh for the refresh request itself to avoid infinite loops.
  if (!result.ok && result.status === 401 && !isAuthRefreshRequest(input)) {
    const refreshed = await refreshAuthToken();
    if (refreshed) {
      return fetcher();
    }
    clearAuthToken();
  }

  return result;
}

/**
 * Fetch with automatic JSON parsing and structured error handling.
 * Never swallows errors silently.
 *
 * On 401, attempts to refresh the session and retry once.
 *
 * @param requireAuth - When true (default), injects auth headers/credentials.
 */
export async function safeFetchJson<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit,
  context?: string,
  requireAuth = true
): Promise<SafeFetchResult<T>> {
  try {
    const doFetch = async (): Promise<SafeFetchResult<T>> => {
      const finalInit = requireAuth ? withAuthInit(init) : init;
      const response = await fetch(input, finalInit);

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        const error: SafeFetchError = {
          ok: false,
          status: response.status,
          statusText: response.statusText,
          error: text || `HTTP ${response.status} ${response.statusText}`
        };
        if (context) {
          console.warn(`[safeFetch] ${context} failed:`, error);
        }
        return error;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return { ok: true, data: undefined as T, status: 204 };
      }

      const data = (await response.json().catch((err) => ({
        __parseError: true,
        __parseErrorMessage: getErrorMessage(err)
      }))) as T | { __parseError: true; __parseErrorMessage: string };

      if (data && typeof data === 'object' && '__parseError' in data) {
        const error: SafeFetchError = {
          ok: false,
          status: response.status,
          statusText: response.statusText,
          error: `JSON parse error: ${(data as { __parseErrorMessage: string }).__parseErrorMessage}`
        };
        if (context) {
          console.warn(`[safeFetch] ${context} JSON parse failed:`, error);
        }
        return error;
      }

      return { ok: true, data: data as T, status: response.status };
    };

    return await fetchWithAuthRetry(doFetch, input, context);
  } catch (networkError) {
    const error: SafeFetchError = {
      ok: false,
      status: 0,
      statusText: 'Network Error',
      error: getErrorMessage(networkError)
    };
    if (context) {
      console.warn(`[safeFetch] ${context} network error:`, error);
    }
    return error;
  }
}

/**
 * Fetch for binary responses (blobs).
 * Used for endpoints that return non-JSON data such as images or ZIP files.
 *
 * On 401, attempts to refresh the session and retry once.
 *
 * @param requireAuth - When true (default), injects auth headers/credentials.
 */
export async function safeFetchBlob(
  input: RequestInfo | URL,
  init?: RequestInit,
  context?: string,
  requireAuth = true
): Promise<SafeFetchResult<Blob>> {
  try {
    const doFetch = async (): Promise<SafeFetchResult<Blob>> => {
      const finalInit = requireAuth ? withAuthInit(init) : init;
      const response = await fetch(input, finalInit);

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        const error: SafeFetchError = {
          ok: false,
          status: response.status,
          statusText: response.statusText,
          error: text || `HTTP ${response.status} ${response.statusText}`
        };
        if (context) {
          console.warn(`[safeFetchBlob] ${context} failed:`, error);
        }
        return error;
      }

      const blob = await response.blob();
      return { ok: true, data: blob, status: response.status };
    };

    return await fetchWithAuthRetry(doFetch, input, context);
  } catch (networkError) {
    const error: SafeFetchError = {
      ok: false,
      status: 0,
      statusText: 'Network Error',
      error: getErrorMessage(networkError)
    };
    if (context) {
      console.warn(`[safeFetchBlob] ${context} network error:`, error);
    }
    return error;
  }
}
