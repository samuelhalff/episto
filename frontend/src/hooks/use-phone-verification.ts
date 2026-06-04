"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

interface StartPhoneVerificationResponse {
  status: "pending";
  phoneE164: string;
  expiresAt: string;
  resendAvailableAt: string;
}

interface ConfirmPhoneVerificationResponse {
  status: "verified";
  phoneE164: string;
  verifiedAt: string;
}

interface PhoneVerificationStatusResponse {
  status: "verified" | "unverified";
  phoneE164: string | null;
  phoneVerifiedAt: string | null;
}

export function usePhoneVerification(draftId: string) {
  const queryClient = useQueryClient();
  const statusQueryKey = ["phone-verification", draftId] as const;
  const statusQuery = useQuery({
    queryKey: statusQueryKey,
    queryFn: () =>
      apiFetch<PhoneVerificationStatusResponse>(
        `/v1/drafts/${draftId}/phone-verification`,
      ),
    enabled: Boolean(draftId),
    staleTime: 30_000,
  });

  const startMutation = useMutation({
    mutationFn: (phone: string) =>
      apiFetch<StartPhoneVerificationResponse>(
        `/v1/drafts/${draftId}/phone-verification/start`,
        {
          method: "POST",
          body: JSON.stringify({ phone }),
        },
      ),
  });

  const confirmMutation = useMutation({
    mutationFn: (code: string) =>
      apiFetch<ConfirmPhoneVerificationResponse>(
        `/v1/drafts/${draftId}/phone-verification/confirm`,
        {
          method: "POST",
          body: JSON.stringify({ code }),
        },
      ),
    onSuccess: (data) => {
      queryClient.setQueryData<PhoneVerificationStatusResponse>(statusQueryKey, {
        status: "verified",
        phoneE164: data.phoneE164,
        phoneVerifiedAt: data.verifiedAt,
      });
    },
  });

  return {
    start: startMutation.mutateAsync,
    confirm: confirmMutation.mutateAsync,
    status: statusQuery.data ?? null,
    pendingVerification: startMutation.data ?? null,
    verifiedVerification: confirmMutation.data ?? null,
    isSendingCode: startMutation.isPending,
    isConfirmingCode: confirmMutation.isPending,
    error: confirmMutation.error ?? startMutation.error ?? null,
    clearError: () => {
      startMutation.reset();
      confirmMutation.reset();
    },
  };
}
