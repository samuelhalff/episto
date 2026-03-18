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
    mutationFn: (input: { transition: string }) =>
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

export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: (input: { draftId: string; email: string }) =>
      apiFetch<{ clientSecret: string }>("/v1/payments/create-intent", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  });
}
