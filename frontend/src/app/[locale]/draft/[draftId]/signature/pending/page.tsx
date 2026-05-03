"use client";

import { use, useEffect } from "react";
import { ArrowRight, Clock, Loader2 } from "lucide-react";
import { useDraftFulfillment } from "@/hooks/use-api";
import { useRouter } from "@/i18n/navigation";
import { SignatureFlowLayout } from "@/components/product/signature/SignatureFlowLayout";
import { ActionLink } from "@/components/product/ActionButton";

export default function SignaturePendingPage({
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

    if (nextAction === "resume_signature") {
      router.replace(`/draft/${draftId}/signature/resume`);
    }
  }, [draftId, nextAction, router]);

  const waitingForSignature =
    signatureSession?.status === "signature_session_created" ||
    signatureSession?.status === "signature_in_progress" ||
    signatureSession?.status === "identity_stepup_started";

  return (
    <SignatureFlowLayout
      draftId={draftId}
      eyebrow="Finalizing"
      title={
        waitingForSignature
          ? "Finish your signature to continue"
          : "We’re finalizing your signed letter"
      }
      description={
        waitingForSignature
          ? "We’re waiting for SwissSign to confirm the signing step. If you left the wallet flow, you can resume it."
          : "The signed PDF is in place. We’re finishing payment and dispatch checks before showing success."
      }
      badge={
        <span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
          <Clock className="h-3.5 w-3.5" />
          In progress
        </span>
      }
      footer={
        signatureSession?.handoffUrl ? (
          <ActionLink
            href={`/draft/${draftId}/signature/resume`}
            variant="secondary"
            fullWidth
            trailingIcon={<ArrowRight className="h-4 w-4 shrink-0" />}
          >
            Resume signing
          </ActionLink>
        ) : undefined
      }
    >
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-sm text-zinc-600 dark:text-zinc-300">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <p>This page updates from the backend state, not from the redirect alone.</p>
      </div>
    </SignatureFlowLayout>
  );
}
