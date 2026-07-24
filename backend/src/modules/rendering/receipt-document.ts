import { BRAND_NAME, renderBrandMarkSvg } from "../../shared/brand.js";
import { type ReceiptCopy, type ReceiptLocale, getCopy } from "./receipt-strings.js";
import { RECEIPT_DOCUMENT_CSS } from "./receipt-document.css.js";
import { EMBEDDED_FONTS_CSS } from "./fonts.css.js";

export type { ReceiptLocale } from "./receipt-strings.js";

export interface ReceiptLineItem {
  label: string;
  amountCents: number;
}

export interface ReceiptDocumentInput {
  locale: ReceiptLocale;
  receiptNumber: string;
  issuedAt: Date;
  orderRef: string;
  currency: string;
  netCents: number;
  vatCents: number;
  totalCents: number;
  discountCents: number;
  promoCode?: string | null;
  deliveryType?: string | null;
  paymentMethod?: string | null;
  lineItems: ReceiptLineItem[];
  legalEntity: {
    name: string;
    addressLine1: string;
    addressLine2: string;
    country: string;
    uidVat: string;
  };
  supportEmail: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMoney(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatDate(locale: ReceiptLocale, value: Date): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "Europe/Zurich",
  }).format(value);
}

function renderBrandMark(): string {
  return renderBrandMarkSvg(30);
}

export function renderReceiptDocumentHtml(input: ReceiptDocumentInput): string {
  const copy: ReceiptCopy = getCopy(input.locale);
  const issuedAt = formatDate(input.locale, input.issuedAt);
  const deliveryTypeLabel = input.deliveryType
    ? (copy.deliveryTypes[input.deliveryType] ?? input.deliveryType)
    : null;

  const lineItemsRows =
    input.lineItems.length > 0
      ? input.lineItems
      : [
          { label: copy.lineItemFallback.postage, amountCents: 0 },
          { label: copy.lineItemFallback.service, amountCents: 0 },
        ];

  const lineItemsHtml = lineItemsRows
    .map(
      (item) => `<div class="line-row">
          <span class="line-label">${escapeHtml(item.label)}</span>
          <span class="line-amount">${escapeHtml(formatMoney(item.amountCents))}</span>
        </div>`,
    )
    .join("");

  const discountHtml =
    input.discountCents > 0
      ? `<div class="total-row discount-row">
          <span class="total-label">${escapeHtml(copy.discount)}${
            input.promoCode ? ` (${escapeHtml(input.promoCode)})` : ""
          }</span>
          <span class="total-amount">−${escapeHtml(formatMoney(input.discountCents))}</span>
        </div>`
      : "";

  const deliveryTypeHtml = deliveryTypeLabel
    ? `<div class="meta-row">
          <span class="meta-label">${escapeHtml(copy.deliveryType)}</span>
          <span class="meta-value">${escapeHtml(deliveryTypeLabel)}</span>
        </div>`
    : "";

  const paymentMethodHtml = input.paymentMethod
    ? `<div class="meta-row">
          <span class="meta-label">${escapeHtml(copy.paymentMethod)}</span>
          <span class="meta-value">${escapeHtml(input.paymentMethod)}</span>
        </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="${escapeHtml(input.locale)}">
<head>
  <meta charset="UTF-8">
  <style>
    ${EMBEDDED_FONTS_CSS}
    ${RECEIPT_DOCUMENT_CSS}
  </style>
</head>
<body>
  <main class="receipt-page">
    <header class="masthead">
      <div>
        <div class="masthead-brand">
          ${renderBrandMark()}
          <span class="masthead-wordmark">${escapeHtml(BRAND_NAME)}</span>
        </div>
        <h1 class="masthead-title">${escapeHtml(copy.title)}</h1>
      </div>
      <div class="masthead-date">${escapeHtml(issuedAt)}</div>
    </header>
    <div class="anchor-rule"></div>

    <section class="header-band">
      <div class="issuer-block">
        <div class="issuer-name">${escapeHtml(input.legalEntity.name)}</div>
        <div>${escapeHtml(input.legalEntity.addressLine1)}</div>
        <div>${escapeHtml(input.legalEntity.addressLine2)}</div>
        <div>${escapeHtml(input.legalEntity.country)}</div>
        <div class="issuer-vat">${escapeHtml(copy.uidVat)} ${escapeHtml(input.legalEntity.uidVat)}</div>
      </div>
      <div class="meta-block">
        <div class="meta-row">
          <span class="meta-label">${escapeHtml(copy.receiptNumber)}</span>
          <span class="meta-value mono">${escapeHtml(input.receiptNumber)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">${escapeHtml(copy.orderRef)}</span>
          <span class="meta-value mono">${escapeHtml(input.orderRef)}</span>
        </div>
        ${deliveryTypeHtml}
        ${paymentMethodHtml}
      </div>
    </section>

    <hr class="hairline" style="margin-top:18pt">

    <section class="items">
      <div class="eyebrow">${escapeHtml(copy.lineItemsEyebrow)}</div>
      <div class="col-heads">
        <span class="eyebrow">${escapeHtml(copy.colDescription)}</span>
        <span class="eyebrow">${escapeHtml(copy.colAmount)}</span>
      </div>
      <hr class="hairline" style="margin-top:5pt">
      ${lineItemsHtml}
    </section>

    <section class="totals">
      <div class="totals-inner">
        ${discountHtml}
        <div class="total-row">
          <span class="total-label">${escapeHtml(copy.subtotal)}</span>
          <span class="total-amount">${escapeHtml(formatMoney(input.netCents))}</span>
        </div>
        <div class="total-row">
          <span class="total-label">${escapeHtml(copy.vat)}</span>
          <span class="total-amount">${escapeHtml(formatMoney(input.vatCents))}</span>
        </div>
        <div class="total-row grand-total">
          <span class="total-label">${escapeHtml(copy.total)}</span>
          <span class="total-amount">${escapeHtml(formatMoney(input.totalCents))}</span>
        </div>
      </div>
      <div class="fiscal-rule"><span class="fiscal-rule-inner"><span class="fr"></span><span class="fr-gap"></span><span class="fr"></span></span></div>
    </section>

    <section class="footer">
      <hr class="hairline">
      <p>${escapeHtml(copy.footerVat)}</p>
      <p>${escapeHtml(copy.footerSupport)} ${escapeHtml(input.supportEmail)}</p>
    </section>
  </main>
</body>
</html>`;
}
