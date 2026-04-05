// Admin dashboard types matching backend response shapes.
// See docs/06-build-packs/admin-build-pack.md for full spec.

export interface ServiceStatus {
  ok: boolean;
  detail?: string;
}

export interface QueueStatus {
  waiting: number;
  active: number;
  failed: number;
}

export interface HealthResponse {
  api: ServiceStatus;
  database: ServiceStatus;
  redis: ServiceStatus;
  objectStorage: ServiceStatus;
  ai: ServiceStatus & {
    providerMode: string;
    agentId: string | null;
    projectEndpoint: string | null;
    environmentName: string | null;
    location: string | null;
    subscriptionId: string | null;
    projectResourceId: string | null;
    resourceId: string | null;
  };
  queues: Record<string, QueueStatus>;
  lastPaymentAt: string | null;
  lastDispatchAt: string | null;
}

export interface OverviewResponse {
  dispatch: Record<string, number>;
  payments: Record<string, number>;
  ambiguousDispatchQueue: number;
  recentRefunds: number;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Admin API helpers
// ---------------------------------------------------------------------------

export function makeAuthHeader(username: string, password: string): string {
  return `Basic ${btoa(`${username}:${password}`)}`;
}

export async function adminFetch<T>(path: string, authHeader: string): Promise<T> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "/api";
  const res = await fetch(`${apiBase}/v1${path}`, {
    headers: {
      Authorization: authHeader,
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Typed admin fetchers for dashboard endpoints
// ---------------------------------------------------------------------------

import type {
  AdminSummaryResponse,
  AdminActiveResponse,
  AdminFunnelResponse,
  AdminErrorsResponse,
  AdminLocaleResponse,
  AdminAiResponse,
  AdminSessionListResponse,
  AdminRetentionInfo,
} from "@swiss-mail/shared";

export async function fetchAdminSummary(authHeader: string, period = "7d") {
  return adminFetch<AdminSummaryResponse>(
    `/admin/metrics/summary?period=${period}`, authHeader,
  );
}

export async function fetchAdminActive(authHeader: string) {
  return adminFetch<AdminActiveResponse>(
    "/admin/metrics/active", authHeader,
  );
}

export async function fetchAdminFunnel(authHeader: string, period = "7d") {
  return adminFetch<AdminFunnelResponse>(
    `/admin/metrics/funnel?period=${period}`, authHeader,
  );
}

export async function fetchAdminErrors(authHeader: string, period = "7d") {
  return adminFetch<AdminErrorsResponse>(
    `/admin/metrics/errors?period=${period}`, authHeader,
  );
}

export async function fetchAdminLocale(authHeader: string) {
  return adminFetch<AdminLocaleResponse>(
    "/admin/metrics/locale", authHeader,
  );
}

export async function fetchAdminAi(authHeader: string, period = "7d") {
  return adminFetch<AdminAiResponse>(
    `/admin/metrics/ai?period=${period}`, authHeader,
  );
}

export async function fetchAdminSessions(authHeader: string, params: string) {
  return adminFetch<AdminSessionListResponse>(
    `/admin/sessions?${params}`, authHeader,
  );
}

export async function fetchAdminRetention(authHeader: string) {
  return adminFetch<AdminRetentionInfo>(
    "/admin/retention", authHeader,
  );
}

export async function adminPost<T>(path: string, authHeader: string): Promise<T> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "/api";
  const res = await fetch(`${apiBase}/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}
