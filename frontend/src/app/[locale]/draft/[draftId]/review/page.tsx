"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { useDraft, useUpdateDraft } from "../../../../../hooks/use-api.js";
import { Link } from "../../../../../i18n/navigation.js";
import {
  Check,
  Circle,
  ChevronRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import type { DraftLetter } from "@swiss-mail/shared";
import { DeliveryType } from "@swiss-mail/shared";

// ---------------------------------------------------------------------------
// Checklist Item
// ---------------------------------------------------------------------------

function ChecklistItem({
  label,
  complete,
}: {
  label: string;
  complete: boolean;
}) {
  return (
    <li className="flex items-center gap-3 py-2">
      {complete ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/10 text-success">
          <Check className="h-3.5 w-3.5" />
        </span>
      ) : (
        <Circle className="h-5 w-5 text-gray-300" />
      )}
      <span className={complete ? "text-gray-700" : "text-gray-400"}>
        {label}
      </span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Delivery Type Selector
// ---------------------------------------------------------------------------

function DeliverySelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (type: string) => void;
}) {
  const t = useTranslations("review");

  const options = [
    { key: DeliveryType.standard, label: t("deliveryStandard"), price: "2.90" },
    { key: DeliveryType.registered, label: t("deliveryRegistered"), price: "7.90" },
  ] as const;

  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm transition ${
            value === opt.key
              ? "border-navy bg-navy/5 text-navy"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          <span className="flex items-center gap-2">
            <span
              className={`inline-flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                value === opt.key
                  ? "border-navy"
                  : "border-gray-300"
              }`}
            >
              {value === opt.key && (
                <span className="h-2 w-2 rounded-full bg-navy" />
              )}
            </span>
            {opt.label}
          </span>
          <span className="font-medium">CHF {opt.price}</span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Letter Preview (read-only)
// ---------------------------------------------------------------------------

function ReadOnlyLetterPreview({ draft }: { draft: DraftLetter }) {
  const td = useTranslations("draft");
  return (
    <div className="mx-auto w-full max-w-[595px]">
      <div className="rounded-lg border border-gray-200 bg-white p-10 shadow-sm">
        <div className="min-h-[500px] space-y-6 text-sm text-gray-700">
          <div className="text-xs text-gray-400">
            {draft.senderProfileId ? (
              <span className="text-gray-600">&#x2709; {td("senderLabel")}</span>
            ) : (
              <span className="italic">{td("senderPlaceholder")}</span>
            )}
          </div>

          <div className="text-gray-400">
            {draft.recipientProfileId ? (
              <span className="text-gray-600">{td("recipientLabel")}</span>
            ) : (
              <span className="italic">{td("recipientPlaceholder")}</span>
            )}
          </div>

          <div className="text-right text-xs text-gray-400">
            {new Date().toLocaleDateString(draft.locale, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>

          <div className="font-semibold text-gray-900">
            {draft.subject ?? (
              <span className="font-normal italic text-gray-400">—</span>
            )}
          </div>

          <div className="whitespace-pre-wrap leading-relaxed">
            {draft.body ?? (
              <span className="italic text-gray-400">—</span>
            )}
          </div>

          {draft.enclosureNote && (
            <div className="border-t pt-4 text-xs text-gray-500">
              {draft.enclosureNote}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review Page
// ---------------------------------------------------------------------------

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

  if (draft.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
      </div>
    );
  }

  if (draft.error || !draft.data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">{tc("error")}</p>
      </div>
    );
  }

  const d = draft.data;

  const hasSender = Boolean(d.senderProfileId);
  const hasRecipient = Boolean(d.recipientProfileId);
  const hasBody = Boolean(d.body);
  const hasSubject = Boolean(d.subject);
  const allComplete = hasSender && hasRecipient && hasBody && hasSubject;

  function handleDeliveryChange(type: string) {
    updateDraft.mutate({ deliveryType: type as "standard" | "registered" });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="font-bold text-navy">
            {tc("appName")}
          </Link>
          <span className="text-sm font-medium text-navy">{t("title")}</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        {/* Subtitle */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
        </div>

        {/* Letter preview */}
        <ReadOnlyLetterPreview draft={d} />

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Completion checklist */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">
              {t("checklist")}
            </h2>
            <ul className="divide-y divide-gray-100">
              <ChecklistItem label={t("senderDetails")} complete={hasSender} />
              <ChecklistItem
                label={t("recipientDetails")}
                complete={hasRecipient}
              />
              <ChecklistItem label={t("letterBody")} complete={hasBody} />
              <ChecklistItem label={t("subjectLine")} complete={hasSubject} />
              <ChecklistItem
                label={t("signature")}
                complete={Boolean(d.signatureMode)}
              />
              <ChecklistItem label={t("attachments")} complete={true} />
            </ul>
          </div>

          {/* Delivery + pricing */}
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <DeliverySelector
                value={d.deliveryType}
                onChange={handleDeliveryChange}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-6 py-4 text-sm">
              <span className="font-medium text-gray-700">{t("total")}</span>
              <span className="text-lg font-bold text-navy">
                CHF{" "}
                {d.deliveryType === DeliveryType.registered ? "7.90" : "2.90"}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <Link
            href={`/draft/${draftId}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToEditing")}
          </Link>

          <Link
            href={`/draft/${draftId}/checkout`}
            className={`inline-flex items-center gap-2 rounded-lg px-8 py-3 text-sm font-semibold text-white transition ${
              allComplete
                ? "bg-navy hover:bg-navy-light"
                : "pointer-events-none bg-gray-300"
            }`}
          >
            {t("proceedToPayment")}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
