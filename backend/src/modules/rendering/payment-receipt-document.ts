import { formatCHF } from "../pricing/index.js";

interface ReceiptLineItem {
  label: string;
  amountCents: number;
}

interface ReceiptLegalEntity {
  name: string;
  addressLines: string[];
  uidVat: string;
}

interface StripeReferences {
  paymentIntentId?: string | null;
  chargeId?: string | null;
  receiptUrl?: string | null;
  invoiceId?: string | null;
  invoicePdfUrl?: string | null;
}

const FIRST_SHEET_LINE_ITEM_LIMIT = 8;
const FOLLOWING_SHEET_LINE_ITEM_LIMIT = 14;
const MAX_PRINTABLE_LINE_ITEMS = 36;

export interface PaymentReceiptDocumentInput {
  brandName: string;
  locale: string;
  orderRef: string;
  issuedAt: Date;
  customerEmail: string;
  senderName: string;
  recipientName: string;
  deliveryType: string;
  amountCents: number;
  currency: string;
  lineItems: ReceiptLineItem[];
  supportEmail: string;
  statementRetentionDays: number;
  statusUrl: string;
  legalEntity: ReceiptLegalEntity;
  stripeReferences?: StripeReferences | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateTime(locale: string, value: Date): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Zurich",
  }).format(value);
}

function renderLineItems(lineItems: ReceiptLineItem[]): string {
  return lineItems
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.label)}</td>
          <td class="amount">${formatCHF(item.amountCents)}</td>
        </tr>
      `,
    )
    .join("");
}

function getPrintableLineItems(lineItems: ReceiptLineItem[]): {
  printableLineItems: ReceiptLineItem[];
  omittedCount: number;
} {
  if (lineItems.length <= MAX_PRINTABLE_LINE_ITEMS) {
    return {
      printableLineItems: lineItems,
      omittedCount: 0,
    };
  }

  return {
    printableLineItems: lineItems.slice(0, MAX_PRINTABLE_LINE_ITEMS),
    omittedCount: lineItems.length - MAX_PRINTABLE_LINE_ITEMS,
  };
}

function chunkLineItems(lineItems: ReceiptLineItem[]): ReceiptLineItem[][] {
  if (lineItems.length === 0) {
    return [[]];
  }

  const chunks: ReceiptLineItem[][] = [];
  let cursor = 0;
  let limit = FIRST_SHEET_LINE_ITEM_LIMIT;

  while (cursor < lineItems.length) {
    chunks.push(lineItems.slice(cursor, cursor + limit));
    cursor += limit;
    limit = FOLLOWING_SHEET_LINE_ITEM_LIMIT;
  }

  return chunks;
}

function renderSummaryCard(label: string, value: string): string {
  return `
    <dl class="card">
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </dl>
  `;
}

function renderSummary(input: PaymentReceiptDocumentInput): string {
  return `
    <section class="summary">
      ${renderSummaryCard("Receipt number", input.orderRef)}
      ${renderSummaryCard("Issued on", formatDateTime(input.locale, input.issuedAt))}
      ${renderSummaryCard("Amount charged", formatCHF(input.amountCents))}
      ${renderSummaryCard("Delivery type", formatDeliveryType(input.deliveryType))}
      ${renderSummaryCard("Sender", input.senderName)}
      ${renderSummaryCard("Recipient", input.recipientName)}
    </section>
  `;
}

function renderActionLink(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
}

function renderDocumentAccessSection(input: PaymentReceiptDocumentInput): string {
  return `
    <section class="section">
      <h2>Document access</h2>
      <dl class="meta-list">
        <div class="meta-row">
          <dt>Signed dispatch statement</dt>
          <dd>
            ${renderActionLink(input.statusUrl, "Open order status")}<br>
            <span class="meta-note">Available for ${escapeHtml(String(input.statementRetentionDays))} days from payment confirmation.</span>
          </dd>
        </div>
        <div class="meta-row">
          <dt>Support</dt>
          <dd>
            <a href="mailto:${escapeHtml(input.supportEmail)}">${escapeHtml(input.supportEmail)}</a><br>
            <span class="meta-note">For questions about this receipt, payment, or dispatch status.</span>
          </dd>
        </div>
      </dl>
    </section>
  `;
}

function renderLineItemSection(options: {
  title: string;
  lineItems: ReceiptLineItem[];
  currency: string;
  amountCents: number;
  isFinalChunk: boolean;
  continuationNote?: string;
}): string {
  return `
    <section class="section section-table">
      <h2>${escapeHtml(options.title)}</h2>
      <table>
        <tbody>
          ${renderLineItems(options.lineItems)}
          ${
            options.isFinalChunk
              ? `
                <tr class="total-row">
                  <td>Total charged (${escapeHtml(options.currency)})</td>
                  <td class="amount">${formatCHF(options.amountCents)}</td>
                </tr>
              `
              : ""
          }
        </tbody>
      </table>
      ${
        options.continuationNote
          ? `<p class="section-note">${escapeHtml(options.continuationNote)}</p>`
          : ""
      }
    </section>
  `;
}

function renderHeader(input: PaymentReceiptDocumentInput): string {
  return `
    <header class="header">
      <div>
        <div class="brand">${escapeHtml(input.brandName)}</div>
        <h1>Payment receipt</h1>
        <p class="lede">
          Merchant-issued receipt for outbound letter dispatch linked to
          receipt number ${escapeHtml(input.orderRef)}.
        </p>
      </div>
      <aside class="issuer">
        <strong>${escapeHtml(input.legalEntity.name)}</strong><br>
        ${input.legalEntity.addressLines.map((line) => escapeHtml(line)).join("<br>")}<br>
        UID / VAT: ${escapeHtml(input.legalEntity.uidVat)}
      </aside>
    </header>
  `;
}

function renderContinuationHeader(title: string, brandName: string): string {
  return `
    <header class="subheader">
      <div class="brand">${escapeHtml(brandName)}</div>
      <h2 class="sheet-title">${escapeHtml(title)}</h2>
    </header>
  `;
}

function renderSheet(content: string): string {
  return `<section class="sheet">${content}</section>`;
}

function formatDeliveryType(value: string): string {
  switch (value) {
    case "registered":
      return "Registered mail";
    case "standard":
      return "Standard mail";
    default:
      return value;
  }
}

export function renderPaymentReceiptDocumentHtml(
  input: PaymentReceiptDocumentInput,
): string {
  const { printableLineItems, omittedCount } = getPrintableLineItems(input.lineItems);
  const lineItemChunks = chunkLineItems(printableLineItems);
  const canInlineClosingSectionOnFirstSheet =
    lineItemChunks.length === 1 &&
    printableLineItems.length <= FIRST_SHEET_LINE_ITEM_LIMIT &&
    omittedCount === 0;
  const sheets: string[] = [];

  sheets.push(
    renderSheet(
      [
        renderHeader(input),
        renderSummary(input),
        renderLineItemSection({
          title: "Charged amount",
          lineItems: lineItemChunks[0] ?? [],
          currency: input.currency,
          amountCents: input.amountCents,
          isFinalChunk: lineItemChunks.length === 1,
          ...(lineItemChunks.length > 1
            ? {
                continuationNote:
                  "Additional receipt detail continues on the next page.",
              }
            : {}),
        }),
        canInlineClosingSectionOnFirstSheet ? renderDocumentAccessSection(input) : "",
      ]
        .filter(Boolean)
        .join(""),
    ),
  );

  for (const [index, chunk] of lineItemChunks.slice(1).entries()) {
    const isLastChunk = index === lineItemChunks.slice(1).length - 1;
    sheets.push(
      renderSheet(
        [
          renderContinuationHeader("Receipt details (continued)", input.brandName),
          renderLineItemSection({
            title: "Charged amount",
            lineItems: chunk,
            currency: input.currency,
            amountCents: input.amountCents,
            isFinalChunk: isLastChunk,
            ...(isLastChunk && omittedCount > 0
              ? {
                  continuationNote: `${omittedCount} additional low-priority line items were omitted from the print appendix after the standard threshold.`,
                }
              : {}),
          }),
        ].join(""),
      ),
    );
  }

  if (!canInlineClosingSectionOnFirstSheet) {
    sheets.push(
      renderSheet(
        [
          renderContinuationHeader("Document access and support", input.brandName),
          renderDocumentAccessSection(input),
          omittedCount > 0
            ? `<p class="section-note">Printed detail is capped at ${MAX_PRINTABLE_LINE_ITEMS} line items for clean A4 output.</p>`
            : "",
        ]
          .filter(Boolean)
          .join(""),
      ),
    );
  }

  return `<!DOCTYPE html>
<html lang="${escapeHtml(input.locale)}">
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      font-family: "Helvetica Neue", Arial, sans-serif;
      background: #f3efe5;
      color: #18181b;
    }
    .sheet {
      min-height: 297mm;
      padding: 15mm 14mm 12mm;
      background:
        radial-gradient(circle at top right, rgba(246, 197, 74, 0.18), transparent 32%),
        linear-gradient(180deg, #fffdf8 0%, #f8f3e8 100%);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      page-break-after: always;
    }
    .sheet:last-of-type {
      page-break-after: auto;
    }
    .header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 220px;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .brand {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #7c5d13;
      margin-bottom: 6px;
    }
    h1 {
      margin: 0;
      font-size: 26px;
      line-height: 1.05;
    }
    .subheader {
      margin-bottom: 12px;
    }
    .sheet-title {
      margin: 0;
      font-size: 22px;
      line-height: 1.1;
    }
    .lede {
      max-width: 380px;
      margin: 6px 0 0;
      font-size: 12px;
      line-height: 1.45;
      color: #3f3f46;
      overflow-wrap: anywhere;
    }
    .issuer {
      min-width: 220px;
      padding: 12px 14px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.82);
      border: 1px solid rgba(24, 24, 27, 0.08);
      font-size: 12px;
      line-height: 1.4;
      break-inside: avoid;
      page-break-inside: avoid;
      overflow-wrap: anywhere;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin: 12px 0;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .card,
    .section {
      border-radius: 22px;
      background: rgba(255, 255, 255, 0.88);
      border: 1px solid rgba(24, 24, 27, 0.08);
      padding: 12px 14px;
    }
    .card {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .card dt,
    .meta-row dt {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #71717a;
      margin-bottom: 4px;
    }
    .card dd,
    .meta-row dd {
      margin: 0;
      font-size: 13px;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .section {
      margin-top: 8px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .section-table {
      break-inside: auto;
      page-break-inside: auto;
    }
    .section h2 {
      margin: 0 0 10px;
      font-size: 13px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #71717a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    tbody {
      break-inside: auto;
      page-break-inside: auto;
    }
    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    th,
    td {
      padding: 6px 0;
      border-bottom: 1px solid rgba(24, 24, 27, 0.08);
      text-align: left;
      vertical-align: top;
    }
    td:first-child {
      padding-right: 12px;
      overflow-wrap: anywhere;
    }
    .amount {
      text-align: right;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    .total-row td {
      padding-top: 10px;
      border-bottom: none;
      font-size: 15px;
      font-weight: 700;
    }
    .meta-list {
      margin: 0;
    }
    .meta-row {
      display: grid;
      grid-template-columns: 180px minmax(0, 1fr);
      gap: 12px;
      padding: 4px 0;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    a {
      color: #7c5d13;
      text-decoration: none;
      overflow-wrap: anywhere;
    }
    .meta-note,
    .section-note {
      color: #52525b;
      font-size: 12px;
      line-height: 1.5;
    }
    .section-note {
      margin: 10px 0 0;
    }
  </style>
</head>
<body>
  ${sheets.join("")}
</body>
</html>`;
}
