"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api.js";
import { draftOptions } from "./use-draft.js";

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
