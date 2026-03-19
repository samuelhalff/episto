"use client";

import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "../lib/api.js";
import type {
  Session,
  DraftLetter,
  DraftSnapshot,
  ConversationMessage,
  FileAsset,
} from "@swiss-mail/shared";
import type {
  UpdateDraftInputType,
  SendMessageInputType,
} from "@swiss-mail/shared";

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

function sessionOptions() {
  return queryOptions({
    queryKey: ["sessions", "current"] as const,
    queryFn: () => apiFetch<Session>("/v1/sessions/current"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSession() {
  return useQuery(sessionOptions());
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input?: { locale?: string | undefined }) =>
      apiFetch<Session>("/v1/sessions", {
        method: "POST",
        body: JSON.stringify(input ?? {}),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(sessionOptions().queryKey, data);
    },
  });
}

// ---------------------------------------------------------------------------
// Drafts
// ---------------------------------------------------------------------------

function draftOptions(draftId: string) {
  return queryOptions({
    queryKey: ["drafts", draftId] as const,
    queryFn: () => apiFetch<DraftLetter>(`/v1/drafts/${draftId}`),
    staleTime: 30_000,
  });
}

export function useDraft(draftId: string) {
  return useQuery(draftOptions(draftId));
}

function draftsOptions() {
  return queryOptions({
    queryKey: ["drafts"] as const,
    queryFn: () => apiFetch<DraftLetter[]>("/v1/drafts"),
  });
}

export function useDrafts() {
  return useQuery(draftsOptions());
}

export function useCreateDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<DraftLetter>("/v1/drafts", { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["drafts"] });
    },
  });
}

export function useUpdateDraft(draftId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDraftInputType) =>
      apiFetch<DraftLetter>(`/v1/drafts/${draftId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(draftOptions(draftId).queryKey, data);
    },
  });
}

export function useTransitionDraft(draftId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { status: string }) =>
      apiFetch<DraftLetter>(`/v1/drafts/${draftId}/transition`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(draftOptions(draftId).queryKey, data);
    },
  });
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export function useSetSender(draftId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      firstName: string;
      lastName: string;
      addressLine1: string;
      postalCode: string;
      city: string;
      country?: string | undefined;
      companyName?: string | undefined;
      addressLine2?: string | undefined;
      email?: string | undefined;
      phone?: string | undefined;
    }) =>
      apiFetch(`/v1/drafts/${draftId}/sender`, {
        method: "PUT",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: draftOptions(draftId).queryKey,
      });
    },
  });
}

export function useSetRecipient(draftId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      addressLine1: string;
      postalCode: string;
      city: string;
      country?: string | undefined;
      firstName?: string | undefined;
      lastName?: string | undefined;
      companyName?: string | undefined;
      department?: string | undefined;
      addressLine2?: string | undefined;
    }) =>
      apiFetch(`/v1/drafts/${draftId}/recipient`, {
        method: "PUT",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: draftOptions(draftId).queryKey,
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

function messagesOptions(draftId: string) {
  return queryOptions({
    queryKey: ["drafts", draftId, "messages"] as const,
    queryFn: () =>
      apiFetch<ConversationMessage[]>(`/v1/drafts/${draftId}/messages`),
  });
}

export function useMessages(draftId: string) {
  return useQuery(messagesOptions(draftId));
}

export function useSendMessage(draftId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendMessageInputType) =>
      apiFetch<ConversationMessage>(`/v1/drafts/${draftId}/messages`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: messagesOptions(draftId).queryKey,
      });
      void queryClient.invalidateQueries({
        queryKey: draftOptions(draftId).queryKey,
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

function filesOptions(draftId: string) {
  return queryOptions({
    queryKey: ["drafts", draftId, "files"] as const,
    queryFn: () => apiFetch<FileAsset[]>(`/v1/drafts/${draftId}/files`),
  });
}

export function useFiles(draftId: string) {
  return useQuery(filesOptions(draftId));
}

export function useDeleteFile(draftId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) =>
      apiFetch<void>(`/v1/drafts/${draftId}/files/${fileId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: filesOptions(draftId).queryKey,
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export function useCheckout(draftId: string) {
  return useMutation({
    mutationFn: (input: { email: string }) =>
      apiFetch<{ clientSecret: string | null; paymentAttemptId: string; priceCents: number; currency: string }>(
        `/v1/drafts/${draftId}/checkout`,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      ),
  });
}

function paymentOptions(draftId: string) {
  return queryOptions({
    queryKey: ["drafts", draftId, "payment"] as const,
    queryFn: () =>
      apiFetch<{ payment: { state: string; priceCents: number | null } }>(
        `/v1/drafts/${draftId}/payment`,
      ),
    staleTime: 10_000,
  });
}

export function usePayment(draftId: string) {
  return useQuery(paymentOptions(draftId));
}

// ---------------------------------------------------------------------------
// Review / Preview
// ---------------------------------------------------------------------------

export function useReviewDraft(draftId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ snapshot: DraftSnapshot }>(`/v1/drafts/${draftId}/review`, {
        method: "POST",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: draftOptions(draftId).queryKey,
      });
    },
  });
}

interface LetterPreview {
  draftId: string;
  snapshotId: string | null;
  locale: string;
  deliveryType: string;
  subject: string | null;
  body: string | null;
  enclosureNote: string | null;
  signatureMode: string | null;
  sender: Record<string, unknown> | null;
  recipient: Record<string, unknown> | null;
  attachmentFileIds: string[];
  signatureFileId: string | null;
  estimatedPages: number | null;
}

function previewOptions(draftId: string) {
  return queryOptions({
    queryKey: ["drafts", draftId, "preview"] as const,
    queryFn: () =>
      apiFetch<{ preview: LetterPreview }>(`/v1/drafts/${draftId}/preview`),
    staleTime: 30_000,
  });
}

export function useLetterPreview(draftId: string) {
  return useQuery(previewOptions(draftId));
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

interface DispatchStatus {
  draftId: string;
  dispatchAttemptId: string | null;
  state: string;
  providerRef: string | null;
  submittedAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  trackingAvailable: boolean;
  lastCheckedAt: string | null;
}

function dispatchOptions(draftId: string) {
  return queryOptions({
    queryKey: ["drafts", draftId, "dispatch"] as const,
    queryFn: () =>
      apiFetch<{ dispatch: DispatchStatus }>(`/v1/drafts/${draftId}/dispatch`),
    staleTime: 30_000,
  });
}

export function useDispatchStatus(draftId: string) {
  return useQuery(dispatchOptions(draftId));
}
