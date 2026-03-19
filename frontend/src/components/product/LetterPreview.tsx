"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import type { DraftLetter } from "@swiss-mail/shared";

/**
 * A4-like letter preview shown beside the conversation panel
 * in the workspace and as a read-only preview on the review page.
 *
 * Renders sender, recipient, date, subject, body, and signature
 * placeholders based on the current draft data.
 */
export function LetterPreview({ draft }: { draft: DraftLetter | undefined }) {
  const t = useTranslations("draft");

  if (!draft) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[595px]">
      <div className="rounded-lg border border-gray-200 bg-white p-10 shadow-sm">
        <div className="min-h-[600px] space-y-8 text-sm text-gray-700">
          {/* Sender */}
          <div className="text-xs text-gray-400">
            {draft.senderProfileId ? (
              <span className="text-gray-600">&#x2709; {t("senderLabel")}</span>
            ) : (
              <span className="italic">{t("senderPlaceholder")}</span>
            )}
          </div>

          {/* Recipient */}
          <div className="mt-6 text-gray-400">
            {draft.recipientProfileId ? (
              <span className="text-gray-600">{t("recipientLabel")}</span>
            ) : (
              <span className="italic">{t("recipientPlaceholder")}</span>
            )}
          </div>

          {/* Date */}
          <div className="text-right text-xs text-gray-400">
            {new Date().toLocaleDateString(draft.locale, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>

          {/* Subject */}
          <div className="font-semibold text-gray-900">
            {draft.subject ?? (
              <span className="font-normal italic text-gray-400">
                {t("subjectPlaceholder")}
              </span>
            )}
          </div>

          {/* Body */}
          <div className="whitespace-pre-wrap leading-relaxed">
            {draft.body ?? (
              <span className="italic text-gray-400">
                {t("bodyPlaceholder")}
              </span>
            )}
          </div>

          {/* Enclosure note */}
          {draft.enclosureNote && (
            <div className="border-t pt-4 text-xs text-gray-500">
              {draft.enclosureNote}
            </div>
          )}

          {/* Signature */}
          {draft.signatureMode && (
            <div className="pt-6 text-gray-500">
              <span className="italic">{t("signatureLabel")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
