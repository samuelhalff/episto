/**
 * Email template renderers — professional HTML email templates for all
 * transactional emails sent by Episto.
 *
 * Each template produces { subject, html, text } using the shared email layout.
 * Templates are pure functions — all data arrives via the `data` parameter.
 */

import { BRAND_NAME } from "../shared/brand.js";

import {
  wrapEmailHtml,
  escapeHtml,
  primaryButton,
  secondaryLink,
  sectionDivider,
  detailRow,
  detailRowMono,
  detailTable,
  heading,
  paragraph,
  mutedText,
  formatCHF,
  swissPostTrackingUrl,
  type EmailLayoutConfig,
} from "./email-layout.js";

import {
  resolveLocale,
  DISPATCH_SUBMITTED_STRINGS,
  DISPATCH_ACCEPTED_STRINGS,
  RESUME_LINK_STRINGS,
  REFUND_CONFIRMED_STRINGS,
  PAYMENT_RECEIPT_STRINGS,
} from "./email-strings.js";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

type DeliveryType = "standard" | "registered";

function readString(data: Record<string, unknown>, key: string, fallback = ""): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

function readInteger(
  data: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const value = data[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return fallback;
}

function layoutConfig(locale: string, data: Record<string, unknown>): EmailLayoutConfig {
  return {
    brandName: readString(data, "brandName", BRAND_NAME),
    locale: resolveLocale(locale),
    appPublicUrl: readString(data, "appPublicUrl"),
    legalEntityName: readString(data, "legalEntityName"),
    legalEntityAddress: readString(data, "legalEntityAddress"),
    legalEntityCountry: readString(data, "legalEntityCountry"),
    legalEntityUidVat: readString(data, "legalEntityUidVat"),
    supportEmail: readString(data, "supportEmail"),
  };
}

function replaceRetentionDays(template: string, days: number): string {
  return template.replace("{days}", String(days));
}

function readDeliveryType(data: Record<string, unknown>): DeliveryType | null {
  const value = data.deliveryType;
  return value === "standard" || value === "registered" ? value : null;
}

function formatDeliveryTypeLabel(
  locale: string,
  deliveryType: DeliveryType | null,
): string {
  if (!deliveryType) {
    return "";
  }

  switch (resolveLocale(locale)) {
    case "de-CH":
      return deliveryType === "registered" ? "Einschreiben" : "A-Post";
    case "fr-CH":
      return deliveryType === "registered" ? "Courrier recommandé" : "Courrier standard";
    case "it-CH":
      return deliveryType === "registered" ? "Raccomandata" : "Posta standard";
    case "en-CH":
    default:
      return deliveryType === "registered" ? "Registered mail" : "Standard mail";
  }
}

// ---------------------------------------------------------------------------
// Template: dispatch-submitted
// ---------------------------------------------------------------------------

function renderDispatchSubmitted(
  locale: string,
  data: Record<string, unknown>,
): RenderedEmail {
  const s = DISPATCH_SUBMITTED_STRINGS[resolveLocale(locale)];
  const config = layoutConfig(locale, data);
  const orderRef = readString(data, "orderRef");
  const deliveryType = formatDeliveryTypeLabel(locale, readDeliveryType(data));
  const senderName = readString(data, "senderName");
  const recipientName = readString(data, "recipientName");
  const downloadUrl = readString(data, "downloadUrl");
  const statementRetentionDays = readInteger(data, "statementRetentionDays", 10);
  const supportEmail = readString(data, "supportEmail");

  const rows = [
    detailRowMono(s.orderLabel, orderRef),
    deliveryType ? detailRow(s.deliveryTypeLabel, deliveryType) : "",
    senderName ? detailRow(s.senderLabel, senderName) : "",
    recipientName ? detailRow(s.recipientLabel, recipientName) : "",
  ]
    .filter(Boolean)
    .join("\n");

  const bodyParts = [
    heading(s.heading),
    paragraph(escapeHtml(s.body)),
    detailTable(rows),
  ];

  if (downloadUrl) {
    bodyParts.push(sectionDivider());
    bodyParts.push(
      `<p style="margin:0 0 8px;">${secondaryLink(downloadUrl, s.downloadLabel)}</p>`,
    );
    bodyParts.push(
      mutedText(
        escapeHtml(replaceRetentionDays(s.retentionNotice, statementRetentionDays)),
      ),
    );
  }

  if (s.followUp) {
    bodyParts.push(mutedText(escapeHtml(s.followUp)));
  }

  if (supportEmail) {
    bodyParts.push(sectionDivider());
    bodyParts.push(
      mutedText(
        `${escapeHtml(s.supportLine)} <a href="mailto:${escapeHtml(supportEmail)}" style="color:#161616;text-decoration:underline;">${escapeHtml(supportEmail)}</a>`,
      ),
    );
  }

  return {
    subject: s.subject,
    text: [
      s.body,
      `${s.orderLabel}: ${orderRef}`,
      deliveryType ? `${s.deliveryTypeLabel}: ${deliveryType}` : null,
      senderName ? `${s.senderLabel}: ${senderName}` : null,
      recipientName ? `${s.recipientLabel}: ${recipientName}` : null,
      "",
      downloadUrl ? `${s.downloadLabel}: ${downloadUrl}` : null,
      downloadUrl
        ? replaceRetentionDays(s.retentionNotice, statementRetentionDays)
        : null,
      "",
      s.followUp || null,
      "",
      supportEmail ? `${s.supportLine} ${supportEmail}` : null,
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
    html: wrapEmailHtml(config, bodyParts.join("\n")),
  };
}

// ---------------------------------------------------------------------------
// Template: dispatch-accepted
// ---------------------------------------------------------------------------

function renderDispatchAccepted(
  locale: string,
  data: Record<string, unknown>,
): RenderedEmail {
  const s = DISPATCH_ACCEPTED_STRINGS[resolveLocale(locale)];
  const config = layoutConfig(locale, data);
  const orderRef = readString(data, "orderRef");
  const deliveryType = readDeliveryType(data);
  const deliveryTypeLabel = formatDeliveryTypeLabel(locale, deliveryType);
  const senderName = readString(data, "senderName");
  const recipientName = readString(data, "recipientName");
  const providerReference = readString(data, "providerReference");
  const trackingNumber = readString(data, "trackingNumber");
  const downloadUrl = readString(data, "downloadUrl");
  const statementRetentionDays = readInteger(data, "statementRetentionDays", 10);
  const supportEmail = readString(data, "supportEmail");
  const showTracking = deliveryType === "registered" && Boolean(trackingNumber);

  const rows = [
    detailRowMono(s.orderLabel, orderRef),
    deliveryTypeLabel ? detailRow(s.deliveryTypeLabel, deliveryTypeLabel) : "",
    senderName ? detailRow(s.senderLabel, senderName) : "",
    recipientName ? detailRow(s.recipientLabel, recipientName) : "",
    providerReference ? detailRowMono(s.referenceLabel, providerReference) : "",
    showTracking ? detailRowMono(s.trackingLabel, trackingNumber) : "",
  ]
    .filter(Boolean)
    .join("\n");

  const bodyParts = [
    heading(s.heading),
    paragraph(escapeHtml(s.body)),
    detailTable(rows),
  ];

  if (showTracking) {
    const trackUrl = swissPostTrackingUrl(trackingNumber);
    bodyParts.push(primaryButton(trackUrl, s.trackOnPostLabel));
  }

  if (downloadUrl) {
    bodyParts.push(sectionDivider());
    bodyParts.push(
      `<p style="margin:0 0 8px;">${secondaryLink(downloadUrl, s.downloadLabel)}</p>`,
    );
    bodyParts.push(
      mutedText(
        escapeHtml(replaceRetentionDays(s.retentionNotice, statementRetentionDays)),
      ),
    );
  }

  if (supportEmail) {
    bodyParts.push(sectionDivider());
    bodyParts.push(
      mutedText(
        `${escapeHtml(s.supportLine)} <a href="mailto:${escapeHtml(supportEmail)}" style="color:#161616;text-decoration:underline;">${escapeHtml(supportEmail)}</a>`,
      ),
    );
  }

  // -- Plain text --
  const textLines = [
    s.heading.toUpperCase(),
    "",
    s.body,
    "",
    `${s.orderLabel}: ${orderRef}`,
    deliveryTypeLabel ? `${s.deliveryTypeLabel}: ${deliveryTypeLabel}` : null,
    senderName ? `${s.senderLabel}: ${senderName}` : null,
    recipientName ? `${s.recipientLabel}: ${recipientName}` : null,
    providerReference ? `${s.referenceLabel}: ${providerReference}` : null,
    showTracking ? `${s.trackingLabel}: ${trackingNumber}` : null,
    showTracking
      ? `${s.trackOnPostLabel}: ${swissPostTrackingUrl(trackingNumber)}`
      : null,
    "",
    downloadUrl ? `${s.downloadLabel}: ${downloadUrl}` : null,
    downloadUrl ? replaceRetentionDays(s.retentionNotice, statementRetentionDays) : null,
    "",
    supportEmail ? `${s.supportLine} ${supportEmail}` : null,
  ].filter((line): line is string => line !== null);

  return {
    subject: s.subject,
    text: textLines.join("\n"),
    html: wrapEmailHtml(config, bodyParts.filter(Boolean).join("\n")),
  };
}

// ---------------------------------------------------------------------------
// Template: resume-link
// ---------------------------------------------------------------------------

function renderResumeLink(locale: string, data: Record<string, unknown>): RenderedEmail {
  const s = RESUME_LINK_STRINGS[resolveLocale(locale)];
  const config = layoutConfig(locale, data);
  const resumeUrl = readString(data, "resumeUrl");

  const bodyParts = [
    paragraph(escapeHtml(s.body)),
    primaryButton(resumeUrl, s.ctaLabel),
    mutedText(escapeHtml(s.expiry)),
  ];

  return {
    subject: s.subject,
    text: [s.body, resumeUrl, "", s.expiry].join("\n"),
    html: wrapEmailHtml(config, bodyParts.join("\n")),
  };
}

// ---------------------------------------------------------------------------
// Template: refund-confirmed
// ---------------------------------------------------------------------------

function renderRefundConfirmed(
  locale: string,
  data: Record<string, unknown>,
): RenderedEmail {
  const s = REFUND_CONFIRMED_STRINGS[resolveLocale(locale)];
  const config = layoutConfig(locale, data);
  const orderRef = readString(data, "orderRef");
  const amount = readString(data, "amount");
  const supportEmail = readString(data, "supportEmail");

  const rows = [
    detailRowMono(s.orderLabel, orderRef),
    detailRow(s.amountLabel, `CHF ${amount}`),
  ].join("\n");

  const bodyParts = [
    heading(s.heading),
    paragraph(escapeHtml(s.body)),
    detailTable(rows),
  ];

  if (supportEmail) {
    bodyParts.push(sectionDivider());
    bodyParts.push(
      mutedText(
        `${escapeHtml(s.supportLine)} <a href="mailto:${escapeHtml(supportEmail)}" style="color:#161616;text-decoration:underline;">${escapeHtml(supportEmail)}</a>`,
      ),
    );
  }

  const textLines = [
    s.heading.toUpperCase(),
    "",
    s.body,
    "",
    `${s.orderLabel}: ${orderRef}`,
    `${s.amountLabel}: CHF ${amount}`,
    "",
    supportEmail ? `${s.supportLine} ${supportEmail}` : null,
  ].filter((line): line is string => line !== null);

  return {
    subject: s.subject,
    text: textLines.join("\n"),
    html: wrapEmailHtml(config, bodyParts.filter(Boolean).join("\n")),
  };
}

// ---------------------------------------------------------------------------
// Template: payment-receipt
// ---------------------------------------------------------------------------

function renderPaymentReceipt(
  locale: string,
  data: Record<string, unknown>,
): RenderedEmail {
  const s = PAYMENT_RECEIPT_STRINGS[resolveLocale(locale)];
  const config = layoutConfig(locale, data);
  const orderRef = readString(data, "orderRef");
  const totalCents = readInteger(data, "totalCents", 0);
  const totalFormatted = formatCHF(totalCents);
  const totalLine = `${totalFormatted} ${s.vatNote}`;
  const downloadUrl = readString(data, "downloadUrl");
  const statementRetentionDays = readInteger(data, "statementRetentionDays", 10);
  const supportEmail = readString(data, "supportEmail");

  const rows = [
    detailRowMono(s.orderLabel, orderRef),
    detailRow(s.totalLabel, totalLine),
  ].join("\n");

  const bodyParts = [
    heading(s.heading),
    paragraph(escapeHtml(s.body)),
    detailTable(rows),
  ];

  if (downloadUrl) {
    bodyParts.push(primaryButton(downloadUrl, s.downloadCta));
    bodyParts.push(
      mutedText(
        escapeHtml(replaceRetentionDays(s.retentionNotice, statementRetentionDays)),
      ),
    );
  }

  bodyParts.push(sectionDivider());
  bodyParts.push(mutedText(escapeHtml(s.attachmentNote)));

  if (supportEmail) {
    bodyParts.push(
      mutedText(
        `${escapeHtml(s.supportLine)} <a href="mailto:${escapeHtml(supportEmail)}" style="color:#161616;text-decoration:underline;">${escapeHtml(supportEmail)}</a>`,
      ),
    );
  }

  const textLines = [
    s.heading.toUpperCase(),
    "",
    s.body,
    "",
    `${s.orderLabel}: ${orderRef}`,
    `${s.totalLabel}: ${totalLine}`,
    "",
    downloadUrl ? `${s.downloadLabel}: ${downloadUrl}` : null,
    downloadUrl ? replaceRetentionDays(s.retentionNotice, statementRetentionDays) : null,
    "",
    s.attachmentNote,
    "",
    supportEmail ? `${s.supportLine} ${supportEmail}` : null,
  ].filter((line): line is string => line !== null);

  return {
    subject: s.subject,
    text: textLines.join("\n"),
    html: wrapEmailHtml(config, bodyParts.filter(Boolean).join("\n")),
  };
}

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

const TEMPLATE_RENDERERS: Record<
  string,
  (locale: string, data: Record<string, unknown>) => RenderedEmail
> = {
  "dispatch-submitted": renderDispatchSubmitted,
  "dispatch-accepted": renderDispatchAccepted,
  "resume-link": renderResumeLink,
  "refund-confirmed": renderRefundConfirmed,
  "payment-receipt": renderPaymentReceipt,
};

export function renderTemplate(
  template: string,
  locale: string,
  data: Record<string, unknown>,
): RenderedEmail {
  const renderer = TEMPLATE_RENDERERS[template];
  if (!renderer) {
    throw new Error(`Unknown email template: ${template}`);
  }
  return renderer(locale, data);
}
