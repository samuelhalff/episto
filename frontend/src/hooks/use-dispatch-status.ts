"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@episto/shared";
import { apiFetch } from "../lib/api";
import { useDraftStream } from "./use-draft-stream";
import type { DispatchState } from "@episto/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DispatchResponse {
  dispatch: {
    draftId: string;
    dispatchAttemptId: string;
    state: string;
    providerRef: string | null;
    providerMode: "mock" | "live" | null;
    submittedAt: string | null;
    acceptedAt: string | null;
    rejectedAt: string | null;
    rejectionReason: string | null;
    trackingAvailable: boolean;
    lastCheckedAt: string | null;
  };
}

export interface DispatchEvent {
  type: "state_change";
  state: string;
  timestamp: string;
}

export interface UseDispatchStatusReturn {
  /** Current canonical dispatch state from server; null while loading */
  dispatchState: (typeof DispatchState)[keyof typeof DispatchState] | null;
  providerReference: string | null;
  providerMode: "mock" | "live" | null;
  /** True only when the provider has confirmed tracking is available */
  isTrackable: boolean;
  /** Timeline of state transitions observed via SSE during this session */
  events: DispatchEvent[];
  isLoading: boolean;
  error: Error | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDispatchStatus(draftId: string): UseDispatchStatusReturn {
  const queryClient = useQueryClient();
  const { subscribe } = useDraftStream(draftId);
  const [events, setEvents] = useState<DispatchEvent[]>([]);

  // Fetch canonical dispatch state from server
  const dispatchQuery = useQuery({
    queryKey: queryKeys.dispatch(draftId),
    queryFn: () =>
      apiFetch<DispatchResponse>(`/v1/drafts/${draftId}/dispatch`).then(
        (r) => r.dispatch,
      ),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  // Consume draft_status SSE events to stay current without polling
  useEffect(() => {
    return subscribe((event) => {
      if (event.type === "draft_status") {
        const newState = event.data.dispatchState;
        setEvents((prev) => [
          ...prev,
          {
            type: "state_change",
            state: newState,
            timestamp: event.data.updatedAt,
          },
        ]);
        // Invalidate so the query refreshes with the new authoritative state
        void queryClient.invalidateQueries({ queryKey: queryKeys.dispatch(draftId) });
      }
    });
  }, [subscribe, queryClient, draftId]);

  const dispatch = dispatchQuery.data;

  return {
    dispatchState:
      (dispatch?.state as (typeof DispatchState)[keyof typeof DispatchState]) ?? null,
    providerReference: dispatch?.providerRef ?? null,
    providerMode: dispatch?.providerMode ?? null,
    // Never label a reference as trackable unless backend confirms it
    isTrackable: dispatch?.trackingAvailable === true,
    events,
    isLoading: dispatchQuery.isLoading,
    error: dispatchQuery.error ?? null,
  };
}
