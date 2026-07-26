// Admin dashboard types matching backend response shapes.
// See docs/06-build-packs/admin-build-pack.md for full spec.

import { getApiBase } from "@/lib/api";
import { downloadFile } from "@/lib/download-file";
import { type AdminSessionStatus } from "./admin-auth-client";

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
  failedDispatches: number;
  recentRefunds: number;
  suspiciousActivityQueue: number;
  generatedAt: string;
}

async function readApiError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as
      | { error?: string | { message?: string } }
      | undefined;

    if (typeof body?.error === "string" && body.error.trim()) {
      return body.error;
    }

    if (
      body?.error &&
      typeof body.error === "object" &&
      typeof body.error.message === "string" &&
      body.error.message.trim()
    ) {
      return body.error.message;
    }
  } catch {
    // Ignore JSON parse errors and fall back to the status code.
  }

  return `API error ${res.status}`;
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
    throw new Error(await readApiError(res));
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
    throw new Error(await readApiError(res));
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
    throw new Error(await readApiError(res));
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
  AdminSessionDetailResponse,
  AdminSearchResponse,
  AdminDraftCaseResponse,
  AdminDraftTimelineResponse,
  AdminSuspiciousQueueResponse,
  AdminRetentionInfo,
  AdminAudienceKind,
  AdminSentAudienceResponse,
} from "@episto/shared";

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

export async function fetchAdminOverview() {
  return adminFetch<OverviewResponse>("/admin/overview");
}

export async function fetchAdminSessions(params = "") {
  return adminFetch<AdminSessionListResponse>(`/admin/sessions?${params}`);
}

export async function fetchAdminSession(id: string) {
  return adminFetch<AdminSessionDetailResponse>(`/admin/sessions/${id}`);
}

export async function fetchAdminSearch(q: string) {
  return adminFetch<AdminSearchResponse>(`/admin/search?q=${encodeURIComponent(q)}`);
}

export async function fetchAdminDraftCase(id: string) {
  return adminFetch<AdminDraftCaseResponse>(`/admin/drafts/${id}`);
}

export async function fetchAdminDraftTimeline(id: string) {
  return adminFetch<AdminDraftTimelineResponse>(`/admin/drafts/${id}/timeline`);
}

export async function fetchAdminSuspiciousQueue() {
  return adminFetch<AdminSuspiciousQueueResponse>("/admin/flags/suspicious");
}

export async function fetchAdminRetention() {
  return adminFetch<AdminRetentionInfo>("/admin/retention");
}

export async function fetchAdminSentAudience() {
  return adminFetch<AdminSentAudienceResponse>("/admin/audience/sent-or-dispatching");
}

export async function downloadAdminAudienceExport(
  kind: AdminAudienceKind,
): Promise<void> {
  const path = "/v1/admin/audience/sent-or-dispatching.csv";
  const fallbackFileName = "episto-sent-or-dispatching-audience.csv";
  void kind;
  return downloadFile(path, fallbackFileName);
}

export interface AdminStepFrictionResponse {
  steps: Array<{
    step: string;
    entered: number;
    completed: number;
    idle: number;
    abandoned: number;
    errors: number;
    medianDurationMs: number;
    dropOffPercent: number;
  }>;
  stuckUsers: Array<{
    sessionId: string;
    draftId: string | null;
    step: string;
    lastSeen: string;
  }>;
  periodLabel: string;
  generatedAt: string;
}

export async function fetchAdminStepFriction(period = "7d") {
  return adminFetch<AdminStepFrictionResponse>(
    `/admin/metrics/step-friction?period=${period}`,
  );
}

async function adminMutate<T>(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${getApiBase()}/v1${path}`, {
    method,
    credentials: "include",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      "Content-Type": "application/json",
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<T>;
}

export function adminPost<T>(path: string, body?: unknown): Promise<T> {
  return adminMutate<T>("POST", path, body);
}

export function adminPatch<T>(path: string, body?: unknown): Promise<T> {
  return adminMutate<T>("PATCH", path, body);
}

export function adminDelete<T>(path: string): Promise<T> {
  return adminMutate<T>("DELETE", path);
}
