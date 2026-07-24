import type { SnapshotData } from "@episto/shared";
import { renderBrandMarkSvg } from "../../shared/brand.js";
import {
  type ConfirmationCopy,
  deliveryFormForAttestation,
  getCopy,
  pageWord,
} from "./confirmation-strings.js";
import { CONFIRMATION_DOCUMENT_CSS } from "./confirmation-document.css.js";

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
  return [
    address.company,
    "department" in address ? address.department : null,
    [address.firstName, address.lastName].filter(Boolean).join(" ") || null,
    address.addressLine1,
    address.addressLine2,
    `${address.postalCode} ${address.city}`,
    address.country && address.country !== "CH" ? address.country : null,
  ]
    .filter((line): line is string => Boolean(line && line.trim().length > 0))
    .map((line) => escapeHtml(line))
    .join("<br>");
}

function formatList(items: string[], fallback: string): string {
  if (items.length === 0) {
    return `<span class="value-muted">${escapeHtml(fallback)}</span>`;
  }

  return items.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("");
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
  return renderBrandMarkSvg(56);
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
  const showReferenceCard = showTracking || showProviderReference;
  const primaryReferenceLabel = input.trackingNumber
    ? copy.trackingNumber
    : copy.providerReference;
  const primaryReferenceValue =
    input.trackingNumber ?? input.providerReference ?? copy.notAvailable;
  const providerReferenceValue = input.providerReference ?? copy.notAvailable;
  const providerReferenceMeta =
    showTracking && showProviderReference
      ? `<p class="reference-meta"><span class="reference-meta-label">${escapeHtml(
          copy.providerReference,
        )}</span>${escapeHtml(providerReferenceValue)}</p>`
      : "";
  const subjectValue = input.subject
    ? escapeHtml(input.subject)
    : `<span class="value-muted">${escapeHtml(copy.notAvailable)}</span>`;
  const attachmentTags =
    input.attachmentNames.length > 0
      ? formatList(input.attachmentNames, copy.notAvailable)
      : "";
  const metaItems: string[] = [];

  if (input.subject) {
    metaItems.push(`<div>
          <div class="label">${escapeHtml(copy.subject)}</div>
          <div class="meta-value">${subjectValue}</div>
        </div>`);
  }

  if (input.attachmentNames.length > 0) {
    metaItems.push(`<div>
          <div class="label">${escapeHtml(copy.attachments)}</div>
          <div class="tag-list">${attachmentTags}</div>
        </div>`);
  }

  // ---- Court-grade justificatif sections (attestation / summary / hash) ----
  const letterPageCount = input.letterPageCount ?? input.pageCount;
  const enclosures = input.enclosures ?? [];
  const totalContentPages =
    input.totalContentPages ??
    letterPageCount + enclosures.reduce((sum, e) => sum + e.pageCount, 0);

  const issuerLine = input.issuer
    ? `<p class="issuer-line">${escapeHtml(
        copy.issuerLine({
          name: input.issuer.name,
          address: [
            input.issuer.addressLine1,
            input.issuer.addressLine2,
            input.issuer.country,
          ]
            .filter(Boolean)
            .join(", "),
          uidVat: input.issuer.uidVat,
        }),
      )} ${escapeHtml(input.issuer.supportEmail)}</p>`
    : "";

  const attestationSection = `<section class="section-card">
      <div class="label">${escapeHtml(copy.attestationHeading)}</div>
      <p class="attestation-text">${escapeHtml(
        copy.attestation(depositedAt, deliveryFormForAttestation(deliveryTypeLabel)),
      )}</p>
      ${issuerLine}
    </section>`;

  const enclosureSummary =
    enclosures.length > 0
      ? enclosures
          .map(
            (e) =>
              `${escapeHtml(e.name)} (${e.pageCount} ${escapeHtml(
                pageWord(copy, e.pageCount),
              )})`,
          )
          .join(", ")
      : escapeHtml(copy.noEnclosures);

  const contentSummarySection = `<section class="section-card">
      <div class="label">${escapeHtml(copy.contentSummaryHeading)}</div>
      <p class="summary-text"><strong>${escapeHtml(copy.letterLabel)}:</strong> ${letterPageCount} ${escapeHtml(
        pageWord(copy, letterPageCount),
      )}. <strong>${escapeHtml(copy.attachments)}:</strong> ${enclosureSummary} <strong>${escapeHtml(
        copy.totalContentLabel,
      )}:</strong> ${totalContentPages} ${escapeHtml(pageWord(copy, totalContentPages))}.</p>
    </section>`;

  const enclosureHashes = input.enclosureHashes ?? [];
  const enclosureHashRows =
    enclosureHashes.length > 0
      ? `<div class="enclosure-hashes">
          <div class="label">${escapeHtml(copy.enclosureHashesLabel)}</div>
          ${enclosureHashes
            .map(
              (e) =>
                `<p class="hash-row"><span class="hash-name">${escapeHtml(
                  e.name,
                )}</span><span class="hash-value">${escapeHtml(groupHash(e.sha256))}</span></p>`,
            )
            .join("")}
        </div>`
      : "";

  const fingerprintSection = input.letterSha256
    ? `<section class="section-card fingerprint-card">
      <div class="label">${escapeHtml(copy.fingerprintHeading)}</div>
      <p class="hash-value hash-value-primary">${escapeHtml(groupHash(input.letterSha256))}</p>
      <p class="hash-note">${escapeHtml(copy.fingerprintNote)}</p>
      ${enclosureHashRows}
    </section>`
    : "";

  return `<!DOCTYPE html>
<html lang="${escapeHtml(input.locale)}">
<head>
  <meta charset="UTF-8">
  <style>
    ${CONFIRMATION_DOCUMENT_CSS}
  </style>
</head>
<body>
  <main class="confirmation-page">
    <section class="header-card">
      <div class="brand">
        ${renderBrandMark()}
        <div class="brand-copy">
          <small>${escapeHtml(copy.eyebrow)}</small>
          <h1>${escapeHtml(copy.title)}</h1>
        </div>
      </div>
      <div class="header-meta">
        <div class="header-meta-label">${escapeHtml(copy.issuedOn)}</div>
        <div class="header-meta-value">${escapeHtml(issuedAt)}</div>
      </div>
    </section>

    ${
      showReferenceCard
        ? `<section class="reference-card">
        <div class="label">${escapeHtml(primaryReferenceLabel)}</div>
        <div class="reference-value${showTracking ? " tracking-value" : ""}">${escapeHtml(primaryReferenceValue)}</div>
        <p class="reference-meta reference-deposit"><span class="reference-meta-label">${escapeHtml(
          copy.depositedOn,
        )}</span>${escapeHtml(depositedAt)}</p>
        ${providerReferenceMeta}
      </section>`
        : ""
    }

    <section class="fact-card">
      <div class="facts-grid">
        <div>
          <div class="label">${escapeHtml(copy.orderRef)}</div>
          <div class="fact-value">${escapeHtml(input.orderRef)}</div>
        </div>
        <div>
          <div class="label">${escapeHtml(copy.dispatchStatus)}</div>
          <div class="fact-value">${escapeHtml(dispatchStatusLabel)}</div>
        </div>
        <div>
          <div class="label">${escapeHtml(copy.deliveryType)}</div>
          <div class="fact-value">${escapeHtml(deliveryTypeLabel)}</div>
        </div>
        ${
          showReferenceCard
            ? ""
            : `<div>
          <div class="label">${escapeHtml(copy.depositedOn)}</div>
          <div class="fact-value">${escapeHtml(depositedAt)}</div>
        </div>`
        }
      </div>
    </section>

    <section class="parties-grid">
      <article class="party-card">
        <div class="label">${escapeHtml(copy.sender)}</div>
        <div class="party-value">${formatAddress(input.sender)}</div>
      </article>
      <article class="party-card">
        <div class="label">${escapeHtml(copy.recipient)}</div>
        <div class="party-value">${formatAddress(input.recipient)}</div>
      </article>
    </section>

    ${
      metaItems.length > 0
        ? `<section class="meta-card">
      <div class="meta-grid">${metaItems.join("")}</div>
    </section>`
        : ""
    }

    ${attestationSection}

    ${contentSummarySection}

    ${fingerprintSection}

    <section class="footer-note">
      <p>${escapeHtml(controlNote)}</p>
      <p>${escapeHtml(copy.noteBundle)}</p>
    </section>
  </main>
  ${letterHtml ? `<section class="page-break">${letterHtml}</section>` : ""}
</body>
</html>`;
}
