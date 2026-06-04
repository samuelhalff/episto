"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, Pencil, X } from "lucide-react";
import type { DraftLetter } from "@episto/shared";
import {
  DRAFT_CONTENT_LIMITS,
  LETTER_COLORS,
  LETTER_LAYOUT_MM,
  LETTER_LAYOUT_PT,
  extractAiDocumentMetadata,
  flattenDocumentModel,
  getLetterFraming,
  mmToPageCqw,
  ptToPageCqw,
} from "@episto/shared";
import {
  stripLetterFramingDocument,
  stripLetterFramingText,
} from "@episto/shared/letter-framing";
import { DocumentPreview, fallbackDocument } from "./DocumentPreview";
import { getAddressLines, getSenderDisplayName } from "../../lib/letter-content";

export type ZoneKind =
  | "sender"
  | "recipient"
  | "date"
  | "subject"
  | "salutation"
  | "body"
  | "closing";

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
  signatureMode?: "typed" | "drawn" | null | undefined;
  signatureUrl?: string | null | undefined;
  editingZone?: ZoneKind | null | undefined;
  onZoneClick?: ((zone: ZoneKind) => void) | undefined;
  onZoneSave?: ((zone: ZoneKind, value: string | object) => Promise<void>) | undefined;
  onZoneCancel?: (() => void) | undefined;
  variant?: "default" | "immersive" | undefined;
  showHeader?: boolean | undefined;
}

export function LetterPreview({
  draft,
  senderProfile,
  recipientProfile,
  signatureMode,
  signatureUrl,
  editingZone,
  onZoneClick,
  onZoneSave,
  onZoneCancel,
  variant = "default",
  showHeader = true,
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
  const resolvedSignatureMode = signatureMode ?? draft.signatureMode;
  const typedSignatureName = getSenderDisplayName(senderProfile);
  const signatureDisplayName = typedSignatureName || t("signatureFallbackName");
  const shouldShowGeneratedSignature = resolvedSignatureMode === "typed";
  const shouldShowDrawnSignature = resolvedSignatureMode === "drawn";
  const shouldShowPrintedSignatoryName = typedSignatureName.length > 0;
  const signatureNameStyle = {
    marginTop: mmToPageCqw(LETTER_LAYOUT_MM.signatureName.marginTop),
    fontSize: ptToPageCqw(LETTER_LAYOUT_PT.signatureName),
    color: LETTER_COLORS.signatureName,
  };
  const placeAndDate = senderProfile?.city?.trim()
    ? `${senderProfile.city.trim()}, ${formattedDate}`
    : formattedDate;
  const senderLines = getAddressLines(senderProfile, "sender");
  const recipientLines = getAddressLines(recipientProfile, "recipient");
  const deliveryLine = (
    draft.deliveryType === "registered" ? t("registeredMail") : t("standardMail")
  ).toUpperCase();

  return (
    <div
      className={`letter-preview-container mx-auto w-full ${
        isImmersive ? "flex h-full max-w-[980px] flex-col" : "max-w-[720px]"
      }`}
    >
      <div
        className={`rounded-2xl bg-[var(--app-surface-strong)] shadow-sm ${
          isImmersive
            ? "flex h-full flex-col rounded-none p-0 sm:rounded-3xl sm:p-4 lg:p-6"
            : "p-1 sm:p-1.5"
        }`}
        style={{ outline: "1px solid rgba(0,0,0,0.05)" }}
      >
        {!isImmersive && showHeader ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--app-border)] pb-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {t("preview")}
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {t("previewSheetHint")}
              </p>
            </div>
            <span className="rounded-lg bg-zinc-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
              A4
            </span>
          </div>
        ) : null}
        <div
          className={`rounded-xl bg-[linear-gradient(180deg,#ffffff_0%,#fffdfa_100%)] shadow-[inset_0_1px_2px_rgba(120,53,15,0.04)] dark:bg-[linear-gradient(180deg,#151c25_0%,#10161f_100%)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.03)] ${
            isImmersive
              ? "flex min-h-0 flex-1 items-start justify-center overflow-auto rounded-none p-2 sm:rounded-2xl sm:p-4 lg:p-5"
              : "aspect-[210/297] p-1 sm:p-1.5"
          }`}
        >
          <div
            className={`letter-layout-shell relative overflow-hidden bg-white ${
              isImmersive
                ? "aspect-[210/297] w-full max-w-[980px] shrink-0"
                : "h-full w-full"
            }`}
            style={{
              containerType: "inline-size",
              fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
              color: LETTER_COLORS.text,
            }}
          >
            <div
              className="sender-block"
              style={{
                position: "absolute",
                top: mmToPageCqw(LETTER_LAYOUT_MM.sender.top),
                left: mmToPageCqw(LETTER_LAYOUT_MM.sender.left),
                width: mmToPageCqw(LETTER_LAYOUT_MM.sender.width),
                fontSize: ptToPageCqw(LETTER_LAYOUT_PT.sender),
                lineHeight: 1.45,
              }}
            >
              <ZoneBlock zone="sender" onZoneClick={onZoneClick}>
                <div>
                  {senderProfile ? (
                    <div>
                      {senderLines.map((line, index) => (
                        <div key={`${line}-${index}`}>{line}</div>
                      ))}
                    </div>
                  ) : draft.senderProfileId ? (
                    <span className="text-zinc-600">&#x2709; {t("senderLabel")}</span>
                  ) : (
                    <span className="italic text-zinc-400">{t("senderPlaceholder")}</span>
                  )}
                </div>
              </ZoneBlock>
            </div>

            <div
              className="dispatch-line"
              style={{
                position: "absolute",
                top: mmToPageCqw(LETTER_LAYOUT_MM.dispatch.top),
                left: mmToPageCqw(LETTER_LAYOUT_MM.dispatch.left),
                width: mmToPageCqw(LETTER_LAYOUT_MM.dispatch.width),
                fontSize: ptToPageCqw(LETTER_LAYOUT_PT.dispatch),
                lineHeight: 1.2,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textDecoration: "underline",
                textUnderlineOffset: "0.16cqw",
              }}
            >
              {deliveryLine}
            </div>

            <div
              className="recipient-block"
              style={{
                position: "absolute",
                top: mmToPageCqw(LETTER_LAYOUT_MM.recipient.top),
                left: mmToPageCqw(LETTER_LAYOUT_MM.recipient.left),
                width: mmToPageCqw(LETTER_LAYOUT_MM.recipient.width),
                minHeight: mmToPageCqw(LETTER_LAYOUT_MM.recipient.minHeight),
                fontSize: ptToPageCqw(LETTER_LAYOUT_PT.recipient),
                lineHeight: 1.35,
              }}
            >
              <ZoneBlock zone="recipient" onZoneClick={onZoneClick}>
                <div>
                  {recipientProfile ? (
                    <div>
                      {recipientLines.map((line, index) => (
                        <div key={`${line}-${index}`}>{line}</div>
                      ))}
                    </div>
                  ) : draft.recipientProfileId ? (
                    <span className="text-zinc-600">{t("recipientLabel")}</span>
                  ) : (
                    <span className="italic text-zinc-400">
                      {t("recipientPlaceholder")}
                    </span>
                  )}
                </div>
              </ZoneBlock>
            </div>

            <div
              className="right-meta"
              style={{
                position: "absolute",
                top: mmToPageCqw(LETTER_LAYOUT_MM.rightMeta.top),
                left: mmToPageCqw(LETTER_LAYOUT_MM.rightMeta.left),
                width: mmToPageCqw(LETTER_LAYOUT_MM.rightMeta.width),
              }}
            >
              <div
                className="date-line"
                style={{
                  fontSize: ptToPageCqw(LETTER_LAYOUT_PT.date),
                  color: LETTER_COLORS.date,
                }}
              >
                {placeAndDate}
              </div>
            </div>

            <div
              className="body-flow absolute inset-0 flex flex-col"
              style={{
                paddingTop: mmToPageCqw(LETTER_LAYOUT_MM.body.paddingTop),
                paddingRight: mmToPageCqw(LETTER_LAYOUT_MM.body.paddingRight),
                paddingBottom: mmToPageCqw(LETTER_LAYOUT_MM.body.paddingBottom),
                paddingLeft: mmToPageCqw(LETTER_LAYOUT_MM.body.paddingLeft),
                fontSize: ptToPageCqw(LETTER_LAYOUT_PT.body),
                lineHeight: 1.55,
              }}
            >
              {editingZone === "subject" ? (
                <InlineTextEditor
                  zone="subject"
                  initialValue={draft.subject ?? ""}
                  onSave={onZoneSave}
                  onCancel={onZoneCancel}
                />
              ) : (
                <ZoneBlock zone="subject" isEditing={false} onZoneClick={onZoneClick}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: ptToPageCqw(LETTER_LAYOUT_PT.subject),
                      marginBottom: mmToPageCqw(LETTER_LAYOUT_MM.subject.marginBottom),
                    }}
                  >
                    {draft.subject ?? (
                      <span className="font-normal italic text-zinc-400">
                        {t("subjectPlaceholder")}
                      </span>
                    )}
                  </div>
                </ZoneBlock>
              )}

              {hasLetterContent ? (
                <div
                  style={{
                    marginBottom: mmToPageCqw(LETTER_LAYOUT_MM.salutation.marginBottom),
                  }}
                >
                  {salutation}
                </div>
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
                  <div>
                    {hasLetterContent ? (
                      <DocumentPreview document={document} variant="letter" />
                    ) : (
                      <span className="italic text-zinc-400">{t("bodyPlaceholder")}</span>
                    )}
                  </div>
                </ZoneBlock>
              )}

              {hasLetterContent ? (
                <div
                  style={{ marginTop: mmToPageCqw(LETTER_LAYOUT_MM.closing.marginTop) }}
                >
                  {closing}
                </div>
              ) : null}

              {draft.enclosureNote && (
                <div
                  className="italic"
                  style={{
                    marginTop: mmToPageCqw(LETTER_LAYOUT_MM.enclosure.marginTop),
                    paddingTop: mmToPageCqw(LETTER_LAYOUT_MM.enclosure.paddingTop),
                    fontSize: ptToPageCqw(LETTER_LAYOUT_PT.sender),
                    color: LETTER_COLORS.enclosure,
                    borderTop: `0.5px solid ${LETTER_COLORS.enclosureBorder}`,
                  }}
                >
                  {draft.enclosureNote}
                </div>
              )}

              {shouldShowGeneratedSignature ? (
                <div
                  style={{ marginTop: mmToPageCqw(LETTER_LAYOUT_MM.signature.marginTop) }}
                >
                  <p
                    className="signature-script"
                    style={{
                      fontSize: ptToPageCqw(LETTER_LAYOUT_PT.signatureScript),
                      lineHeight: 0.9,
                      transform: "rotate(-1.5deg)",
                      color: LETTER_COLORS.signatureScript,
                    }}
                  >
                    {signatureDisplayName}
                  </p>
                  <p className="signature-name" style={signatureNameStyle}>
                    {signatureDisplayName}
                  </p>
                </div>
              ) : shouldShowDrawnSignature && signatureUrl ? (
                <div
                  style={{ marginTop: mmToPageCqw(LETTER_LAYOUT_MM.signature.marginTop) }}
                >
                  <img
                    src={signatureUrl}
                    alt={t("signatureImageAlt")}
                    style={{
                      maxHeight: "4.5cqw",
                      maxWidth: "18cqw",
                      objectFit: "contain",
                    }}
                  />
                  <p className="signature-name" style={signatureNameStyle}>
                    {signatureDisplayName}
                  </p>
                </div>
              ) : shouldShowPrintedSignatoryName ? (
                <div
                  style={{ marginTop: mmToPageCqw(LETTER_LAYOUT_MM.signature.marginTop) }}
                >
                  <p className="signature-name" style={signatureNameStyle}>
                    {typedSignatureName}
                  </p>
                </div>
              ) : null}
            </div>
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
    "app-form-control w-full rounded-lg border border-amber-300 bg-amber-50/30 text-zinc-900 placeholder:text-zinc-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200/60 transition dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:ring-amber-400/25";

  return (
    <div className="-mx-2 rounded-xl bg-amber-50/40 px-3 py-3 ring-1 ring-amber-200/80 dark:bg-amber-400/10 dark:ring-amber-400/20">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
          {t(`zone.${zone}`)}
        </span>
        {zone === "body" && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
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
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
      className="group relative -mx-2 w-[calc(100%+1rem)] cursor-pointer rounded-xl px-2 py-1 text-left transition-all duration-150 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
    >
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
        <Pencil className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
      </span>
      {children}
    </button>
  );
}
