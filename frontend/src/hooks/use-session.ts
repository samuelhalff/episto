"use client";

import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "../lib/api.js";
import type { Session } from "@swiss-mail/shared";
import { type Locale, queryKeys } from "@swiss-mail/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExpiryWarningLevel = "none" | "warning" | "critical";

export interface UseSessionReturn {
  session: Session | null;
  isLoading: boolean;
  isExpired: boolean;
  /** 'warning' when < 1 hour remaining; 'critical' when < 5 minutes */
  expiryWarningLevel: ExpiryWarningLevel;
  createSession: (locale: (typeof Locale)[keyof typeof Locale]) => Promise<Session>;
  resumeSession: (token: string) => Promise<Session>;
}

// ---------------------------------------------------------------------------
// Query options — shared key shape matches queryKeys.session('current')
// ---------------------------------------------------------------------------

function currentSessionOptions() {
  return queryOptions({
    queryKey: queryKeys.session("current"),
    queryFn: () =>
      apiFetch<{ session: Session }>("/v1/sessions/current").then((r) => r.session),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

// ---------------------------------------------------------------------------
// Expiry helpers
// ---------------------------------------------------------------------------

const WARNING_THRESHOLD_MS = 60 * 60 * 1000;  // 1 hour
const CRITICAL_THRESHOLD_MS = 5 * 60 * 1000;  // 5 minutes

function computeExpiryLevel(session: Session | null | undefined): {
  isExpired: boolean;
  expiryWarningLevel: ExpiryWarningLevel;
} {
  if (!session?.expiresAt) {
    return { isExpired: false, expiryWarningLevel: "none" };
  }

  const expiresAt = new Date(session.expiresAt).getTime();
  const remaining = expiresAt - Date.now();

  if (remaining <= 0) {
    return { isExpired: true, expiryWarningLevel: "critical" };
  }
  if (remaining < CRITICAL_THRESHOLD_MS) {
    return { isExpired: false, expiryWarningLevel: "critical" };
  }
  if (remaining < WARNING_THRESHOLD_MS) {
    return { isExpired: false, expiryWarningLevel: "warning" };
  }
  return { isExpired: false, expiryWarningLevel: "none" };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSession(): UseSessionReturn {
  const queryClient = useQueryClient();
  const query = useQuery(currentSessionOptions());

  const { isExpired, expiryWarningLevel } = useMemo(
    () => computeExpiryLevel(query.data),
    [query.data],
  );

  const createSession = useMutation({
    mutationFn: (locale: (typeof Locale)[keyof typeof Locale]) =>
      apiFetch<{ session: Session }>("/v1/sessions", {
        method: "POST",
        body: JSON.stringify({ locale }),
      }).then((r) => r.session),
    onSuccess: (data) => {
      queryClient.setQueryData(currentSessionOptions().queryKey, data);
    },
  });

  const resumeSession = useMutation({
    mutationFn: (token: string) =>
      apiFetch<{ session: Session }>("/v1/sessions/resume", {
        method: "POST",
        body: JSON.stringify({ token }),
      }).then((r) => r.session),
    onSuccess: (data) => {
      queryClient.setQueryData(currentSessionOptions().queryKey, data);
    },
  });

  const handleCreateSession = useCallback(
    (locale: (typeof Locale)[keyof typeof Locale]) => createSession.mutateAsync(locale),
    [createSession],
  );

  const handleResumeSession = useCallback(
    (token: string) => resumeSession.mutateAsync(token),
    [resumeSession],
  );

  return {
    session: query.data ?? null,
    isLoading: query.isLoading,
    isExpired,
    expiryWarningLevel,
    createSession: handleCreateSession,
    resumeSession: handleResumeSession,
  };
}
