/**
 * Shared HTML email layout — responsive, branded wrapper for all transactional emails.
 *
 * Uses table-based layout with inline styles for maximum email client compatibility.
 * Brand: Episto (#f6c54a golden yellow accent).
 */

// Ledger, not dashboard: content sits directly on paper — no white card.
const BRAND_COLOR = "#f6c54a";
const INK_COLOR = "#161616";
const TEXT_COLOR = "#161616";
const MUTED_COLOR = "#5d5a54";
const BG_COLOR = "#f5f2ea";
const HAIRLINE_COLOR = "#d7d2c8";
const SERIF_STACK = "Georgia,'Times New Roman',serif";
const SANS_STACK = "'Helvetica Neue',Arial,sans-serif";
const MONO_STACK = "'Courier New',monospace";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export { escapeHtml };

export interface EmailLayoutConfig {
  brandName: string;
  locale: string;
  appPublicUrl: string;
  legalEntityName: string;
  legalEntityAddress: string;
  legalEntityCountry: string;
  legalEntityUidVat: string;
  supportEmail: string;
}

interface FooterStrings {
  privacy: string;
  terms: string;
  imprint: string;
}

const DEFAULT_FOOTER_STRINGS: FooterStrings = {
  privacy: "Privacy Policy",
  terms: "Terms of Service",
  imprint: "Imprint",
};

const FOOTER_STRINGS = {
  "en-CH": DEFAULT_FOOTER_STRINGS,
  "de-CH": { privacy: "Datenschutz", terms: "Nutzungsbedingungen", imprint: "Impressum" },
  "fr-CH": {
    privacy: "Confidentialité",
    terms: "Conditions",
    imprint: "Mentions légales",
  },
  "it-CH": { privacy: "Privacy", terms: "Condizioni", imprint: "Colophon" },
};

function footerStrings(locale: string): FooterStrings {
  return FOOTER_STRINGS[locale as keyof typeof FOOTER_STRINGS] ?? DEFAULT_FOOTER_STRINGS;
}

function brandBadgeInitial(brandName: string): string {
  const match = brandName.trim().match(/[\p{L}\p{N}]/u);
  return match?.[0]?.toUpperCase() ?? "E";
}

export function wrapEmailHtml(config: EmailLayoutConfig, bodyHtml: string): string {
  const f = footerStrings(config.locale);
  const url = escapeHtml(config.appPublicUrl);
  const locale = escapeHtml(config.locale);
  const brand = escapeHtml(config.brandName);
  const brandInitial = escapeHtml(brandBadgeInitial(config.brandName));
  const support = escapeHtml(config.supportEmail);
  const entity = escapeHtml(config.legalEntityName);
  const address = escapeHtml(config.legalEntityAddress);
  const country = escapeHtml(config.legalEntityCountry);
  const vat = escapeHtml(config.legalEntityUidVat);

  return `<!DOCTYPE html>
<html lang="${locale}" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${brand}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BG_COLOR};font-family:${SANS_STACK};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BG_COLOR}" style="background-color:${BG_COLOR};">
    <tr><td align="center" style="padding:32px 16px 0;">
      <!-- Content sits directly on paper — no white card. -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Masthead -->
        <tr><td style="padding:0 40px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="width:32px;height:32px;background-color:${BRAND_COLOR};border-radius:8px;text-align:center;vertical-align:middle;">
              <span style="font-family:${SANS_STACK};font-size:16px;font-weight:700;color:${INK_COLOR};line-height:32px;">${brandInitial}</span>
            </td>
            <td style="padding-left:10px;font-family:${SANS_STACK};font-size:16px;font-weight:600;color:${INK_COLOR};">${brand}</td>
          </tr></table>
        </td></tr>
        <!-- Anchor rule -->
        <tr><td style="padding:20px 40px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td height="2" bgcolor="${INK_COLOR}" style="font-size:0;line-height:0;">&nbsp;</td>
          </tr></table>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:24px 40px 8px;">
          ${bodyHtml}
        </td></tr>
      </table>
    </td></tr>

    <tr><td align="center" style="padding:8px 16px 40px;">
      <!-- Footer -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="padding:0 40px 16px;text-align:center;">
          <span style="font-family:${SANS_STACK};font-size:12px;color:${MUTED_COLOR};">
            <a href="mailto:${support}" style="color:${MUTED_COLOR};text-decoration:underline;">${support}</a>
          </span>
        </td></tr>
        <tr><td style="padding:0 40px 12px;text-align:center;font-family:${SANS_STACK};font-size:12px;color:${MUTED_COLOR};line-height:1.6;">
          ${entity}<br>
          ${address}, ${country}<br>
          ${vat}
        </td></tr>
        <tr><td style="text-align:center;font-family:${SANS_STACK};font-size:12px;">
          <a href="${url}/${locale}/privacy" style="color:${MUTED_COLOR};text-decoration:underline;">${escapeHtml(f.privacy)}</a>
          &nbsp;&middot;&nbsp;
          <a href="${url}/${locale}/terms" style="color:${MUTED_COLOR};text-decoration:underline;">${escapeHtml(f.terms)}</a>
          &nbsp;&middot;&nbsp;
          <a href="${url}/${locale}/imprint" style="color:${MUTED_COLOR};text-decoration:underline;">${escapeHtml(f.imprint)}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function primaryButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  // Amber's one email job: the single button. Left-aligned, ink text on amber.
  return `<table role="presentation" cellpadding="0" cellspacing="0" align="left" style="margin:24px 0;">
  <tr><td bgcolor="${BRAND_COLOR}" style="background-color:${BRAND_COLOR};border-radius:3px;text-align:center;">
    <a href="${safeHref}" style="display:inline-block;padding:13px 28px;font-family:${SANS_STACK};color:${INK_COLOR};font-size:15px;font-weight:600;text-decoration:none;" target="_blank">${safeLabel}</a>
  </td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:0;line-height:0;clear:both;">&nbsp;</td></tr></table>`;
}

export function secondaryLink(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="color:${INK_COLOR};font-family:${SANS_STACK};font-size:14px;font-weight:500;text-decoration:underline;" target="_blank">${escapeHtml(label)}</a>`;
}

export function sectionDivider(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
  <tr><td style="border-top:1px solid ${HAIRLINE_COLOR};font-size:0;line-height:0;">&nbsp;</td></tr>
</table>`;
}

export function detailRow(label: string, value: string): string {
  return `<tr>
  <td style="padding:10px 12px 10px 0;border-bottom:1px solid ${HAIRLINE_COLOR};font-family:${SANS_STACK};font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:${MUTED_COLOR};white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
  <td style="padding:10px 0;border-bottom:1px solid ${HAIRLINE_COLOR};font-family:${SANS_STACK};font-size:15px;color:${INK_COLOR};text-align:right;vertical-align:top;">${escapeHtml(value)}</td>
</tr>`;
}

/** Ledger row whose value is an identifier (order ref, tracking) → monospace. */
export function detailRowMono(label: string, value: string): string {
  return `<tr>
  <td style="padding:10px 12px 10px 0;border-bottom:1px solid ${HAIRLINE_COLOR};font-family:${SANS_STACK};font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:${MUTED_COLOR};white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
  <td style="padding:10px 0;border-bottom:1px solid ${HAIRLINE_COLOR};font-family:${MONO_STACK};font-size:14px;color:${INK_COLOR};text-align:right;vertical-align:top;">${escapeHtml(value)}</td>
</tr>`;
}

export function detailTable(rows: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;">
  ${rows}
</table>`;
}

export function heading(text: string): string {
  return `<h1 style="margin:0 0 12px;font-family:${SERIF_STACK};font-size:26px;font-weight:700;color:${INK_COLOR};line-height:1.2;">${escapeHtml(text)}</h1>`;
}

export function paragraph(text: string, style?: string): string {
  return `<p style="margin:0 0 16px;font-family:${SANS_STACK};font-size:15px;color:${INK_COLOR};line-height:1.6;${style ?? ""}">${text}</p>`;
}

export function mutedText(text: string): string {
  return `<p style="margin:0 0 12px;font-family:${SANS_STACK};font-size:14px;color:${MUTED_COLOR};line-height:1.5;">${text}</p>`;
}

export function formatCHF(amountCents: number): string {
  const amount = (amountCents / 100).toFixed(2);
  return `CHF ${amount}`;
}

export function swissPostTrackingUrl(trackingNumber: string): string {
  return `https://www.post.ch/swisspost-tracking?formattedParcelCodes=${encodeURIComponent(trackingNumber)}`;
}
