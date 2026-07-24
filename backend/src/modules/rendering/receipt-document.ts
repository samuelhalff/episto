import { BRAND_NAME, BRAND_COLOR, renderBrandMarkSvg } from "../../shared/brand.js";

export type ReceiptLocale = "de-CH" | "fr-CH" | "it-CH" | "en-CH";

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

interface ReceiptCopy {
  eyebrow: string;
  title: string;
  issuedOn: string;
  receiptNumber: string;
  orderRef: string;
  uidVat: string;
  subtotal: string;
  vat: string;
  total: string;
  discount: string;
  paymentMethod: string;
  deliveryType: string;
  notAvailable: string;
  footerVat: string;
  footerSupport: string;
  lineItemFallback: { postage: string; service: string };
  deliveryTypes: Record<string, string>;
}

const DEFAULT_COPY: ReceiptCopy = {
  eyebrow: BRAND_NAME,
  title: "Receipt",
  issuedOn: "Date",
  receiptNumber: "Receipt number",
  orderRef: "Order reference",
  uidVat: "VAT no.",
  subtotal: "Subtotal (net)",
  vat: "VAT 8.1%",
  total: "Total",
  discount: "Discount",
  paymentMethod: "Payment method",
  deliveryType: "Delivery type",
  notAvailable: "Not available",
  footerVat: "incl. 8.1% VAT",
  footerSupport: "Questions? Contact",
  lineItemFallback: { postage: "Postage", service: "Episto service" },
  deliveryTypes: {
    standard: "Standard post",
    registered: "Registered post",
  },
};

const COPY: Record<ReceiptLocale, ReceiptCopy> = {
  "en-CH": DEFAULT_COPY,
  "de-CH": {
    eyebrow: BRAND_NAME,
    title: "Quittung",
    issuedOn: "Datum",
    receiptNumber: "Quittungsnummer",
    orderRef: "Bestellreferenz",
    uidVat: "MWST-Nr.",
    subtotal: "Zwischentotal (netto)",
    vat: "MWST 8.1%",
    total: "Total",
    discount: "Rabatt",
    paymentMethod: "Zahlungsart",
    deliveryType: "Versandart",
    notAvailable: "Nicht verfuegbar",
    footerVat: "inkl. 8.1% MWST",
    footerSupport: "Fragen? Kontaktieren Sie",
    lineItemFallback: { postage: "Postversand", service: "Episto-Service" },
    deliveryTypes: {
      standard: "A-Post",
      registered: "Einschreiben",
    },
  },
  "fr-CH": {
    eyebrow: BRAND_NAME,
    title: "Reçu",
    issuedOn: "Date",
    receiptNumber: "Numéro de reçu",
    orderRef: "Référence de commande",
    uidVat: "N° TVA",
    subtotal: "Sous-total (net)",
    vat: "TVA 8.1%",
    total: "Total",
    discount: "Remise",
    paymentMethod: "Moyen de paiement",
    deliveryType: "Mode d'envoi",
    notAvailable: "Non disponible",
    footerVat: "TVA 8.1% incluse",
    footerSupport: "Des questions ? Contactez",
    lineItemFallback: { postage: "Envoi postal", service: "Service Episto" },
    deliveryTypes: {
      standard: "Courrier standard",
      registered: "Courrier recommandé",
    },
  },
  "it-CH": {
    eyebrow: BRAND_NAME,
    title: "Ricevuta",
    issuedOn: "Data",
    receiptNumber: "Numero di ricevuta",
    orderRef: "Riferimento ordine",
    uidVat: "N. IVA",
    subtotal: "Subtotale (netto)",
    vat: "IVA 8.1%",
    total: "Totale",
    discount: "Sconto",
    paymentMethod: "Metodo di pagamento",
    deliveryType: "Tipo di invio",
    notAvailable: "Non disponibile",
    footerVat: "IVA 8.1% inclusa",
    footerSupport: "Domande? Contattate",
    lineItemFallback: { postage: "Spedizione postale", service: "Servizio Episto" },
    deliveryTypes: {
      standard: "Posta standard",
      registered: "Raccomandata",
    },
  },
};

function getCopy(locale: ReceiptLocale): ReceiptCopy {
  return COPY[locale] ?? DEFAULT_COPY;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMoney(cents: number, currency: string): string {
  const value = (cents / 100).toFixed(2);
  return `${currency} ${value}`;
}

function formatDate(locale: ReceiptLocale, value: Date): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "Europe/Zurich",
  }).format(value);
}

function renderBrandMark(): string {
  return renderBrandMarkSvg(56);
}

export function renderReceiptDocumentHtml(input: ReceiptDocumentInput): string {
  const copy = getCopy(input.locale);
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
          <span class="line-amount">${escapeHtml(formatMoney(item.amountCents, input.currency))}</span>
        </div>`,
    )
    .join("");

  const discountHtml =
    input.discountCents > 0
      ? `<div class="total-row discount-row">
          <span class="total-label">${escapeHtml(copy.discount)}${
            input.promoCode ? ` (${escapeHtml(input.promoCode)})` : ""
          }</span>
          <span class="total-amount">−${escapeHtml(formatMoney(input.discountCents, input.currency))}</span>
        </div>`
      : "";

  const paymentMethodHtml = input.paymentMethod
    ? `<div class="fact">
          <div class="label">${escapeHtml(copy.paymentMethod)}</div>
          <div class="fact-value">${escapeHtml(input.paymentMethod)}</div>
        </div>`
    : "";

  const deliveryTypeHtml = deliveryTypeLabel
    ? `<div class="fact">
          <div class="label">${escapeHtml(copy.deliveryType)}</div>
          <div class="fact-value">${escapeHtml(deliveryTypeLabel)}</div>
        </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="${escapeHtml(input.locale)}">
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    :root {
      --pdf-bg: #fffaf2;
      --pdf-surface: #ffffff;
      --pdf-surface-soft: #faf7f1;
      --pdf-border: rgba(24, 24, 27, 0.08);
      --pdf-border-strong: rgba(24, 24, 27, 0.14);
      --pdf-text: #18181b;
      --pdf-muted: #71717a;
      --pdf-muted-strong: #3f3f46;
      --pdf-accent: ${BRAND_COLOR};
      --pdf-shadow: none;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      color: var(--pdf-text);
      background: var(--pdf-bg);
    }
    .receipt-page {
      min-height: 297mm;
      padding: 14mm 14mm 12mm;
      display: flex;
      flex-direction: column;
      gap: 8mm;
    }
    .header-card,
    .section-card,
    .entity-card,
    .fact-card,
    .totals-card,
    .footer-note {
      break-inside: avoid;
      page-break-inside: avoid;
      border: 1px solid var(--pdf-border);
      border-radius: 16px;
      background: var(--pdf-surface);
      box-shadow: var(--pdf-shadow);
    }
    .header-card {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 12mm;
      padding: 10mm;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-copy small,
    .label {
      display: block;
      margin-bottom: 4px;
      font-size: 8.5pt;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--pdf-muted);
    }
    .brand-copy h1 {
      margin: 0;
      font-size: 22pt;
      line-height: 1.05;
      font-weight: 800;
    }
    .header-meta {
      min-width: 46mm;
      text-align: right;
    }
    .header-meta-value {
      font-size: 11pt;
      line-height: 1.35;
      font-weight: 700;
      color: var(--pdf-text);
    }
    .entity-card,
    .fact-card,
    .totals-card {
      padding: 8mm;
    }
    .entity-value {
      font-size: 10.75pt;
      line-height: 1.55;
      font-weight: 600;
      color: var(--pdf-text);
    }
    .facts-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px 16px;
    }
    .fact-value {
      font-size: 10.75pt;
      line-height: 1.55;
      font-weight: 700;
      color: var(--pdf-text);
    }
    .line-row,
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      padding: 6px 0;
      font-size: 10.75pt;
      color: var(--pdf-text);
    }
    .line-row {
      border-bottom: 1px solid var(--pdf-border);
    }
    .line-label,
    .total-label {
      color: var(--pdf-muted-strong);
    }
    .line-amount,
    .total-amount {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
    .totals-block {
      margin-top: 8px;
      border-top: 1px solid var(--pdf-border-strong);
      padding-top: 8px;
    }
    .total-row.grand-total {
      margin-top: 6px;
      padding-top: 10px;
      border-top: 1px solid var(--pdf-border-strong);
      font-size: 13pt;
      font-weight: 900;
    }
    .total-row.grand-total .total-label { color: var(--pdf-text); }
    .discount-row .total-amount { color: var(--pdf-accent); }
    .footer-note {
      padding: 6mm 8mm;
      background: var(--pdf-surface-soft);
    }
    .footer-note p {
      margin: 0;
      font-size: 9.25pt;
      line-height: 1.55;
      color: var(--pdf-muted-strong);
      word-break: break-word;
    }
  </style>
</head>
<body>
  <main class="receipt-page">
    <section class="header-card">
      <div class="brand">
        ${renderBrandMark()}
        <div class="brand-copy">
          <small>${escapeHtml(copy.eyebrow)}</small>
          <h1>${escapeHtml(copy.title)}</h1>
        </div>
      </div>
      <div class="header-meta">
        <div class="label">${escapeHtml(copy.issuedOn)}</div>
        <div class="header-meta-value">${escapeHtml(issuedAt)}</div>
      </div>
    </section>

    <section class="entity-card">
      <div class="label">${escapeHtml(copy.eyebrow)}</div>
      <div class="entity-value">
        ${escapeHtml(input.legalEntity.name)}<br>
        ${escapeHtml(input.legalEntity.addressLine1)}<br>
        ${escapeHtml(input.legalEntity.addressLine2)}<br>
        ${escapeHtml(input.legalEntity.country)}<br>
        ${escapeHtml(copy.uidVat)}: ${escapeHtml(input.legalEntity.uidVat)}
      </div>
    </section>

    <section class="fact-card">
      <div class="facts-grid">
        <div class="fact">
          <div class="label">${escapeHtml(copy.receiptNumber)}</div>
          <div class="fact-value">${escapeHtml(input.receiptNumber)}</div>
        </div>
        <div class="fact">
          <div class="label">${escapeHtml(copy.orderRef)}</div>
          <div class="fact-value">${escapeHtml(input.orderRef)}</div>
        </div>
        ${deliveryTypeHtml}
        ${paymentMethodHtml}
      </div>
    </section>

    <section class="totals-card">
      ${lineItemsHtml}
      <div class="totals-block">
        ${discountHtml}
        <div class="total-row">
          <span class="total-label">${escapeHtml(copy.subtotal)}</span>
          <span class="total-amount">${escapeHtml(formatMoney(input.netCents, input.currency))}</span>
        </div>
        <div class="total-row">
          <span class="total-label">${escapeHtml(copy.vat)}</span>
          <span class="total-amount">${escapeHtml(formatMoney(input.vatCents, input.currency))}</span>
        </div>
        <div class="total-row grand-total">
          <span class="total-label">${escapeHtml(copy.total)}</span>
          <span class="total-amount">${escapeHtml(formatMoney(input.totalCents, input.currency))}</span>
        </div>
      </div>
    </section>

    <section class="footer-note">
      <p>${escapeHtml(copy.footerVat)}</p>
      <p>${escapeHtml(copy.footerSupport)} ${escapeHtml(input.supportEmail)}</p>
    </section>
  </main>
</body>
</html>`;
}
