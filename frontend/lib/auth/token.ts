/**
 * Auth token management for the external backend.
 *
 * Auth state is stored in httpOnly cookies set by the backend. The frontend
 * never persists tokens in localStorage or exposes them to JavaScript.
 */

import { backendApiUrl } from '@/lib/api/backendConfig';

let refreshPromise: Promise<boolean> | null = null;
let refreshFailedAt = 0;
const REFRESH_BACKOFF_MS = 60_000;

/**
 * Clear any in-memory auth hints. With httpOnly cookies, the browser
 * automatically drops the session cookies on logout.
 */
export function clearAuthToken(): void {
  // No client-side token storage to clear.
}

/**
 * Refresh the access token using the httpOnly refresh cookie.
 * Deduplicates concurrent refresh attempts and backs off after a
 * non-recoverable failure to avoid hammering the backend.
 */
export async function refreshAuthToken(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  // Back off for a while after a definitive failure (e.g. expired/deleted user).
  if (refreshFailedAt && Date.now() - refreshFailedAt < REFRESH_BACKOFF_MS) {
    return false;
  }

  refreshPromise = (async (): Promise<boolean> => {
    try {
      const res = await fetch(backendApiUrl('/api/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        if (res.status === 401) {
          // The refresh token is dead. Record the failure so we stop retrying
          // on every request, and redirect to login (unless already there).
          refreshFailedAt = Date.now();
          if (
            typeof window !== 'undefined' &&
            !window.location.pathname.includes('/login')
          ) {
            window.location.href = '/login?reason=session_expired';
          }
        }
        return false;
      }

      refreshFailedAt = 0;
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Default RequestInit for backend calls.
 * Uses credentials: 'include' so the browser sends the httpOnly session cookies.
 */
export function withAuthInit(init?: RequestInit): RequestInit {
  return {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  };
}
