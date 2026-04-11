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
  detailTable,
  heading,
  paragraph,
  mutedText,
  swissPostTrackingUrl,
  type EmailLayoutConfig,
} from "./email-layout.js";

import {
  resolveLocale,
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
  const statusUrl = readString(data, "statusUrl");

  const rows = detailRow(s.orderLabel, orderRef);

  const bodyParts = [
    heading(s.heading),
    paragraph(escapeHtml(s.body)),
    detailTable(rows),
    primaryButton(statusUrl, s.statusLabel),
    mutedText(escapeHtml(s.followUp)),
  ];

  return {
    subject: s.subject,
    text: [s.body, `${s.orderLabel}: ${orderRef}`, "", statusUrl, "", s.followUp].join("\n"),
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
  const providerReference = readString(data, "providerReference");
  const trackingNumber = readString(data, "trackingNumber");
  const downloadUrl = readString(data, "downloadUrl");
  const statementRetentionDays = readInteger(data, "statementRetentionDays", 10);
  const supportEmail = readString(data, "supportEmail");

  const rows = [
    detailRow(s.orderLabel, orderRef),
    providerReference ? detailRow(s.referenceLabel, providerReference) : "",
    trackingNumber ? detailRow(s.trackingLabel, trackingNumber) : "",
  ]
    .filter(Boolean)
    .join("\n");

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
        `${escapeHtml(s.supportLine)} <a href="mailto:${escapeHtml(supportEmail)}" style="color:#1a1a1a;text-decoration:underline;">${escapeHtml(supportEmail)}</a>`,
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
    providerReference ? `${s.referenceLabel}: ${providerReference}` : null,
    trackingNumber ? `${s.trackingLabel}: ${trackingNumber}` : null,
    trackingNumber
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
    bodyParts.push(
      mutedText(
        `${escapeHtml(s.supportLine)} <a href="mailto:${escapeHtml(supportEmail)}" style="color:#1a1a1a;text-decoration:underline;">${escapeHtml(supportEmail)}</a>`,
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
