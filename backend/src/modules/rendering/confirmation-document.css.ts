import { BRAND_COLOR } from "../../shared/brand.js";

export const CONFIRMATION_DOCUMENT_CSS = `@page {
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
    .confirmation-page {
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
    .ref-tag {
      font-family: var(--sans);
      font-size: 7pt;
      font-weight: 600;
      letter-spacing: 0;
      color: var(--muted);
      white-space: nowrap;
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
      margin: 0;
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
      gap: 10px;
    }
    .masthead-wordmark {
      font-family: var(--serif);
      font-size: 16pt;
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
      white-space: nowrap;
    }
    .masthead-date {
      font-size: 8pt;
      color: var(--muted);
      text-align: right;
      padding-top: 2px;
      white-space: nowrap;
    }
    /* --- Zone A: envoi --- */
    .zone {
      margin-top: 28pt;
    }
    .zone .eyebrow + .hero-tracking { margin-top: 6pt; }
    .hero-tracking {
      font-family: var(--mono);
      font-size: 15pt;
      font-weight: 500;
      color: var(--ink);
      word-break: break-all;
    }
    .fact-row {
      display: flex;
      gap: 8mm;
      margin-top: 16pt;
    }
    .fact-col {
      flex: 1 1 0;
      min-width: 0;
    }
    .fact-col .eyebrow { display: block; margin-bottom: 5pt; }
    .fact-value {
      font-size: 10pt;
      line-height: 1.4;
      color: var(--ink);
    }
    .fact-value.mono {
      font-family: var(--mono);
      font-size: 8.5pt;
      color: var(--muted);
      word-break: break-all;
    }
    .status-line {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-dot {
      display: inline-block;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--amber);
      flex: 0 0 auto;
    }
    .status-label {
      font-size: 10pt;
      font-weight: 600;
      color: var(--ink);
    }
    .value-muted {
      color: var(--muted);
    }
    /* --- Zone B: parties + content --- */
    .parties {
      display: flex;
      gap: 8mm;
    }
    .party {
      flex: 1 1 50%;
      min-width: 0;
    }
    .party .eyebrow { display: block; margin-bottom: 6pt; }
    .party-value {
      font-size: 10pt;
      line-height: 1.5;
      color: var(--ink);
    }
    .party-value .party-name { font-weight: 600; }
    .ledger-row {
      display: flex;
      gap: 10mm;
      margin-top: 12pt;
      align-items: baseline;
    }
    .ledger-label {
      flex: 0 0 42mm;
      font-size: 8.5pt;
      font-weight: 600;
      letter-spacing: 0.01em;
      color: var(--muted);
      padding-top: 1pt;
    }
    .ledger-value {
      flex: 1 1 0;
      min-width: 0;
      font-size: 10pt;
      line-height: 1.5;
      color: var(--ink);
    }
    .enclosure-list .enc-name {
      font-family: var(--mono);
      font-size: 9pt;
    }
    .enclosure-list .enc-count {
      color: var(--muted);
    }
    .enclosure-sep { color: var(--muted); }
    /* --- Zone C: certification --- */
    .cert-anchor {
      height: 1.5pt;
      background: var(--ink);
      margin: 28pt 0 0;
    }
    .attestation-text {
      margin: 6pt 0 0;
      font-family: var(--serif);
      font-size: 10.5pt;
      line-height: 1.6;
      color: var(--ink);
    }
    .issuer-line {
      margin: 14pt 0 0;
      font-size: 8.5pt;
      line-height: 1.5;
      color: var(--muted);
    }
    .issuer-line .issuer-name {
      font-weight: 600;
      color: var(--ink);
    }
    .issuer-basis {
      margin: 4pt 0 0;
      font-size: 7.5pt;
      font-style: italic;
      color: var(--muted);
    }
    .fingerprint {
      margin-top: 20pt;
    }
    .fingerprint .eyebrow { display: inline; }
    .fingerprint-note {
      margin: 4pt 0 0;
      font-size: 7pt;
      line-height: 1.4;
      color: var(--muted);
    }
    .hash-block {
      margin-top: 8pt;
    }
    .hash-name {
      font-family: var(--mono);
      font-size: 8pt;
      font-weight: 500;
      color: var(--ink);
    }
    .hash-value {
      font-family: var(--mono);
      font-size: 7.5pt;
      font-weight: 400;
      line-height: 1.5;
      color: var(--muted);
      word-break: break-all;
      margin: 1pt 0 0;
    }
    .hash-entry { margin-top: 6pt; }
    /* --- Footer --- */
    .footer {
      margin-top: 24pt;
    }
    .footer-inner {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-top: 6pt;
      gap: 8mm;
    }
    .footer-note-text {
      font-size: 7pt;
      line-height: 1.5;
      color: var(--muted);
      flex: 1 1 0;
    }
    .footer-page {
      font-size: 7pt;
      color: var(--muted);
      white-space: nowrap;
    }
    .page-break {
      page-break-before: always;
    }`;
