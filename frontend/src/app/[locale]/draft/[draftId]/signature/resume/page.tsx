"use client";

import { use, useEffect } from "react";
import { AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { useDraftFulfillment } from "@/hooks/use-api";
import { useRouter } from "@/i18n/navigation";
import { SignatureFlowLayout } from "@/components/product/signature/SignatureFlowLayout";
import { ActionButton, ActionLink } from "@/components/product/ActionButton";

export default function SignatureResumePage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = use(params);
  const router = useRouter();
  const fulfillment = useDraftFulfillment(draftId);
  const signatureSession = fulfillment.data?.signatureSession ?? null;
  const nextAction = fulfillment.data?.nextAction ?? null;

  useEffect(() => {
    if (nextAction === "view_confirmation") {
      router.replace(`/draft/${draftId}/confirmation`);
      return;
    }

    if (nextAction === "await_signature_callback" || nextAction === "await_dispatch") {
      router.replace(`/draft/${draftId}/signature/pending`);
      return;
    }

    if (nextAction === "checkout") {
      router.replace(`/draft/${draftId}/checkout`);
    }
  }, [draftId, nextAction, router]);

  return (
    <SignatureFlowLayout
      draftId={draftId}
      eyebrow="Resume signing"
      title="Continue where you left off"
      description="Your signing session is still open. Re-enter the SwissSign flow when you’re ready."
      footer={
        <div className="flex flex-col gap-3 sm:flex-row">
          <ActionLink
            href={`/draft/${draftId}/review`}
            variant="secondary"
            fullWidth
            leadingIcon={<ArrowLeft className="h-4 w-4 shrink-0" />}
          >
            Back to review
          </ActionLink>
          {signatureSession?.handoffUrl ? (
            <ActionButton
              fullWidth
              onClick={() => window.location.assign(signatureSession.handoffUrl ?? "")}
              trailingIcon={<ArrowRight className="h-4 w-4 shrink-0" />}
            >
              Continue signing
            </ActionButton>
          ) : (
            <ActionLink
              href={`/draft/${draftId}/signature/eligibility`}
              variant="primary"
              fullWidth
              trailingIcon={<ArrowRight className="h-4 w-4 shrink-0" />}
            >
              Start again
            </ActionLink>
          )}
        </div>
      }
    >
      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
        {signatureSession?.failureReason ? (
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <p>{signatureSession.failureReason}</p>
          </div>
        ) : (
          <p>
            We’ll keep your draft intact. The order only completes after signing, payment
            capture, and dispatch acceptance all succeed.
          </p>
        )}
      </div>
    </SignatureFlowLayout>
  );
}
