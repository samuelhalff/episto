// Admin dashboard types matching backend response shapes.
// See docs/06-build-packs/admin-build-pack.md for full spec.

import { getApiBase } from "../../../lib/api";
import {
  type AdminSessionStatus,
} from "./admin-auth-client";

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

export async function adminFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${getApiBase()}/v1${path}`, {
    credentials: "include",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchAdminAuthSession(): Promise<AdminSessionStatus> {
  const res = await fetch(`${getApiBase()}/v1/admin/auth/session`, {
    credentials: "include",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }

  return res.json() as Promise<AdminSessionStatus>;
}

export async function adminLogout(): Promise<void> {
  const res = await fetch(`${getApiBase()}/v1/admin/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }
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

export async function fetchAdminSummary(period = "7d") {
  return adminFetch<AdminSummaryResponse>(`/admin/metrics/summary?period=${period}`);
}

export async function fetchAdminActive() {
  return adminFetch<AdminActiveResponse>("/admin/metrics/active");
}

export async function fetchAdminFunnel(period = "7d") {
  return adminFetch<AdminFunnelResponse>(`/admin/metrics/funnel?period=${period}`);
}

export async function fetchAdminErrors(period = "7d") {
  return adminFetch<AdminErrorsResponse>(`/admin/metrics/errors?period=${period}`);
}

export async function fetchAdminLocale() {
  return adminFetch<AdminLocaleResponse>("/admin/metrics/locale");
}

export async function fetchAdminAi(period = "7d") {
  return adminFetch<AdminAiResponse>(`/admin/metrics/ai?period=${period}`);
}

export async function fetchAdminSessions(params = "") {
  return adminFetch<AdminSessionListResponse>(`/admin/sessions?${params}`);
}

export async function fetchAdminRetention() {
  return adminFetch<AdminRetentionInfo>("/admin/retention");
}

export async function adminPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${getApiBase()}/v1${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      "Content-Type": "application/json",
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}
