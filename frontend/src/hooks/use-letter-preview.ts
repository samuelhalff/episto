"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@swiss-mail/shared";
import { apiFetch } from "../lib/api.js";
import { useDraftStream } from "./use-draft-stream.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LetterPreviewData {
  sender: {
    firstName: string;
    lastName: string;
    company: string | null;
    addressLine1: string;
    addressLine2: string | null;
    postalCode: string;
    city: string;
    country: string;
  } | null;
  recipient: {
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    department: string | null;
    addressLine1: string;
    addressLine2: string | null;
    postalCode: string;
    city: string;
    country: string;
  } | null;
  subject: string | null;
  body: string | null;
  locale: string;
  deliveryType: string;
  updatedAt: string;
}

export interface UseLetterPreviewReturn {
  previewData: LetterPreviewData | null;
  /**
   * Client-side estimate based on body length.
   * Exact count comes after backend render.
   */
  estimatedPageCount: number;
  /**
   * True when the draft has changed since the preview was last fetched.
   * Consumers can show a "Preview may be outdated" notice.
   */
  isStale: boolean;
  refreshPreview: () => void;
  isLoading: boolean;
  error: Error | null;
}

// ---------------------------------------------------------------------------
// Page count estimation (rough: ~2 500 chars per A4 page of body text)
// ---------------------------------------------------------------------------

const CHARS_PER_PAGE = 2_500;

function estimatePageCount(body: string | null | undefined): number {
  if (!body) return 1;
  return Math.max(1, Math.ceil(body.length / CHARS_PER_PAGE));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLetterPreview(draftId: string): UseLetterPreviewReturn {
  const queryClient = useQueryClient();
  const { subscribe } = useDraftStream(draftId);
  const [isStale, setIsStale] = useState(false);

  const previewQuery = useQuery({
    queryKey: queryKeys.draftPreview(draftId),
    queryFn: () =>
      apiFetch<{ preview: LetterPreviewData }>(`/v1/drafts/${draftId}/preview`).then(
        (r) => r.preview,
      ),
    staleTime: 60_000,
  });

  // Mark preview as stale when SSE field_update events arrive
  useEffect(() => {
    return subscribe((event) => {
      if (event.type === "field_update") {
        setIsStale(true);
      }
    });
  }, [subscribe]);

  // When the query refreshes, clear stale marker
  useEffect(() => {
    if (!previewQuery.isFetching) {
      setIsStale(false);
    }
  }, [previewQuery.isFetching]);

  const refreshPreview = useCallback(() => {
    setIsStale(false);
    void queryClient.invalidateQueries({ queryKey: queryKeys.draftPreview(draftId) });
  }, [queryClient, draftId]);

  return {
    previewData: previewQuery.data ?? null,
    estimatedPageCount: estimatePageCount(previewQuery.data?.body),
    isStale,
    refreshPreview,
    isLoading: previewQuery.isLoading,
    error: previewQuery.error instanceof Error ? previewQuery.error : null,
  };
}
