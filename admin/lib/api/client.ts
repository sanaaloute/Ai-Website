"use client";

import {
  User,
  UserDetail,
  Subscription,
  StatsOverview,
  BehaviorData,
  ActivityLog,
  PaginatedResponse,
  Generation,
  GenerationMetrics,
  QueueMetrics,
  SandboxInventory,
} from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

const API_BASE = "/api/admin";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function isAuthRoute(url: string): boolean {
  return url.startsWith(`${API_BASE}/auth/`);
}

function handleUnauthorized() {
  const { logout } = useAuthStore.getState();
  logout();

  if (typeof window === "undefined") return;

  // Don't redirect if the user is already on an auth page.
  const publicAuthPaths = ["/login", "/register", "/reset-password"];
  if (publicAuthPaths.some((path) => window.location.pathname.startsWith(path))) {
    return;
  }

  // Preserve the current path so we can redirect back after login.
  const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace(`/login?returnUrl=${returnUrl}`);
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message = errorBody.error || `HTTP ${res.status}`;

    if (res.status === 401 && !isAuthRoute(url)) {
      handleUnauthorized();
    }

    throw new ApiError(message, res.status);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

// ─── Auth ───────────────────────────────────────────────────────────

export interface LoginResponse {
  success: boolean;
  admin: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
}

export async function loginAdmin(
  email: string,
  password: string
): Promise<LoginResponse> {
  return fetchJson<LoginResponse>(`${API_BASE}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logoutAdmin(): Promise<{ success: boolean }> {
  return fetchJson<{ success: boolean }>(`${API_BASE}/auth/logout`, {
    method: "POST",
  });
}

export interface RegisterResponse {
  success: boolean;
  message: string;
}

export async function registerAdmin(
  email: string,
  password: string,
  full_name: string,
  secret?: string
): Promise<RegisterResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (secret) {
    headers["X-Admin-Registration-Secret"] = secret;
  }
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({ email, password, full_name }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new ApiError(errorBody.error || `HTTP ${res.status}`, res.status);
  }

  return res.json();
}

export async function forgotPassword(email: string): Promise<{
  success: boolean;
  message: string;
  reset_token?: string;
}> {
  return fetchJson(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(
  token: string,
  new_password: string
): Promise<{ success: boolean; message: string }> {
  return fetchJson(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    body: JSON.stringify({ token, new_password }),
  });
}

export async function fetchMe(): Promise<{
  id: string;
  email: string;
  full_name: string;
  role: string;
}> {
  return fetchJson(`${API_BASE}/auth/me`);
}

// ─── Dashboard Data ─────────────────────────────────────────────────

export async function fetchStats(): Promise<StatsOverview> {
  const stats = await fetchJson<StatsOverview>(`${API_BASE}/stats`);
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[fetchStats] raw response:", stats);
  }
  return stats;
}

export async function fetchUsers(
  page = 1,
  limit = 20,
  search = "",
  status = ""
): Promise<PaginatedResponse<User>> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (search) params.set("search", search);
  if (status) params.set("status", status);

  return fetchJson<PaginatedResponse<User>>(
    `${API_BASE}/users?${params.toString()}`
  );
}

export async function fetchUserDetail(id: string): Promise<UserDetail | null> {
  try {
    return await fetchJson<UserDetail>(`${API_BASE}/users/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function updateUserStatus(
  id: string,
  status: string
): Promise<void> {
  await fetchJson<void>(`${API_BASE}/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function deleteUser(id: string): Promise<void> {
  await fetchJson<void>(`${API_BASE}/users/${id}`, {
    method: "DELETE",
  });
}

export async function fetchSubscriptions(
  page = 1,
  limit = 20,
  plan = "",
  status = ""
): Promise<PaginatedResponse<Subscription>> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (plan) params.set("plan", plan);
  if (status) params.set("status", status);

  return fetchJson<PaginatedResponse<Subscription>>(
    `${API_BASE}/subscriptions?${params.toString()}`
  );
}

export async function cancelSubscription(
  id: string,
  reason: string
): Promise<void> {
  await fetchJson<void>(`${API_BASE}/subscriptions/${id}/cancel`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
}

export async function fetchBehavior(): Promise<BehaviorData> {
  return fetchJson<BehaviorData>(`${API_BASE}/behavior`);
}

export async function fetchActivity(limit = 50): Promise<ActivityLog[]> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  return fetchJson<ActivityLog[]>(`${API_BASE}/activity?${params.toString()}`);
}

// ─── Generation Observability ───────────────────────────────────────

export async function fetchGenerations(
  page = 1,
  limit = 20,
  status = ""
): Promise<PaginatedResponse<Generation>> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (status) params.set("status", status);
  return fetchJson<PaginatedResponse<Generation>>(
    `${API_BASE}/generations?${params.toString()}`
  );
}

export async function fetchGenerationMetrics(): Promise<GenerationMetrics> {
  return fetchJson<GenerationMetrics>(`${API_BASE}/generations/metrics`);
}

export async function fetchQueueMetrics(): Promise<QueueMetrics> {
  return fetchJson<QueueMetrics>(`${API_BASE}/queue`);
}

export async function fetchSandboxInventory(): Promise<SandboxInventory> {
  return fetchJson<SandboxInventory>(`${API_BASE}/sandboxes`);
}
