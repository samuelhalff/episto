/**
 * Shared HTML email layout — responsive, branded wrapper for all transactional emails.
 *
 * Uses table-based layout with inline styles for maximum email client compatibility.
 * Brand: Sendly (#f6c54a golden yellow accent).
 */

const BRAND_COLOR = "#f6c54a";
const TEXT_COLOR = "#1a1a1a";
const MUTED_COLOR = "#6b7280";
const BG_COLOR = "#f9fafb";
const CARD_BG = "#ffffff";
const BORDER_COLOR = "#e5e7eb";

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

const FOOTER_STRINGS: Record<string, { privacy: string; terms: string; imprint: string }> = {
  "en-CH": { privacy: "Privacy Policy", terms: "Terms of Service", imprint: "Imprint" },
  "de-CH": { privacy: "Datenschutz", terms: "Nutzungsbedingungen", imprint: "Impressum" },
  "fr-CH": { privacy: "Confidentialité", terms: "Conditions", imprint: "Mentions légales" },
  "it-CH": { privacy: "Privacy", terms: "Condizioni", imprint: "Colophon" },
};

function footerStrings(locale: string) {
  return FOOTER_STRINGS[locale] ?? FOOTER_STRINGS["en-CH"]!;
}

export function wrapEmailHtml(config: EmailLayoutConfig, bodyHtml: string): string {
  const f = footerStrings(config.locale);
  const url = escapeHtml(config.appPublicUrl);
  const locale = escapeHtml(config.locale);
  const brand = escapeHtml(config.brandName);
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
<body style="margin:0;padding:0;background-color:${BG_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_COLOR};">
    <tr><td align="center" style="padding:32px 16px 0;">
      <!-- Brand header -->
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="padding:0 0 24px;text-align:left;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="width:36px;height:36px;background-color:${BRAND_COLOR};border-radius:10px;text-align:center;vertical-align:middle;">
              <span style="font-size:18px;font-weight:700;color:${TEXT_COLOR};line-height:36px;">S</span>
            </td>
            <td style="padding-left:10px;font-size:18px;font-weight:600;color:${TEXT_COLOR};letter-spacing:-0.01em;">${brand}</td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>

    <tr><td align="center" style="padding:0 16px;">
      <!-- Main card -->
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:${CARD_BG};border-radius:12px;border:1px solid ${BORDER_COLOR};">
        <tr><td style="padding:32px 32px 24px;">
          ${bodyHtml}
        </td></tr>
      </table>
    </td></tr>

    <tr><td align="center" style="padding:24px 16px 40px;">
      <!-- Footer -->
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="padding:0 0 16px;text-align:center;">
          <span style="font-size:13px;color:${MUTED_COLOR};">
            <a href="mailto:${support}" style="color:${MUTED_COLOR};text-decoration:underline;">${support}</a>
          </span>
        </td></tr>
        <tr><td style="padding:0 0 12px;text-align:center;font-size:12px;color:${MUTED_COLOR};line-height:1.6;">
          ${entity}<br>
          ${address}, ${country}<br>
          ${vat}
        </td></tr>
        <tr><td style="text-align:center;font-size:12px;">
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
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td style="background-color:${TEXT_COLOR};border-radius:8px;text-align:center;">
    <a href="${safeHref}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.01em;" target="_blank">${safeLabel}</a>
  </td></tr>
</table>`;
}

export function secondaryLink(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="color:${TEXT_COLOR};font-size:14px;font-weight:500;text-decoration:underline;" target="_blank">${escapeHtml(label)}</a>`;
}

export function sectionDivider(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
  <tr><td style="border-top:1px solid ${BORDER_COLOR};"></td></tr>
</table>`;
}

export function detailRow(label: string, value: string): string {
  return `<tr>
  <td style="padding:6px 12px 6px 0;font-size:13px;color:${MUTED_COLOR};white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
  <td style="padding:6px 0;font-size:13px;color:${TEXT_COLOR};font-weight:500;">${escapeHtml(value)}</td>
</tr>`;
}

export function detailTable(rows: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;">
  ${rows}
</table>`;
}

export function heading(text: string): string {
  return `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:${TEXT_COLOR};line-height:1.3;">${escapeHtml(text)}</h2>`;
}

export function paragraph(text: string, style?: string): string {
  return `<p style="margin:0 0 16px;font-size:14px;color:${TEXT_COLOR};line-height:1.6;${style ?? ''}">${text}</p>`;
}

export function mutedText(text: string): string {
  return `<p style="margin:0 0 12px;font-size:13px;color:${MUTED_COLOR};line-height:1.5;">${text}</p>`;
}

export function formatCHF(amountCents: number): string {
  const amount = (amountCents / 100).toFixed(2);
  return `CHF ${amount}`;
}

export function swissPostTrackingUrl(trackingNumber: string): string {
  return `https://www.post.ch/swisspost-tracking?formattedParcelCodes=${encodeURIComponent(trackingNumber)}`;
}
