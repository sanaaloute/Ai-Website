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
  /** Parsed JSON error body, when the server sent one (e.g. PLAN_LIMIT). */
  data?: unknown;
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

/**
 * Backend error responses are JSON objects like
 * `{ "success": false, "error": "..." }`. Surface the human-readable message
 * instead of the raw JSON string so dialogs can display it directly.
 */
function extractErrorBodyMessage(text: string, response: Response): string {
  if (!text) return `HTTP ${response.status} ${response.statusText}`;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === 'object') {
      const body = parsed as Record<string, unknown>;
      const message = body.error ?? body.message;
      if (typeof message === 'string' && message) return message;
    }
  } catch {
    // Not JSON — fall through to the raw body text.
  }
  return text;
}

function isAuthRefreshRequest(input: RequestInfo | URL): boolean {
  const url = typeof input === 'string' ? input : input.toString();
  return url.includes('/api/auth/refresh');
}

/** Default per-request timeouts so a stalled backend can never spin forever. */
const JSON_TIMEOUT_MS = 15_000;
const BLOB_TIMEOUT_MS = 60_000;

function withTimeout(init: RequestInit | undefined, timeoutMs: number): RequestInit {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const callerSignal = init?.signal;
  return {
    ...init,
    signal: callerSignal ? AbortSignal.any([callerSignal, timeoutSignal]) : timeoutSignal,
  };
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}

async function fetchWithAuthRetry<T>(
  fetcher: () => Promise<SafeFetchResult<T>>,
  input: RequestInfo | URL
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
  requireAuth = true,
  timeoutMs: number = JSON_TIMEOUT_MS
): Promise<SafeFetchResult<T>> {
  try {
    const doFetch = async (): Promise<SafeFetchResult<T>> => {
      const finalInit = requireAuth ? withAuthInit(init) : init;
      const response = await fetch(input, withTimeout(finalInit, timeoutMs));

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        let body: unknown;
        try {
          body = text ? JSON.parse(text) : undefined;
        } catch {
          body = undefined;
        }
        const error: SafeFetchError = {
          ok: false,
          status: response.status,
          statusText: response.statusText,
          error: extractErrorBodyMessage(text, response),
          data: body,
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

    return await fetchWithAuthRetry(doFetch, input);
  } catch (networkError) {
    const error: SafeFetchError = {
      ok: false,
      status: 0,
      statusText: 'Network Error',
      error: isTimeoutError(networkError)
        ? 'Request timed out. Please try again.'
        : getErrorMessage(networkError)
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
      const response = await fetch(input, withTimeout(finalInit, BLOB_TIMEOUT_MS));

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        const error: SafeFetchError = {
          ok: false,
          status: response.status,
          statusText: response.statusText,
          error: extractErrorBodyMessage(text, response)
        };
        if (context) {
          console.warn(`[safeFetchBlob] ${context} failed:`, error);
        }
        return error;
      }

      const blob = await response.blob();
      return { ok: true, data: blob, status: response.status };
    };

    return await fetchWithAuthRetry(doFetch, input);
  } catch (networkError) {
    const error: SafeFetchError = {
      ok: false,
      status: 0,
      statusText: 'Network Error',
      error: isTimeoutError(networkError)
        ? 'Request timed out. Please try again.'
        : getErrorMessage(networkError)
    };
    if (context) {
      console.warn(`[safeFetchBlob] ${context} network error:`, error);
    }
    return error;
  }
}
