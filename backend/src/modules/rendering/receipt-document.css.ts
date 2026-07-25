import { BRAND_COLOR } from "../../shared/brand.js";

export const RECEIPT_DOCUMENT_CSS = `@page {
      size: A4;
      margin: 0;
    }
    :root {
      --ink: #161616;
      --muted: #5d5a54;
      --hairline: #b9b3a7;
      --amber: ${BRAND_COLOR};
      --serif: "Source Serif 4", Georgia, "Times New Roman", serif;
      --sans: "Source Sans 3", "Helvetica Neue", Arial, sans-serif;
      --mono: "IBM Plex Mono", "SFMono-Regular", Menlo, Consolas, monospace;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: var(--sans);
      color: var(--ink);
      background: #ffffff;
    }
    .receipt-page {
      min-height: 297mm;
      padding: 20mm 22mm 18mm;
    }
    .eyebrow {
      font-family: var(--sans);
      font-size: 8pt;
      font-weight: 600;
      letter-spacing: 0.01em;
      color: var(--muted);
    }
    /* --- Masthead --- */
    .masthead {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12mm;
    }
    .masthead-brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .masthead-wordmark {
      font-family: var(--serif);
      font-size: 15pt;
      font-weight: 600;
      letter-spacing: -0.01em;
      text-transform: none;
      color: var(--ink);
      line-height: 1;
    }
    .masthead-title {
      margin: 6px 0 0;
      font-family: var(--serif);
      font-size: 24pt;
      font-weight: 600;
      line-height: 1.05;
      color: var(--ink);
    }
    .masthead-date {
      font-size: 9pt;
      color: var(--muted);
      text-align: right;
      padding-top: 2px;
    }
    /* --- Rules --- */
    .anchor-rule {
      height: 1.5pt;
      background: var(--ink);
      margin: 10pt 0 0;
    }
    .hairline {
      height: 0.5pt;
      background: var(--hairline);
      border: 0;
    }
    /* --- Header band --- */
    .header-band {
      display: flex;
      justify-content: space-between;
      gap: 16mm;
      margin-top: 20pt;
    }
    .issuer-block {
      font-size: 9.5pt;
      line-height: 1.5;
    }
    .issuer-name { font-weight: 600; }
    .issuer-vat {
      font-family: var(--mono);
      font-size: 8.5pt;
      color: var(--muted);
      margin-top: 3px;
    }
    .meta-block {
      text-align: right;
      min-width: 58mm;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: 5pt;
    }
    .meta-row:first-child { margin-top: 0; }
    .meta-label {
      font-size: 8.5pt;
      font-weight: 600;
      letter-spacing: 0.01em;
      color: var(--muted);
      white-space: nowrap;
    }
    .meta-value {
      font-size: 10pt;
      color: var(--ink);
    }
    .meta-value.mono {
      font-family: var(--mono);
      font-size: 9pt;
    }
    /* --- Line items --- */
    .items {
      margin-top: 28pt;
    }
    .col-heads {
      display: flex;
      justify-content: space-between;
      margin: 6pt 0 0;
    }
    .col-heads .eyebrow:last-child { text-align: right; }
    .line-row,
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      padding: 7pt 0;
      font-size: 10pt;
    }
    .line-row {
      border-bottom: 0.5pt solid var(--hairline);
    }
    .line-label { color: var(--ink); }
    .line-amount,
    .total-amount {
      font-variant-numeric: tabular-nums;
    }
    /* --- Totals --- */
    .totals {
      margin-top: 6pt;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .totals-inner {
      width: 72mm;
      border-top: 1pt solid var(--ink);
      padding-top: 6pt;
    }
    .total-row {
      padding: 3pt 0;
    }
    .total-label { color: var(--muted); }
    .total-amount { color: var(--ink); }
    .discount-row .total-amount { color: var(--ink); }
    .grand-total {
      margin-top: 4pt;
      padding-top: 7pt;
      align-items: baseline;
    }
    .grand-total .total-label {
      font-family: var(--serif);
      font-size: 13pt;
      font-weight: 600;
      color: var(--ink);
    }
    .grand-total .total-amount {
      font-size: 13pt;
      font-weight: 700;
    }
    /* fiscal double-rule under just the amount: 0.5pt + 1.5pt gap + 0.5pt */
    .fiscal-rule {
      width: 72mm;
      display: flex;
      justify-content: flex-end;
    }
    .fiscal-rule-inner {
      width: 34mm;
      margin-top: 2pt;
    }
    .fiscal-rule-inner .fr {
      display: block;
      height: 0.5pt;
      background: var(--ink);
    }
    .fiscal-rule-inner .fr-gap {
      display: block;
      height: 1.5pt;
    }
    /* --- Footer --- */
    .footer {
      margin-top: 24pt;
    }
    .footer p {
      margin: 6pt 0 0;
      font-size: 7.5pt;
      line-height: 1.5;
      color: var(--muted);
    }`;
