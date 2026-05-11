"use client";

import { use } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { SignatureFlowMode } from "@episto/shared";
import { useDraft, useDraftFulfillment, useSignatureEligibility } from "@/hooks/use-api";
import { useRouter } from "@/i18n/navigation";
import { SignatureFlowLayout } from "@/components/product/signature/SignatureFlowLayout";
import { ActionButton, ActionLink } from "@/components/product/ActionButton";
import { Loader2 } from "lucide-react";

export default function SignatureEligibilityPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = use(params);
  const router = useRouter();
  const draft = useDraft(draftId);
  const fulfillment = useDraftFulfillment(draftId);
  const eligibility = useSignatureEligibility(draftId);

  const signatureFlowMode = draft.data?.signatureFlowMode ?? SignatureFlowMode.visual;
  const isSwissSignFlow = signatureFlowMode === SignatureFlowMode.swisssign_ses;

  if (draft.isLoading || fulfillment.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!draft.data || !isSwissSignFlow) {
    router.replace(`/draft/${draftId}/checkout`);
    return null;
  }

  const eligibilityReasons = [
    "You may need a signing account before signing can continue.",
    "For stronger signing flows, a wallet approval may be required.",
    "A supported smartphone with biometrics may be needed for approval.",
    "Identity verification can still be required before signing is accepted.",
    "This path can take longer than a normal letter send.",
  ];

  return (
    <SignatureFlowLayout
      draftId={draftId}
      eyebrow="Signing check"
      title="Check signature readiness before payment"
      description="Provider-backed signing can involve extra identity steps. We set those expectations now so payment still feels fair and the handoff stays clear on mobile."
      badge={
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
          <ShieldCheck className="h-3.5 w-3.5" />
          Signing ready
        </span>
      }
      footer={
        <div className="flex flex-col gap-3 sm:flex-row">
          <ActionLink
            href={`/draft/${draftId}/review`}
            variant="secondary"
            fullWidth
            leadingIcon={<ArrowLeft className="h-4 w-4 shrink-0" />}
          >
            Go back
          </ActionLink>
          <ActionButton
            fullWidth
            onClick={() =>
              eligibility
                .mutateAsync()
                .then(() => router.push(`/draft/${draftId}/checkout`))
            }
            loading={eligibility.isPending}
            trailingIcon={<ArrowRight className="h-4 w-4 shrink-0" />}
          >
            Continue with signature
          </ActionButton>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {eligibilityReasons.map((reason) => (
          <div
            key={reason}
            className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-sm leading-6 text-zinc-700 dark:text-zinc-200"
          >
            {reason}
          </div>
        ))}
      </div>

      {eligibility.error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              We couldn't confirm the signing prerequisites right now. Please try again.
            </p>
          </div>
        </div>
      ) : null}
    </SignatureFlowLayout>
  );
}
