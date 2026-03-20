"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { useDraft, useUpdateDraft, useDraftFiles, useReviewDraft } from "../../../../../hooks/use-api.js";
import { usePricing, formatCentsAsCHF } from "../../../../../hooks/use-pricing.js";
import { Link, useRouter } from "../../../../../i18n/navigation.js";
import { ChevronRight, ArrowLeft, Loader2, Mail } from "lucide-react";
import { DeliveryType } from "@swiss-mail/shared";
import { ChecklistItem } from "../../../../../components/product/ChecklistItem.js";
import { DeliverySelector } from "../../../../../components/product/DeliverySelector.js";
import { LetterPreview } from "../../../../../components/product/LetterPreview.js";
import { captureError } from "../../../../../lib/error-tracking.js";
import { Button } from "../../../../../components/ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../components/ui/card.js";

export default function ReviewPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = use(params);
  const t = useTranslations("review");
  const tc = useTranslations("common");
  const draft = useDraft(draftId);
  const updateDraft = useUpdateDraft(draftId);
  const reviewDraft = useReviewDraft(draftId);
  const { attachments } = useDraftFiles(draftId);
  const pricing = usePricing();
  const router = useRouter();

  if (draft.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (draft.error || !draft.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">{tc("error")}</p>
      </div>
    );
  }

  const d = draft.data;
  const hasSender = Boolean(d.senderProfileId);
  const hasRecipient = Boolean(d.recipientProfileId);
  const hasBody = Boolean(d.body);
  const hasSubject = Boolean(d.subject);
  const hasAttachments = attachments.length > 0;
  const allComplete = hasSender && hasRecipient && hasBody && hasSubject;

  const isRegistered = d.deliveryType === DeliveryType.registered;
  const totalDisplay = pricing.data
    ? isRegistered
      ? pricing.data.registered.displayPrice
      : pricing.data.standard.displayPrice
    : formatCentsAsCHF(isRegistered ? 890 : 490);

  function handleDeliveryChange(type: string) {
    updateDraft.mutate({ deliveryType: type as "standard" | "registered" });
  }

  function handleProceedToPayment() {
    if (reviewDraft.isPending) return;
    const alreadyPrepared = ["reviewed", "rendering", "ready", "submitted", "dispatched"].includes(d.status);
    if (alreadyPrepared) {
      router.push(`/draft/${draftId}/checkout`);
      return;
    }
    void reviewDraft.mutateAsync().then(() => {
      router.push(`/draft/${draftId}/checkout`);
    }).catch((err: unknown) => {
      captureError(err instanceof Error ? err : new Error(String(err)), { component: "ReviewPage", route: `/draft/${draftId}/review` });
    });
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b border-border bg-background px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Mail className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">{tc("appName")}</span>
          </Link>
          <span className="text-sm font-medium text-foreground">{t("title")}</span>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-4xl space-y-8 px-4 py-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        {/* Letter preview */}
        <Card>
          <CardContent className="p-6">
            <LetterPreview draft={d} />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("checklist")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                <ChecklistItem label={t("senderDetails")} complete={hasSender} />
                <ChecklistItem label={t("recipientDetails")} complete={hasRecipient} />
                <ChecklistItem label={t("letterBody")} complete={hasBody} />
                <ChecklistItem label={t("subjectLine")} complete={hasSubject} />
                <ChecklistItem label={t("signature")} complete={Boolean(d.signatureMode)} />
                <ChecklistItem label={t("attachments")} complete={hasAttachments} />
              </ul>
            </CardContent>
          </Card>

          {/* Delivery + pricing */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <DeliverySelector value={d.deliveryType} onChange={handleDeliveryChange} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center justify-between p-6">
                <span className="text-sm font-medium text-muted-foreground">{t("total")}</span>
                <span className="text-2xl font-bold text-foreground">{totalDisplay}</span>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/draft/${draftId}`}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              {t("backToEditing")}
            </Link>
          </Button>

          <Button
            onClick={handleProceedToPayment}
            disabled={!allComplete || reviewDraft.isPending}
            size="lg"
          >
            {reviewDraft.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("proceedToPayment")}
            <ChevronRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
