import { BRAND_COLOR } from "../../shared/brand.js";

export const CONFIRMATION_DOCUMENT_CSS = `@page {
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
    .confirmation-page {
      min-height: 297mm;
      padding: 14mm 14mm 12mm;
      display: flex;
      flex-direction: column;
      gap: 8mm;
    }
    .header-card,
    .hero-card,
    .section-card,
    .party-card,
    .meta-card,
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
    .label,
    .reference-meta-label,
    .header-meta-label {
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
    .header-meta-value,
    .fact-value,
    .meta-value,
    .party-value,
    .reference-value,
    .footer-note p {
      word-break: break-word;
    }
    .header-meta-value {
      font-size: 11pt;
      line-height: 1.35;
      font-weight: 700;
      color: var(--pdf-text);
    }
    .fact-card,
    .reference-card {
      break-inside: avoid;
      page-break-inside: avoid;
      border: 1px solid var(--pdf-border);
      border-radius: 16px;
      background: var(--pdf-surface);
    }
    .fact-card,
    .party-card,
    .meta-card,
    .reference-card {
      padding: 8mm;
    }
    .facts-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px 16px;
    }
    .reference-card {
      background: var(--pdf-surface-soft);
      border-color: var(--pdf-border-strong);
    }
    .reference-value {
      font-size: 18pt;
      line-height: 1.15;
      font-weight: 900;
      color: var(--pdf-text);
    }
    .tracking-value {
      color: #18181b;
      font-weight: 900;
      letter-spacing: 0.02em;
    }
    .value-muted {
      color: var(--pdf-muted);
      font-weight: 500;
    }
    .reference-meta {
      margin: 10px 0 0;
      font-size: 9pt;
      line-height: 1.5;
      color: var(--pdf-muted-strong);
    }
    .fact-value,
    .meta-value,
    .party-value {
      font-size: 10.75pt;
      line-height: 1.55;
      font-weight: 700;
      color: var(--pdf-text);
    }
    .parties-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 12px 14px;
    }
    .footer-note {
      padding: 6mm 8mm;
      background: var(--pdf-surface-soft);
    }
    .footer-note p {
      margin: 0;
      font-size: 9.25pt;
      line-height: 1.55;
      color: var(--pdf-muted-strong);
    }
    .tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .tag {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 0 10px;
      border-radius: 999px;
      background: var(--pdf-surface-soft);
      border: 1px solid var(--pdf-border);
      font-size: 9pt;
      font-weight: 600;
      color: var(--pdf-text);
    }
    .page-break {
      page-break-before: always;
    }
    .section-card {
      padding: 7mm 8mm;
    }
    .attestation-text,
    .summary-text {
      margin: 6px 0 0;
      font-size: 10pt;
      line-height: 1.6;
      color: var(--pdf-muted-strong);
    }
    .summary-text strong {
      color: var(--pdf-text);
    }
    .issuer-line {
      margin: 8px 0 0;
      padding-top: 8px;
      border-top: 1px solid var(--pdf-border);
      font-size: 8.75pt;
      line-height: 1.5;
      color: var(--pdf-muted);
    }
    .reference-deposit {
      font-weight: 700;
      color: var(--pdf-text);
    }
    .reference-deposit .reference-meta-label {
      color: var(--pdf-muted);
    }
    .fingerprint-card {
      background: var(--pdf-surface-soft);
      border-color: var(--pdf-border-strong);
    }
    .hash-value {
      font-family: "SFMono-Regular", "Menlo", "Consolas", "Liberation Mono", monospace;
      font-size: 8.5pt;
      line-height: 1.5;
      color: var(--pdf-text);
      word-break: break-all;
    }
    .hash-value-primary {
      margin: 6px 0 0;
      font-size: 9.5pt;
      font-weight: 700;
    }
    .hash-note {
      margin: 6px 0 0;
      font-size: 8.75pt;
      line-height: 1.5;
      color: var(--pdf-muted);
    }
    .enclosure-hashes {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--pdf-border);
    }
    .hash-row {
      margin: 4px 0 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .hash-name {
      font-size: 8.5pt;
      font-weight: 600;
      color: var(--pdf-muted-strong);
    }`;
