"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Mail, Send, Plus, FileText, X } from "lucide-react";
import {
  useDraft,
  useUpdateDraft,
  useDraftFiles,
  useReviewDraft,
  useLetterPreview,
} from "../../../hooks/use-api.js";
import { usePricing } from "../../../hooks/use-pricing.js";
import { useRouter } from "../../../i18n/navigation.js";
import { getApiUrl } from "../../../lib/api.js";
import { ActionCard, Card, DashedCard, DraftShell, PrimaryButton } from "./ui.js";

function getPreviewSenderName(sender: {
  firstName: string;
  lastName: string;
} | null | undefined): string {
  if (!sender) {
    return "";
  }

  return [sender.firstName, sender.lastName].map((part) => part.trim()).filter(Boolean).join(" ");
}

function getPreviewRecipientName(recipient: {
  firstName: string | null;
  lastName: string | null;
  company: string | null;
} | null | undefined): string {
  if (!recipient) {
    return "";
  }

  if (recipient.company?.trim()) {
    return recipient.company.trim();
  }

  return [recipient.firstName ?? "", recipient.lastName ?? ""]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
}

interface StepProps {
  draftId: string;
  onStepClick: () => void;
  isStepMenuOpen?: boolean;
  isCompactViewport?: boolean;
}

export function LogisticsStep({ draftId, onStepClick, isStepMenuOpen, isCompactViewport }: StepProps) {
  const t = useTranslations("draft");
  const router = useRouter();
  const draft = useDraft(draftId);
  const updateDraft = useUpdateDraft(draftId);
  const files = useDraftFiles(draftId);
  const reviewDraft = useReviewDraft(draftId);
  const preview = useLetterPreview(draftId);
  const pricing = usePricing();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);
  const [signatureMode, setSignatureMode] = useState<"typed" | "image">("typed");

  const deliveryType = draft.data?.deliveryType ?? "standard";
  const senderName = getPreviewSenderName(preview.previewData?.sender);
  const recipientName = getPreviewRecipientName(preview.previewData?.recipient);
  const hasBody = Boolean(draft.data?.body?.trim());
  const hasSender = Boolean(senderName.trim());
  const hasRecipient = Boolean(recipientName.trim());
  const canReview = hasBody && hasSender && hasRecipient;
  const missingItems: string[] = [];
  if (!hasSender) missingItems.push(t("reviewMissingSender"));
  if (!hasRecipient) missingItems.push(t("reviewMissingRecipient"));
  if (!hasBody) missingItems.push(t("reviewMissingBody"));

  async function handleSelectDelivery(type: "standard" | "registered") {
    await updateDraft.mutateAsync({ deliveryType: type });
  }

  async function handleUpload(file: File) {
    await files.uploadFile(file, "attachment");
  }

  async function handleReview() {
    if (reviewDraft.isPending) return;
    await reviewDraft.mutateAsync();
    router.push(`/draft/${draftId}/review`);
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const registeredPrice = pricing.data?.registered?.displayPrice ?? t("priceUnavailable");
  const standardPrice = pricing.data?.standard?.displayPrice ?? t("priceUnavailable");

  return (
    <DraftShell
      step={6}
      totalSteps={6}
      title={t("logisticsTitle")}
      subtitle={t("logisticsSubtitle")}
      onStepClick={onStepClick}
      stepTriggerLabel={t("stepMenuLabel")}
      isStepMenuOpen={isStepMenuOpen}
      isCompactViewport={isCompactViewport}
      primaryAction={
        <>
          {missingItems.length > 0 && (
            <div className="mb-2 space-y-1 px-2">
              {missingItems.map((msg) => (
                <div key={msg} className="text-[11px] text-amber-600">
                  {msg}
                </div>
              ))}
            </div>
          )}
          <PrimaryButton onClick={handleReview} disabled={!canReview} loading={reviewDraft.isPending}>
            {t("reviewAndPay")}
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-10 pb-4">
        {/* Delivery Method */}
        <section className="space-y-5">
          <h3 className="px-2 text-[11px] font-bold uppercase tracking-widest text-zinc-400">
            {t("deliveryMethodLabel")}
          </h3>
          <div className="grid gap-3">
            <ActionCard
              onClick={() => void handleSelectDelivery("registered")}
              isCompactViewport={isCompactViewport}
              selected={deliveryType === "registered"}
              selectedClassName="bg-zinc-950 text-white ring-zinc-950 shadow-lg"
              unselectedClassName="bg-white text-zinc-900 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    deliveryType === "registered"
                      ? "bg-white/10"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  <Mail className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="text-[14px] font-bold">{t("registeredMail")}</div>
                  <div
                    className={`mt-0.5 text-[10px] ${
                      deliveryType === "registered" ? "text-white/60" : "text-zinc-400"
                    }`}
                  >
                    {t("registeredMailDesc")}
                  </div>
                </div>
              </div>
              <div
                className={`text-[14px] font-bold ${
                  deliveryType === "registered" ? "text-emerald-400" : "text-zinc-900 dark:text-zinc-100"
                }`}
              >
                {registeredPrice}
              </div>
            </ActionCard>

            <ActionCard
              onClick={() => void handleSelectDelivery("standard")}
              isCompactViewport={isCompactViewport}
              selected={deliveryType === "standard"}
              selectedClassName="bg-zinc-950 text-white ring-zinc-950 shadow-lg"
              unselectedClassName="bg-white text-zinc-900 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    deliveryType === "standard"
                      ? "bg-white/10"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  <Send className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="text-[14px] font-bold">{t("standardMail")}</div>
                  <div
                    className={`mt-0.5 text-[10px] ${
                      deliveryType === "standard" ? "text-white/60" : "text-zinc-400"
                    }`}
                  >
                    {t("standardMailDesc")}
                  </div>
                </div>
              </div>
              <div
                className={`text-[14px] font-bold ${
                  deliveryType === "standard" ? "text-emerald-400" : "text-zinc-900 dark:text-zinc-100"
                }`}
              >
                {standardPrice}
              </div>
            </ActionCard>
          </div>
        </section>

        {/* Signature */}
        <section className="space-y-5">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
              {t("signatureLabel")}
            </h3>
            <div className="flex items-center gap-1 rounded-full bg-zinc-100 p-1 dark:bg-zinc-800">
              <button
                type="button"
                onClick={() => setSignatureMode("typed")}
                className={`rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-widest transition-all ${
                  signatureMode === "typed"
                    ? "bg-amber-100 text-amber-900 shadow-sm ring-1 ring-amber-200 dark:bg-amber-400/20 dark:text-amber-200 dark:ring-amber-300/30"
                    : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                }`}
              >
                {t("signatureTyped")}
              </button>
              <button
                type="button"
                onClick={() => setSignatureMode("image")}
                className={`rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-widest transition-all ${
                  signatureMode === "image"
                    ? "bg-amber-100 text-amber-900 shadow-sm ring-1 ring-amber-200 dark:bg-amber-400/20 dark:text-amber-200 dark:ring-amber-300/30"
                    : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                }`}
              >
                {t("signatureImage")}
              </button>
            </div>
          </div>

          {signatureMode === "typed" ? (
            <Card isCompactViewport={isCompactViewport} density="thin">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                {t("signatureTypedPreview")}
              </div>
              <p
                className="text-xl italic text-zinc-700 dark:text-zinc-200"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {senderName || t("signatureFallbackName")}
              </p>
            </Card>
          ) : (
            <div>
              {files.signature ? (
                <Card
                  isCompactViewport={isCompactViewport}
                  density="thin"
                  className="flex items-center gap-3"
                >
                  <img
                    src={getApiUrl(`/v1/drafts/files/${files.signature.id}`)}
                    alt={t("signatureImageAlt")}
                    className="h-12 max-w-[200px] object-contain"
                  />
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={() => void files.removeFile(files.signature!.id)}
                    className="text-[11px] font-bold text-zinc-400 hover:text-red-500"
                  >
                    {t("remove")}
                  </button>
                </Card>
              ) : (
                <DashedCard
                  onClick={() => sigInputRef.current?.click()}
                  disabled={files.isUploading}
                  isCompactViewport={isCompactViewport}
                  className="flex-col gap-2"
                >
                  <Plus className="h-5 w-5 text-zinc-400" />
                  <span className="text-[12px] font-bold text-zinc-500">
                    {t("signatureUploadPrompt")}
                  </span>
                  <span className="text-[10px] text-zinc-400">{t("signatureUploadHint")}</span>
                </DashedCard>
              )}
              <input
                ref={sigInputRef}
                type="file"
                accept=".png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void files.uploadFile(file, "signature");
                  e.target.value = "";
                }}
              />
            </div>
          )}
        </section>

        {/* Attachments */}
        <section className="space-y-5">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
              {t("attachmentsLabel")}
            </h3>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("addAttachment")}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
                e.target.value = "";
              }}
            />
          </div>
          <p className="px-2 text-sm text-zinc-500">{t("attachmentsHint")}</p>
          <div className="grid grid-cols-2 gap-4">
            {files.attachments.map((file) => (
              <div
                key={file.id}
                className={`group relative flex min-w-0 items-center gap-3 bg-white ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10 ${
                  isCompactViewport ? "rounded-[18px] p-3" : "rounded-[20px] p-3"
                }`}
              >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                    {file.originalFilename ?? "file"}
                  </div>
                  <div className="text-[9px] font-medium uppercase text-zinc-400">
                    {formatSize(file.sizeBytes)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void files.removeFile(file.id)}
                  className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 shadow-sm group-hover:flex"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <DashedCard
              onClick={() => fileInputRef.current?.click()}
              isCompactViewport={isCompactViewport}
              className="cursor-pointer p-3 text-zinc-400 hover:text-zinc-500"
            >
              <Plus className="h-4 w-4" />
            </DashedCard>
          </div>
        </section>
      </div>
    </DraftShell>
  );
}
