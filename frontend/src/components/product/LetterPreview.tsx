"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, Pencil, X } from "lucide-react";
import type { DraftLetter } from "@swiss-mail/shared";
import {
  DRAFT_CONTENT_LIMITS,
  extractAiDocumentMetadata,
  flattenDocumentModel,
  getLetterFraming,
} from "@swiss-mail/shared";
import {
  stripLetterFramingDocument,
  stripLetterFramingText,
} from "@swiss-mail/shared/letter-framing";
import { DocumentPreview, fallbackDocument } from "./DocumentPreview";

export type ZoneKind = "sender" | "recipient" | "date" | "subject" | "salutation" | "body" | "closing";

export interface ProfileBlock {
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  department?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  postalCode: string;
  city: string;
  country: string;
}

interface LetterPreviewProps {
  draft: DraftLetter | undefined;
  senderProfile?: ProfileBlock | null | undefined;
  recipientProfile?: ProfileBlock | null | undefined;
  editingZone?: ZoneKind | null | undefined;
  onZoneClick?: ((zone: ZoneKind) => void) | undefined;
  onZoneSave?: ((zone: ZoneKind, value: string | object) => Promise<void>) | undefined;
  onZoneCancel?: (() => void) | undefined;
  variant?: "default" | "immersive" | undefined;
}

export function LetterPreview({
  draft,
  senderProfile,
  recipientProfile,
  editingZone,
  onZoneClick,
  onZoneSave,
  onZoneCancel,
  variant = "default",
}: LetterPreviewProps) {
  const t = useTranslations("draft");
  const isImmersive = variant === "immersive";

  if (!draft) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const document = stripLetterFramingDocument(
    extractAiDocumentMetadata(draft.metadata)?.document ??
      fallbackDocument(draft.body ?? ""),
    draft.locale,
  );
  const hasLetterContent = flattenDocumentModel(document).trim().length > 0;
  const { salutation, closing } = getLetterFraming(draft.locale);
  const sanitizedBody = stripLetterFramingText(draft.body ?? "", draft.locale);
  const formattedDate = new Date().toLocaleDateString(draft.locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const placeAndDate = senderProfile?.city?.trim()
    ? `${senderProfile.city.trim()}, ${formattedDate}`
    : formattedDate;

  return (
    <div
      className={`letter-preview-container mx-auto w-full ${
        isImmersive
          ? "flex h-full max-w-[980px] flex-col"
          : "max-w-[720px]"
      }`}
      data-theme="light"
    >
      <div
        className={`rounded-3xl bg-white shadow-sm ${
          isImmersive
            ? "flex h-full flex-col rounded-none p-0 sm:rounded-3xl sm:p-4 lg:p-6"
            : "p-5 sm:p-6 lg:p-8"
        }`}
        style={{ outline: "1px solid rgba(0,0,0,0.05)" }}
      >
        {!isImmersive ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                {t("preview")}
              </p>
              <p className="mt-1 text-sm text-zinc-500">{t("previewSheetHint")}</p>
            </div>
            <span className="rounded-lg bg-zinc-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
              A4
            </span>
          </div>
        ) : null}
        <div
          className={`rounded-2xl bg-[linear-gradient(180deg,#ffffff_0%,#fffdfa_100%)] shadow-[inset_0_1px_2px_rgba(120,53,15,0.04)] ${
            isImmersive
              ? "flex min-h-0 flex-1 rounded-none p-4 sm:rounded-2xl sm:p-6 lg:p-8"
              : "p-5 sm:p-6"
          }`}
        >
          <div
            className={`space-y-8 text-sm text-zinc-700 ${
              isImmersive
                ? "flex min-h-[640px] flex-1 flex-col"
                : "min-h-[560px]"
            }`}
          >
            <ZoneBlock zone="sender" onZoneClick={onZoneClick}>
              <div className="max-w-[220px] text-xs">
                {senderProfile ? (
                  <div className="space-y-0.5 text-zinc-700">
                    {(senderProfile.firstName || senderProfile.lastName) && (
                      <div className="font-medium">
                        {[senderProfile.firstName, senderProfile.lastName].filter(Boolean).join(" ")}
                      </div>
                    )}
                    {senderProfile.company && <div>{senderProfile.company}</div>}
                    <div>{senderProfile.addressLine1}</div>
                    {senderProfile.addressLine2 && <div>{senderProfile.addressLine2}</div>}
                    <div>{senderProfile.postalCode} {senderProfile.city}</div>
                  </div>
                ) : draft.senderProfileId ? (
                  <span className="text-zinc-600">&#x2709; {t("senderLabel")}</span>
                ) : (
                  <span className="italic text-zinc-400">{t("senderPlaceholder")}</span>
                )}
              </div>
            </ZoneBlock>

            <ZoneBlock zone="recipient" onZoneClick={onZoneClick}>
              <div className="mt-6 ml-auto max-w-[260px] text-right">
                {recipientProfile ? (
                  <div className="space-y-0.5 text-sm text-zinc-700">
                    {recipientProfile.company && (
                      <div className="font-medium">{recipientProfile.company}</div>
                    )}
                    {recipientProfile.department && <div>{recipientProfile.department}</div>}
                    {(recipientProfile.firstName || recipientProfile.lastName) && (
                      <div>
                        {[recipientProfile.firstName, recipientProfile.lastName].filter(Boolean).join(" ")}
                      </div>
                    )}
                    <div>{recipientProfile.addressLine1}</div>
                    {recipientProfile.addressLine2 && <div>{recipientProfile.addressLine2}</div>}
                    <div>{recipientProfile.postalCode} {recipientProfile.city}</div>
                  </div>
                ) : draft.recipientProfileId ? (
                  <span className="text-zinc-600">{t("recipientLabel")}</span>
                ) : (
                  <span className="italic text-zinc-400">{t("recipientPlaceholder")}</span>
                )}
              </div>
            </ZoneBlock>

            <div className="text-right text-xs text-zinc-400">
              {placeAndDate}
            </div>

            {editingZone === "subject" ? (
              <InlineTextEditor
                zone="subject"
                initialValue={draft.subject ?? ""}
                onSave={onZoneSave}
                onCancel={onZoneCancel}
              />
            ) : (
              <ZoneBlock zone="subject" isEditing={false} onZoneClick={onZoneClick}>
                <div className="font-semibold text-zinc-900">
                  {draft.subject ?? (
                    <span className="font-normal italic text-zinc-400">
                      {t("subjectPlaceholder")}
                    </span>
                  )}
                </div>
              </ZoneBlock>
            )}

            {hasLetterContent ? (
              <div className="text-sm leading-relaxed text-zinc-700">{salutation}</div>
            ) : null}

            {editingZone === "body" ? (
              <InlineTextEditor
                zone="body"
                initialValue={sanitizedBody}
                onSave={onZoneSave}
                onCancel={onZoneCancel}
                multiline
              />
            ) : (
              <ZoneBlock zone="body" isEditing={false} onZoneClick={onZoneClick}>
                <div className="space-y-4 leading-relaxed">
                  {hasLetterContent ? (
                    <DocumentPreview document={document} />
                  ) : (
                    <span className="italic text-zinc-400">{t("bodyPlaceholder")}</span>
                  )}
                </div>
              </ZoneBlock>
            )}

            {hasLetterContent ? (
              <div className="pt-2 text-sm leading-relaxed text-zinc-700">{closing}</div>
            ) : null}

            {draft.enclosureNote && (
              <div className="border-t border-zinc-100 pt-4 text-xs text-zinc-500">
                {draft.enclosureNote}
              </div>
            )}

            {draft.signatureMode && (
              <div className="pt-6 text-zinc-500">
                <span className="italic">{t("signatureLabel")}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline text editor — replaces zone content when editing
// ---------------------------------------------------------------------------

function InlineTextEditor({
  zone,
  initialValue,
  onSave,
  onCancel,
  multiline = false,
}: {
  zone: ZoneKind;
  initialValue: string;
  onSave?: ((zone: ZoneKind, value: string | object) => Promise<void>) | undefined;
  onCancel?: (() => void) | undefined;
  multiline?: boolean;
}) {
  const t = useTranslations("zoneEditor");
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  const maxLength =
    zone === "body"
      ? DRAFT_CONTENT_LIMITS.bodyChars
      : zone === "subject"
        ? DRAFT_CONTENT_LIMITS.subjectChars
        : 300;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onCancel?.();
    } else if (e.key === "Enter" && !e.shiftKey && !multiline) {
      e.preventDefault();
      void handleSave();
    }
  }

  async function handleSave() {
    if (!value.trim()) return;
    setIsSaving(true);
    try {
      await onSave?.(zone, value);
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-amber-300 bg-amber-50/30 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200/60 transition";

  return (
    <div className="-mx-2 rounded-xl bg-amber-50/40 px-3 py-3 ring-1 ring-amber-200/80">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-amber-700">{t(`zone.${zone}`)}</span>
        {zone === "body" && (
          <span className="text-xs text-zinc-400">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          maxLength={maxLength}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={8}
          className={`${inputClass} resize-none px-3 py-2`}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={value}
          maxLength={maxLength}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`${inputClass} px-3 py-2`}
        />
      )}
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100"
        >
          <X className="h-3 w-3" />
          {t("action.cancel")}
        </button>
        <button
          type="button"
          disabled={isSaving || !value.trim()}
          onClick={() => void handleSave()}
          className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-600 disabled:opacity-50"
        >
          <Check className="h-3 w-3" />
          {isSaving ? t("action.saving") : t("action.save")}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Zone block — clickable wrapper with hover edit affordance
// ---------------------------------------------------------------------------

function ZoneBlock({
  zone,
  isEditing,
  onZoneClick,
  children,
}: {
  zone: ZoneKind;
  isEditing?: boolean;
  onZoneClick?: ((zone: ZoneKind) => void) | undefined;
  children: ReactNode;
}) {
  if (!onZoneClick || isEditing) {
    return <div className="-mx-2 w-[calc(100%+1rem)] px-2 py-1">{children}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onZoneClick(zone)}
      className="group relative -mx-2 w-[calc(100%+1rem)] cursor-pointer rounded-xl px-2 py-1 text-left transition-all duration-150 hover:bg-zinc-50"
    >
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
        <Pencil className="h-3.5 w-3.5 text-zinc-400" />
      </span>
      {children}
    </button>
  );
}
