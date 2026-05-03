"use client";

import { use, useEffect, useRef } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useDraftFulfillment, useCreateSignatureSession } from "@/hooks/use-api";
import { useRouter } from "@/i18n/navigation";
import { SignatureFlowLayout } from "@/components/product/signature/SignatureFlowLayout";

export default function SignatureReturnPage({
  params,
}: {
  params: Promise<{ draftId: string; locale: string }>;
}) {
  const { draftId, locale } = use(params);
  const router = useRouter();
  const fulfillment = useDraftFulfillment(draftId);
  const createSignatureSession = useCreateSignatureSession(draftId);
  const launchStartedRef = useRef(false);

  useEffect(() => {
    const nextAction = fulfillment.data?.nextAction;
    if (!nextAction) {
      return;
    }

    if (nextAction === "view_confirmation") {
      router.replace(`/draft/${draftId}/confirmation`);
      return;
    }

    if (nextAction === "resume_signature") {
      const handoffUrl = fulfillment.data?.signatureSession?.handoffUrl;
      if (
        handoffUrl &&
        !launchStartedRef.current &&
        !fulfillment.data?.signatureSession?.providerSessionId &&
        !createSignatureSession.isPending
      ) {
        launchStartedRef.current = true;
        const returnUrl = `${window.location.origin}/${locale}/draft/${draftId}/signature/return`;
        void createSignatureSession
          .mutateAsync({ returnUrl })
          .then((response) => {
            if (response.handoffUrl) {
              window.location.assign(response.handoffUrl);
              return;
            }

            router.replace(`/draft/${draftId}/signature/pending`);
          })
          .catch(() => {
            launchStartedRef.current = false;
            router.replace(`/draft/${draftId}/signature/resume`);
          });
      } else {
        router.replace(`/draft/${draftId}/signature/resume`);
      }
      return;
    }

    if (nextAction === "await_signature_callback" || nextAction === "await_dispatch") {
      router.replace(`/draft/${draftId}/signature/pending`);
      return;
    }

    if (nextAction === "eligibility_gate") {
      router.replace(`/draft/${draftId}/signature/eligibility`);
      return;
    }

    if (nextAction === "checkout") {
      router.replace(`/draft/${draftId}/checkout`);
    }
  }, [createSignatureSession, draftId, fulfillment.data, locale, router]);

  return (
    <SignatureFlowLayout
      draftId={draftId}
      eyebrow="Preparing signature"
      title="We’re handing you into SwissSign"
      description="Your payment authorization is being confirmed and the signing session is being prepared."
      badge={
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-100">
          <ShieldCheck className="h-3.5 w-3.5" />
          Authorization first
        </span>
      }
    >
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-sm text-zinc-600 dark:text-zinc-300">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <p>Please wait while we prepare the secure handoff.</p>
      </div>
    </SignatureFlowLayout>
  );
}
