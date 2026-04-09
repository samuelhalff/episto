/**
 * Email template renderers — professional HTML email templates for all
 * transactional emails sent by Sendly.
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
  DISPATCH_CONFIRMATION_STRINGS,
  DISPATCH_SUBMITTED_STRINGS,
  DISPATCH_ACCEPTED_STRINGS,
  RESUME_LINK_STRINGS,
  REFUND_CONFIRMED_STRINGS,
} from "./email-strings.js";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function readString(
  data: Record<string, unknown>,
  key: string,
  fallback = "",
): string {
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

function capitalizeDelivery(type: string): string {
  if (!type) return "";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// ---------------------------------------------------------------------------
// Template: dispatch-confirmation
// ---------------------------------------------------------------------------

function renderDispatchConfirmation(locale: string, data: Record<string, unknown>): RenderedEmail {
  const s = DISPATCH_CONFIRMATION_STRINGS[resolveLocale(locale)];
  const config = layoutConfig(locale, data);
  const brandName = readString(data, "brandName", BRAND_NAME);
  const orderRef = readString(data, "orderRef");
  const recipientName = readString(data, "recipientName");
  const supportEmail = readString(data, "supportEmail");
  const deliveryType = capitalizeDelivery(readString(data, "deliveryType", "standard"));
  const trackingNumber = readString(data, "trackingNumber");
  const downloadUrl = readString(data, "downloadUrl");
  const statementRetentionDays = readInteger(data, "statementRetentionDays", 10);
  const amountCents = readInteger(data, "amountCents", 0);

  // -- HTML --
  const rows = [
    detailRow(s.orderLabel, orderRef),
    recipientName ? detailRow(s.recipientLabel, recipientName) : "",
    detailRow(s.deliveryLabel, deliveryType),
    amountCents > 0 ? detailRow(s.totalLabel, formatCHF(amountCents)) : "",
  ].filter(Boolean).join("\n");

  const bodyParts = [
    heading(s.heading),
    paragraph(escapeHtml(s.greeting)),
    detailTable(rows),
    sectionDivider(),
    `<p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#1a1a1a;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(s.nextStepsHeading)}</p>`,
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
      <tr><td style="padding:4px 8px 4px 0;font-size:20px;color:#d1d5db;vertical-align:top;">1</td><td style="padding:4px 0;font-size:13px;color:#1a1a1a;line-height:1.5;">${escapeHtml(s.nextStep1)}</td></tr>
      <tr><td style="padding:4px 8px 4px 0;font-size:20px;color:#d1d5db;vertical-align:top;">2</td><td style="padding:4px 0;font-size:13px;color:#1a1a1a;line-height:1.5;">${escapeHtml(s.nextStep2)}</td></tr>
      <tr><td style="padding:4px 8px 4px 0;font-size:20px;color:#d1d5db;vertical-align:top;">3</td><td style="padding:4px 0;font-size:13px;color:#1a1a1a;line-height:1.5;">${escapeHtml(s.nextStep3)}</td></tr>
    </table>`,
  ];

  // Tracking button right after the steps — step 3 leads into it naturally
  if (trackingNumber) {
    const trackUrl = swissPostTrackingUrl(trackingNumber);
    bodyParts.push(primaryButton(trackUrl, s.trackOnPostLabel));
  }

  if (downloadUrl) {
    bodyParts.push(sectionDivider());
    bodyParts.push(`<p style="margin:0 0 8px;">${secondaryLink(downloadUrl, s.downloadLabel)}</p>`);
    bodyParts.push(mutedText(escapeHtml(replaceRetentionDays(s.retentionNotice, statementRetentionDays))));
  }

  if (supportEmail) {
    bodyParts.push(sectionDivider());
    bodyParts.push(mutedText(
      `${escapeHtml(s.supportLine)} <a href="mailto:${escapeHtml(supportEmail)}" style="color:#1a1a1a;text-decoration:underline;">${escapeHtml(supportEmail)}</a>`,
    ));
  }

  const html = wrapEmailHtml(config, bodyParts.filter(Boolean).join("\n"));

  // -- Plain text --
  const textLines = [
    s.heading.toUpperCase(),
    "",
    s.greeting,
    "",
    `${s.orderLabel}: ${orderRef}`,
    recipientName ? `${s.recipientLabel}: ${recipientName}` : null,
    `${s.deliveryLabel}: ${deliveryType}`,
    amountCents > 0 ? `${s.totalLabel}: ${formatCHF(amountCents)}` : null,
    "",
    s.nextStepsHeading.toUpperCase(),
    `1. ${s.nextStep1}`,
    `2. ${s.nextStep2}`,
    `3. ${s.nextStep3}`,
    "",
    trackingNumber ? `${s.trackOnPostLabel}: ${swissPostTrackingUrl(trackingNumber)}` : null,
    "",
    downloadUrl ? `${s.downloadLabel}: ${downloadUrl}` : null,
    downloadUrl ? replaceRetentionDays(s.retentionNotice, statementRetentionDays) : null,
    "",
    supportEmail ? `${s.supportLine} ${supportEmail}` : null,
  ].filter((line): line is string => line !== null);

  return {
    subject: `${brandName} – ${s.subject} (${orderRef})`,
    html,
    text: textLines.join("\n"),
  };
}

// ---------------------------------------------------------------------------
// Template: dispatch-submitted
// ---------------------------------------------------------------------------

function renderDispatchSubmitted(locale: string, data: Record<string, unknown>): RenderedEmail {
  const s = DISPATCH_SUBMITTED_STRINGS[resolveLocale(locale)];
  const config = layoutConfig(locale, data);
  const orderRef = readString(data, "orderRef");

  const bodyParts = [
    paragraph(escapeHtml(s.body)),
    detailTable(detailRow(s.orderLabel, orderRef)),
    mutedText(escapeHtml(s.followUp)),
  ];

  return {
    subject: s.subject,
    text: [s.body, `${s.orderLabel}: ${orderRef}`, "", s.followUp].join("\n"),
    html: wrapEmailHtml(config, bodyParts.join("\n")),
  };
}

// ---------------------------------------------------------------------------
// Template: dispatch-accepted
// ---------------------------------------------------------------------------

function renderDispatchAccepted(locale: string, data: Record<string, unknown>): RenderedEmail {
  const s = DISPATCH_ACCEPTED_STRINGS[resolveLocale(locale)];
  const config = layoutConfig(locale, data);
  const orderRef = readString(data, "orderRef");
  const providerReference = readString(data, "providerReference");
  const trackingNumber = readString(data, "trackingNumber");
  const downloadUrl = readString(data, "downloadUrl");
  const statementRetentionDays = readInteger(data, "statementRetentionDays", 10);
  const supportEmail = readString(data, "supportEmail");

  const rows = [
    detailRow(s.orderLabel, orderRef),
    providerReference ? detailRow(s.referenceLabel, providerReference) : "",
    trackingNumber ? detailRow(s.trackingLabel, trackingNumber) : "",
  ].filter(Boolean).join("\n");

  const bodyParts = [
    heading(s.heading),
    paragraph(escapeHtml(s.body)),
    detailTable(rows),
  ];

  if (trackingNumber) {
    const trackUrl = swissPostTrackingUrl(trackingNumber);
    bodyParts.push(primaryButton(trackUrl, s.trackOnPostLabel));
  }

  if (downloadUrl) {
    bodyParts.push(sectionDivider());
    bodyParts.push(`<p style="margin:0 0 8px;">${secondaryLink(downloadUrl, s.downloadLabel)}</p>`);
    bodyParts.push(mutedText(escapeHtml(replaceRetentionDays(s.retentionNotice, statementRetentionDays))));
  }

  if (supportEmail) {
    bodyParts.push(sectionDivider());
    bodyParts.push(mutedText(
      `${escapeHtml(s.supportLine)} <a href="mailto:${escapeHtml(supportEmail)}" style="color:#1a1a1a;text-decoration:underline;">${escapeHtml(supportEmail)}</a>`,
    ));
  }

  // -- Plain text --
  const textLines = [
    s.heading.toUpperCase(),
    "",
    s.body,
    "",
    `${s.orderLabel}: ${orderRef}`,
    providerReference ? `${s.referenceLabel}: ${providerReference}` : null,
    trackingNumber ? `${s.trackingLabel}: ${trackingNumber}` : null,
    trackingNumber ? `${s.trackOnPostLabel}: ${swissPostTrackingUrl(trackingNumber)}` : null,
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

function renderRefundConfirmed(locale: string, data: Record<string, unknown>): RenderedEmail {
  const s = REFUND_CONFIRMED_STRINGS[resolveLocale(locale)];
  const config = layoutConfig(locale, data);
  const orderRef = readString(data, "orderRef");
  const amount = readString(data, "amount");
  const supportEmail = readString(data, "supportEmail");

  const rows = [
    detailRow(s.orderLabel, orderRef),
    detailRow(s.amountLabel, `CHF ${amount}`),
  ].join("\n");

  const bodyParts = [
    heading(s.heading),
    paragraph(escapeHtml(s.body)),
    detailTable(rows),
  ];

  if (supportEmail) {
    bodyParts.push(sectionDivider());
    bodyParts.push(mutedText(
      `${escapeHtml(s.supportLine)} <a href="mailto:${escapeHtml(supportEmail)}" style="color:#1a1a1a;text-decoration:underline;">${escapeHtml(supportEmail)}</a>`,
    ));
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
// Template registry
// ---------------------------------------------------------------------------

const TEMPLATES: Record<
  string,
  (locale: string, data: Record<string, unknown>) => RenderedEmail
> = {
  "dispatch-confirmation": renderDispatchConfirmation,
  "dispatch-submitted": renderDispatchSubmitted,
  "dispatch-accepted": renderDispatchAccepted,
  "resume-link": renderResumeLink,
  "refund-confirmed": renderRefundConfirmed,
};

export function renderTemplate(
  template: string,
  locale: string,
  data: Record<string, unknown>,
): RenderedEmail {
  const renderer = TEMPLATES[template];
  if (!renderer) {
    throw new Error(`Unknown email template: ${template}`);
  }
  return renderer(locale, data);
}
