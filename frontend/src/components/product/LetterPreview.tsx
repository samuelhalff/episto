"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
  signatureMode?: "typed" | "image" | null | undefined;
  signatureUrl?: string | null | undefined;
  editingZone?: ZoneKind | null | undefined;
  onZoneClick?: ((zone: ZoneKind) => void) | undefined;
  onZoneSave?: ((zone: ZoneKind, value: string | object) => Promise<void>) | undefined;
  onZoneCancel?: (() => void) | undefined;
  variant?: "default" | "immersive" | undefined;
  showHeader?: boolean | undefined;
}

const LETTER_PAGE_WIDTH_MM = 210;

/**
 * Convert mm to a CSS percentage relative to the A4 page width (210 mm).
 * In a container with aspect-[210/297], this works for BOTH horizontal and
 * vertical spacing because CSS resolves padding/margin percentages against
 * the containing block width.
 */
function mmPct(value: number): string {
  return `${(value / LETTER_PAGE_WIDTH_MM) * 100}%`;
}

export function LetterPreview({
  draft,
  senderProfile,
  recipientProfile,
  signatureMode,
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
  const shouldShowGeneratedSignature = Boolean(resolvedSignatureMode);
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
        className={`rounded-3xl bg-[var(--app-surface-strong)] shadow-sm ${
          isImmersive
            ? "flex h-full flex-col rounded-none p-0 sm:rounded-3xl sm:p-4 lg:p-6"
            : "p-4 sm:p-5 lg:p-6"
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
          className={`rounded-2xl bg-[linear-gradient(180deg,#ffffff_0%,#fffdfa_100%)] shadow-[inset_0_1px_2px_rgba(120,53,15,0.04)] dark:bg-[linear-gradient(180deg,#151c25_0%,#10161f_100%)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.03)] ${
            isImmersive
              ? "flex min-h-0 flex-1 rounded-none p-2 sm:rounded-2xl sm:p-4 lg:p-5"
              : "aspect-[210/297] p-1.5 sm:p-2.5"
          }`}
        >
          <div
            className={`letter-layout-shell w-full text-zinc-700 ${
              isImmersive ? "flex min-h-[640px] flex-1 flex-col" : "flex min-h-[400px] flex-col"
            }`}
          >
            {/*
             * Header grid — 5 columns with margins built in so that
             * column percentages (via mmPct) resolve against the full
             * container width, matching A4 proportions exactly.
             */}
            <div
              className="letter-header grid items-start"
              style={{
                gridTemplateColumns: `${mmPct(14)} ${mmPct(80)} 1fr ${mmPct(70)} ${mmPct(14)}`,
                paddingTop: mmPct(12),
              }}
            >
              {/* Col 1: left margin (empty) */}
              <div />

              {/* Col 2: sender */}
              <div className="sender-block">
                <ZoneBlock zone="sender" onZoneClick={onZoneClick}>
                  <div className="text-[0.6rem] leading-[1.5] sm:text-[0.65rem]">
                    {senderProfile ? (
                      <div className="text-zinc-700 dark:text-zinc-200">
                        {senderLines.map((line, index) => (
                          <div
                            key={`${line}-${index}`}
                            className={index === 0 ? "font-semibold" : "font-medium"}
                          >
                            {line}
                          </div>
                        ))}
                      </div>
                    ) : draft.senderProfileId ? (
                      <span className="text-zinc-600 dark:text-zinc-300">
                        &#x2709; {t("senderLabel")}
                      </span>
                    ) : (
                      <span className="italic text-zinc-400 dark:text-zinc-500">
                        {t("senderPlaceholder")}
                      </span>
                    )}
                  </div>
                </ZoneBlock>
              </div>

              {/* Col 3: gap */}
              <div />

              {/* Col 4: dispatch → recipient (flow stack) */}
              <div
                className="recipient-col flex flex-col"
                style={{ paddingTop: mmPct(14) }}
              >
                <div className="dispatch-line">
                  <div className="border-b border-current pb-0.5 text-[0.55rem] font-bold tracking-[0.1em] text-zinc-700 dark:text-zinc-200 sm:text-[0.58rem]">
                    {deliveryLine}
                  </div>
                </div>
                <div
                  className="recipient-block"
                  style={{ marginTop: mmPct(3), minHeight: mmPct(18) }}
                >
                  <ZoneBlock zone="recipient" onZoneClick={onZoneClick}>
                    <div className="text-[0.65rem] leading-[1.4] text-left sm:text-[0.72rem]">
                      {recipientProfile ? (
                        <div className="space-y-0.5 text-zinc-700 dark:text-zinc-200">
                          {recipientLines.map((line, index) => (
                            <div
                              key={`${line}-${index}`}
                              className={index === 0 ? "font-medium" : undefined}
                            >
                              {line}
                            </div>
                          ))}
                        </div>
                      ) : draft.recipientProfileId ? (
                        <span className="text-zinc-600 dark:text-zinc-300">
                          {t("recipientLabel")}
                        </span>
                      ) : (
                        <span className="italic text-zinc-400 dark:text-zinc-500">
                          {t("recipientPlaceholder")}
                        </span>
                      )}
                    </div>
                  </ZoneBlock>
                </div>
              </div>

              {/* Col 5: right margin (empty) */}
              <div />
            </div>

            {/* Date: right-aligned, flows below header */}
            <div
              className="right-meta"
              style={{
                marginTop: mmPct(6),
                paddingLeft: mmPct(14),
                paddingRight: mmPct(14),
              }}
            >
              <div className="date-line text-right text-[0.6rem] text-zinc-500 dark:text-zinc-400 sm:text-[0.65rem]">
                {placeAndDate}
              </div>
            </div>

            {/* Body: flows naturally below date */}
            <div
              className="body-flow flex h-full flex-col"
              style={{
                marginTop: mmPct(6),
                paddingRight: mmPct(14),
                paddingBottom: mmPct(12),
                paddingLeft: mmPct(14),
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
                  <div className="text-[0.72rem] font-semibold text-zinc-900 dark:text-zinc-50 sm:text-[0.8rem]">
                    {draft.subject ?? (
                      <span className="font-normal italic text-zinc-400 dark:text-zinc-500">
                        {t("subjectPlaceholder")}
                      </span>
                    )}
                  </div>
                </ZoneBlock>
              )}

              {hasLetterContent ? (
                <div className="mt-4 text-[0.68rem] leading-relaxed text-zinc-700 dark:text-zinc-200 sm:text-[0.75rem]">
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
                  <div className="mt-4 space-y-3 text-[0.68rem] leading-relaxed sm:text-[0.75rem]">
                    {hasLetterContent ? (
                      <DocumentPreview document={document} />
                    ) : (
                      <span className="italic text-zinc-400 dark:text-zinc-500">
                        {t("bodyPlaceholder")}
                      </span>
                    )}
                  </div>
                </ZoneBlock>
              )}

              {hasLetterContent ? (
                <div className="pt-4 text-[0.68rem] leading-relaxed text-zinc-700 dark:text-zinc-200 sm:text-[0.75rem]">
                  {closing}
                </div>
              ) : null}

              {draft.enclosureNote && (
                <div className="mt-8 border-t border-[var(--app-border)] pt-3 text-[0.6rem] italic text-zinc-500 dark:text-zinc-400">
                  {draft.enclosureNote}
                </div>
              )}

              {shouldShowGeneratedSignature ? (
                <div className="pt-6">
                  <p className="signature-script text-zinc-700 dark:text-zinc-100">
                    {signatureDisplayName}
                  </p>
                  <p className="signature-name mt-2 text-[0.68rem] text-zinc-500 dark:text-zinc-400 sm:text-[0.75rem]">
                    {signatureDisplayName}
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
