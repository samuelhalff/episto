"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { useDraft, useDraftFiles, useLetterPreview } from "@/hooks/use-api";
import { useStepTracking } from "@/hooks/use-step-tracking";
import { Loader2 } from "lucide-react";
import { useDispatchQuote } from "@/hooks/use-dispatch-quote";
import { ReviewPageReady } from "@/components/product/review/ReviewPageReady";

export default function ReviewPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = use(params);
  const tc = useTranslations("common");
  const draft = useDraft(draftId);
  useStepTracking({
    step: "draft_review",
    draftId,
    ...(draft.data?.locale ? { locale: draft.data.locale } : {}),
  });
  const preview = useLetterPreview(draftId);
  const { attachments } = useDraftFiles(draftId);
  const quote = useDispatchQuote(
    draftId,
    Boolean(draft.data) && !["reviewed", "rendering"].includes(draft.data?.status ?? ""),
  );

  if (draft.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (draft.error || !draft.data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">{tc("error")}</p>
      </div>
    );
  }

  return (
    <ReviewPageReady
      draftId={draftId}
      draft={draft}
      preview={preview}
      attachments={attachments}
      quote={quote}
    />
  );
}
