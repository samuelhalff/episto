"use client";

import { use } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { useTriggerMockSignatureOutcome } from "@/hooks/use-api";
import { useRouter } from "@/i18n/navigation";
import { SignatureFlowLayout } from "@/components/product/signature/SignatureFlowLayout";
import { ActionButton } from "@/components/product/ActionButton";

export default function MockSignaturePage({
  params,
}: {
  params: Promise<{ draftId: string; providerSessionId: string }>;
}) {
  const { draftId, providerSessionId } = use(params);
  const router = useRouter();
  const callback = useTriggerMockSignatureOutcome(draftId, providerSessionId);

  const runOutcome = (outcome: "completed" | "failed" | "expired") => {
    void callback.mutateAsync(outcome).then(() => {
      router.push(`/draft/${draftId}/signature/pending`);
    });
  };

  return (
    <SignatureFlowLayout
      draftId={draftId}
      eyebrow="Mock handoff"
      title="SwissSign mock session"
      description="Use the mock outcomes below to test return, pending, success, failure, and expiry states before live API details are wired."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <ActionButton fullWidth onClick={() => runOutcome("completed")}>
          Complete
        </ActionButton>
        <ActionButton fullWidth variant="secondary" onClick={() => runOutcome("failed")}>
          Fail
        </ActionButton>
        <ActionButton fullWidth variant="secondary" onClick={() => runOutcome("expired")}>
          Expire
        </ActionButton>
      </div>

      {callback.error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>The mock callback could not be processed.</p>
          </div>
        </div>
      ) : null}

      <ActionButton
        fullWidth
        variant="secondary"
        onClick={() => router.push(`/draft/${draftId}/signature/resume`)}
        trailingIcon={<ArrowRight className="h-4 w-4 shrink-0" />}
      >
        Open resume screen
      </ActionButton>
    </SignatureFlowLayout>
  );
}
