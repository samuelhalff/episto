import type { SnapshotData } from "@episto/shared";
import { renderBrandMarkSvg } from "../../shared/brand.js";
import {
  type ConfirmationCopy,
  deliveryFormForAttestation,
  getCopy,
  pageWord,
} from "./confirmation-strings.js";
import { CONFIRMATION_DOCUMENT_CSS } from "./confirmation-document.css.js";
import { EMBEDDED_FONTS_CSS } from "./fonts.css.js";

type ConfirmationLocale = SnapshotData["locale"];
type ConfirmationAddress = SnapshotData["sender"] | SnapshotData["recipient"];
type SubmissionMode = "mock" | "live" | null;

export interface ConfirmationDocumentInput {
  orderRef: string;
  locale: ConfirmationLocale;
  submittedAt: Date | null;
  dispatchState: string;
  deliveryType: SnapshotData["deliveryType"];
  providerMode?: SubmissionMode;
  providerReference?: string | null;
  trackingNumber?: string | null;
  pageCount: number;
  attachmentNames: string[];
  sender: SnapshotData["sender"];
  recipient: SnapshotData["recipient"];
  subject: string | null;
  contentSummary: string;
  letterHtml?: string;
  /** Page count of the letter only. Defaults to `pageCount` when omitted. */
  letterPageCount?: number;
  /** Per-enclosure name + page count, in dispatch order. */
  enclosures?: Array<{ name: string; pageCount: number }>;
  /** Total pages of letter + enclosures, excluding this statement page. */
  totalContentPages?: number;
  /** Hex SHA-256 fingerprint of the exact letter PDF bytes. */
  letterSha256?: string;
  /** Optional per-enclosure hex SHA-256 fingerprints. */
  enclosureHashes?: Array<{ name: string; sha256: string }>;
  /** Issuer (attester) identity, from LEGAL_ENTITY_* / SUPPORT_EMAIL env. */
  issuer?: {
    name: string;
    addressLine1: string;
    addressLine2: string;
    country: string;
    uidVat: string;
    supportEmail: string;
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Format an instant in Europe/Zurich with an explicit timezone suffix
 * ("heure suisse" / "Schweizer Zeit" / …). Never hand-rolls offsets — the
 * Intl formatter applies CET/CEST automatically for the given instant.
 */
function formatDateTime(
  locale: ConfirmationLocale,
  value: Date | null,
  fallback: string,
  timezoneSuffix: string,
): string {
  if (!value) {
    return fallback;
  }

  const formatted = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Zurich",
  }).format(value);

  return `${formatted} (${timezoneSuffix})`;
}

/**
 * Group a hex fingerprint into 8-char clusters separated by spaces
 * (e.g. `3a7bd3e2 360a3d29 …`) for easier eyeball comparison. Only the
 * rendered form changes — the stored/computed hash is untouched.
 */
export function groupHash(hash: string): string {
  return hash.replace(/(.{8})(?=.)/g, "$1 ");
}

function formatAddress(address: ConfirmationAddress): string {
  const lines = [
    address.company,
    "department" in address ? address.department : null,
    [address.firstName, address.lastName].filter(Boolean).join(" ") || null,
    address.addressLine1,
    address.addressLine2,
    `${address.postalCode} ${address.city}`,
    address.country && address.country !== "CH" ? address.country : null,
  ].filter((line): line is string => Boolean(line && line.trim().length > 0));

  // First line is the party name → rendered 600 (bold) in sans.
  return lines
    .map((line, index) =>
      index === 0
        ? `<span class="party-name">${escapeHtml(line)}</span>`
        : escapeHtml(line),
    )
    .join("<br>");
}

function resolveControlNote(
  copy: ConfirmationCopy,
  providerMode: SubmissionMode,
): string {
  if (providerMode === "live") {
    return copy.noteLive;
  }

  return copy.noteCurrent;
}

function renderBrandMark(): string {
  // ~8mm at 96dpi ≈ 30px.
  return renderBrandMarkSvg(30);
}

export function renderConfirmationDocumentHtml(input: ConfirmationDocumentInput): string {
  const copy = getCopy(input.locale);
  const dispatchStatusLabel =
    copy.dispatchStates[input.dispatchState] ?? input.dispatchState;
  const deliveryTypeLabel = copy.deliveryTypes[input.deliveryType] ?? input.deliveryType;
  const controlNote = resolveControlNote(copy, input.providerMode ?? null);
  // Two distinct instants: the deposit fact (submittedAt, evidentiary) and the
  // moment this justificatif was generated (now).
  const depositedAt = formatDateTime(
    input.locale,
    input.submittedAt,
    copy.notAvailable,
    copy.timezoneSuffix,
  );
  const issuedAt = formatDateTime(
    input.locale,
    new Date(),
    copy.notAvailable,
    copy.timezoneSuffix,
  );
  const letterHtml = input.letterHtml?.trim() ?? "";
  const showTracking = Boolean(input.trackingNumber);
  const showProviderReference = Boolean(
    input.providerMode === "live" && input.providerReference,
  );
  // Hero identifier: tracking number when available, else the provider ref.
  const heroValue = showTracking
    ? (input.trackingNumber as string)
    : showProviderReference
      ? (input.providerReference as string)
      : copy.notAvailable;

  // References fact column: the ePost delivery id (tagged so it can be matched
  // against the ePost account) + our internal order ref (mono).
  const referenceLines: string[] = [];
  if (showProviderReference) {
    referenceLines.push(
      `${escapeHtml(input.providerReference as string)} <span class="ref-tag">ePost</span>`,
    );
  }
  referenceLines.push(escapeHtml(input.orderRef));
  const referencesValue = referenceLines.join("<br>");

  const subjectValue = input.subject
    ? escapeHtml(input.subject)
    : `<span class="value-muted">${escapeHtml(copy.notAvailable)}</span>`;

  // ---- Court-grade justificatif sections (attestation / summary / hash) ----
  const letterPageCount = input.letterPageCount ?? input.pageCount;
  const enclosures = input.enclosures ?? [];
  const enclosurePageTotal = enclosures.reduce((sum, e) => sum + e.pageCount, 0);
  const totalContentPages =
    input.totalContentPages ?? letterPageCount + enclosurePageTotal;

  // Zone B: plain enclosure list — "facture.pdf (3 pages) · photo.jpg (1 page)".
  const enclosureListHtml =
    enclosures.length > 0
      ? `<span class="enclosure-list">${enclosures
          .map(
            (e) =>
              `<span class="enc-name">${escapeHtml(e.name)}</span> <span class="enc-count">(${e.pageCount} ${escapeHtml(
                pageWord(copy, e.pageCount),
              )})</span>`,
          )
          .join(`<span class="enclosure-sep"> · </span>`)}</span>`
      : `<span class="value-muted">${escapeHtml(copy.noEnclosures)}</span>`;

  // Zone B: "Lettre 2 pages + pièces jointes 4 pages = 6 pages".
  const contentBreakdown = escapeHtml(
    copy.contentBreakdown(
      `${letterPageCount} ${pageWord(copy, letterPageCount)}`,
      `${enclosurePageTotal} ${pageWord(copy, enclosurePageTotal)}`,
      `${totalContentPages} ${pageWord(copy, totalContentPages)}`,
    ),
  );

  // Zone C: issuer signature line (name 600 ink, rest muted) + basis note.
  const issuerBlock = input.issuer
    ? `<p class="issuer-line"><span class="issuer-name">${escapeHtml(
        input.issuer.name,
      )}</span>${escapeHtml(
        copy
          .issuerLine({
            name: input.issuer.name,
            address: [
              input.issuer.addressLine1,
              input.issuer.addressLine2,
              input.issuer.country,
            ]
              .filter(Boolean)
              .join(", "),
            uidVat: input.issuer.uidVat,
          })
          .replace(input.issuer.name, ""),
      )}${escapeHtml(input.issuer.supportEmail)}</p>
      <p class="issuer-basis">${escapeHtml(copy.issuerBasis)}</p>`
    : "";

  const enclosureHashes = input.enclosureHashes ?? [];
  const enclosureHashRows = enclosureHashes
    .map(
      (e) =>
        `<div class="hash-entry"><div class="hash-name">${escapeHtml(
          e.name,
        )}</div><div class="hash-value">${escapeHtml(groupHash(e.sha256))}</div></div>`,
    )
    .join("");

  const fingerprintSection = input.letterSha256
    ? `<section class="fingerprint">
      <span class="eyebrow">${escapeHtml(copy.fingerprintHeading)}</span>
      <p class="fingerprint-note">${escapeHtml(copy.fingerprintVerifyShort)}</p>
      <div class="hash-block">
        <div class="hash-entry"><div class="hash-name">${escapeHtml(
          copy.letterLabel,
        )}</div><div class="hash-value">${escapeHtml(groupHash(input.letterSha256))}</div></div>
        ${enclosureHashRows}
      </div>
    </section>`
    : "";

  return `<!DOCTYPE html>
<html lang="${escapeHtml(input.locale)}">
<head>
  <meta charset="UTF-8">
  <style>
    ${EMBEDDED_FONTS_CSS}
    ${CONFIRMATION_DOCUMENT_CSS}
  </style>
</head>
<body>
  <main class="confirmation-page">
    <header class="masthead">
      <div>
        <div class="masthead-brand">
          ${renderBrandMark()}
          <span class="masthead-wordmark">${escapeHtml(copy.eyebrow)}</span>
        </div>
        <h1 class="masthead-title">${escapeHtml(copy.title)}</h1>
      </div>
      <div class="masthead-date">${escapeHtml(copy.issuedOn)} ${escapeHtml(issuedAt)}</div>
    </header>
    <div class="anchor-rule"></div>

    <section class="zone">
      <span class="eyebrow">${escapeHtml(copy.envoiHeading)}</span>
      <div class="hero-tracking">${escapeHtml(heroValue)}</div>
      <div class="fact-row">
        <div class="fact-col">
          <span class="eyebrow">${escapeHtml(copy.depositedOn)}</span>
          <div class="fact-value">${escapeHtml(depositedAt)}</div>
        </div>
        <div class="fact-col">
          <span class="eyebrow">${escapeHtml(copy.dispatchStatus)}</span>
          <div class="fact-value">
            <span class="status-line"><span class="status-dot"></span><span class="status-label">${escapeHtml(dispatchStatusLabel)}</span></span>
          </div>
        </div>
        <div class="fact-col">
          <span class="eyebrow">${escapeHtml(copy.deliveryType)}</span>
          <div class="fact-value">${escapeHtml(deliveryTypeLabel)}</div>
        </div>
        <div class="fact-col">
          <span class="eyebrow">${escapeHtml(copy.references)}</span>
          <div class="fact-value mono">${referencesValue}</div>
        </div>
      </div>
    </section>

    <hr class="hairline" style="margin-top:18pt">

    <section class="zone">
      <div class="parties">
        <div class="party">
          <span class="eyebrow">${escapeHtml(copy.sender)}</span>
          <div class="party-value">${formatAddress(input.sender)}</div>
        </div>
        <div class="party">
          <span class="eyebrow">${escapeHtml(copy.recipient)}</span>
          <div class="party-value">${formatAddress(input.recipient)}</div>
        </div>
      </div>
      <div class="ledger-row">
        <div class="ledger-label">${escapeHtml(copy.subject)}</div>
        <div class="ledger-value">${subjectValue}</div>
      </div>
      <div class="ledger-row">
        <div class="ledger-label">${escapeHtml(copy.attachments)}</div>
        <div class="ledger-value">${enclosureListHtml}</div>
      </div>
      <div class="ledger-row">
        <div class="ledger-label">${escapeHtml(copy.totalContentLabel)}</div>
        <div class="ledger-value">${contentBreakdown}</div>
      </div>
    </section>

    <hr class="hairline" style="margin-top:18pt">

    <div class="cert-anchor"></div>
    <section class="zone" style="margin-top:14pt">
      <span class="eyebrow">${escapeHtml(copy.attestationHeading)}</span>
      <p class="attestation-text">${escapeHtml(
        copy.attestation(depositedAt, deliveryFormForAttestation(deliveryTypeLabel)),
      )}</p>
      ${issuerBlock}
    </section>

    ${fingerprintSection}

    <section class="footer">
      <hr class="hairline">
      <div class="footer-inner">
        <div class="footer-note-text">${escapeHtml(controlNote)} ${escapeHtml(copy.noteBundle)}</div>
      </div>
    </section>
  </main>
  ${letterHtml ? `<section class="page-break">${letterHtml}</section>` : ""}
</body>
</html>`;
}
