/**
 * Backend-proxied authentication client.
 *
 * All authentication flows go through the AI-Website backend; the frontend never
 * talks directly to the auth provider. Session tokens are stored in httpOnly
 * cookies by the backend, so this module only manages UI-level auth state.
 */

import { backendApiUrl } from '@/lib/api/backendConfig';
import { refreshAuthToken } from './token';

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string | null;
}

interface AuthResponse {
  success: boolean;
  user: AuthUser;
}

let authListeners: Array<(user: AuthUser | null) => void> = [];
let pollingInterval: ReturnType<typeof setInterval> | null = null;

function notifyListeners(user: AuthUser | null) {
  authListeners.forEach((cb) => cb(user));
}

function mapBackendUser(
  user: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  } | null
): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email || '',
    fullName: (user.user_metadata?.full_name as string) || undefined,
    avatarUrl: (user.user_metadata?.avatar_url as string) || null,
  };
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(backendApiUrl(path), {
      credentials: 'include',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { error: body.error || `Request failed (${res.status})` };
    }

    const data = (await res.json().catch(() => ({}))) as T;
    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}

// ─── Public API ─────────────────────────────────────────────────────────

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user?: AuthUser; error?: string }> {
  if (typeof window === 'undefined') {
    return { error: 'Cannot sign in during SSR.' };
  }

  const { data, error } = await apiFetch<AuthResponse>('/api/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (error || !data) {
    return { error };
  }

  const user = mapBackendUser(data.user);
  if (user) notifyListeners(user);
  return { user: user ?? undefined };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  metadata?: { full_name?: string; phone?: string }
): Promise<{ user?: AuthUser; error?: string }> {
  if (typeof window === 'undefined') {
    return { error: 'Cannot sign up during SSR.' };
  }

  const { data, error } = await apiFetch<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      fullName: metadata?.full_name,
      phone: metadata?.phone,
    }),
  });

  if (error || !data) {
    return { error };
  }

  const user = mapBackendUser(data.user);
  if (user) notifyListeners(user);
  return { user: user ?? undefined };
}

export async function signOut(): Promise<{ error?: string }> {
  try {
    await fetch(backendApiUrl('/api/auth/signout'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    // Best-effort server-side revocation; cookies are cleared by the backend.
  }

  notifyListeners(null);
  return {};
}

export async function resetPassword(
  email: string,
  redirectTo?: string
): Promise<{ success?: boolean; error?: string }> {
  if (typeof window === 'undefined') {
    return { error: 'Cannot reset password during SSR.' };
  }

  const { error } = await apiFetch<{ success: boolean }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, redirectTo }),
  });

  if (error) {
    return { error };
  }

  return { success: true };
}

/**
 * Validate the current session with the backend.
 * Returns the backend's view of the user.
 */
export async function getCurrentUser(
  allowRefresh = true
): Promise<AuthUser | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const { data, error } = await apiFetch<{ user?: AuthUser }>('/api/auth/session', {
    credentials: 'include',
  });

  if (error || !data?.user) {
    if (allowRefresh) {
      // Try to refresh once before giving up.
      const refreshed = await refreshAuthToken();
      if (!refreshed) {
        return null;
      }
      return getCurrentUser(false);
    }
    return null;
  }

  return mapBackendUser(data.user);
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(
  callback: (user: AuthUser | null) => void
): () => void {
  authListeners.push(callback);

  return () => {
    authListeners = authListeners.filter((cb) => cb !== callback);
  };
}

/**
 * Poll auth status periodically and notify listeners on change.
 */
export function startAuthPolling(
  intervalMs = 30000
): { stop: () => void } {
  if (typeof window === 'undefined' || pollingInterval) {
    return { stop: () => {} };
  }

  let lastUserId: string | null = getCurrentUserFromMemory();

  const tick = async () => {
    const user = await getCurrentUser();
    const currentId = user?.id ?? null;
    if (currentId !== lastUserId) {
      lastUserId = currentId;
      notifyListeners(user);
    }
  };

  // Run an initial check shortly after mount to avoid racing with getCurrentUser().
  const initialTimeout = setTimeout(tick, 1000);
  pollingInterval = setInterval(tick, intervalMs);

  return {
    stop: () => {
      clearTimeout(initialTimeout);
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    },
  };
}

function getCurrentUserFromMemory(): string | null {
  // With cookie auth we can't inspect the token; rely on the next poll.
  return null;
}
