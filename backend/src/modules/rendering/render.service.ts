/**
 * PDF rendering pipeline.
 *
 * Uses Puppeteer to convert HTML letter content to PDF.
 *
 * Pipeline:
 * 1. Load snapshot data (letter content, addresses, metadata)
 * 2. Render HTML from template + snapshot
 * 3. Generate PDF via Puppeteer (A4 format)
 * 4. Upload to object storage
 * 5. Create file_asset record
 * 6. Link PDF to snapshot
 */

import puppeteer from "puppeteer-core";
import type { Browser } from "puppeteer-core";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { createFileAsset, renderStorageKey } from "../files/file.service.js";
import { uploadObject } from "../files/adapters/s3.adapter.js";
import { setSnapshotPdfAsset } from "./snapshot.service.js";
import { createLogger } from "../../shared/logging/index.js";

const logger = createLogger("render-service");

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface RenderResult {
  pdfAssetId: string;
  storageKey: string;
  sizeBytes: number;
  pageCount: number;
}

// ---------------------------------------------------------------------------
// Browser management — lazy singleton
// ---------------------------------------------------------------------------

let _browser: Browser | undefined;

async function getBrowser(): Promise<Browser> {
  if (_browser?.connected) return _browser;

  // In production, use the system Chromium.
  // PUPPETEER_EXECUTABLE_PATH env var controls the binary location.
  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ??
    "/usr/bin/chromium-browser";

  _browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
  return _browser;
}

export async function closeBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close();
    _browser = undefined;
  }
}

// ---------------------------------------------------------------------------
// Snapshot data shape (matches database-schema.md §4.3)
// ---------------------------------------------------------------------------

interface SnapshotData {
  schemaVersion: number;
  locale: string;
  deliveryType: string;
  subject?: string | null;
  body?: string | null;
  enclosureNote?: string | null;
  signatureMode?: string | null;
  tone?: string | null;
  intent?: string | null;
  sender?: {
    firstName: string;
    lastName: string;
    company?: string | null;
    addressLine1: string;
    addressLine2?: string | null;
    postalCode: string;
    city: string;
    country: string;
  } | null;
  recipient?: {
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
    department?: string | null;
    addressLine1: string;
    addressLine2?: string | null;
    postalCode: string;
    city: string;
    country: string;
  } | null;
  metadata?: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// HTML letter template (Swiss DIN 5008 / SN 010 130 inspired)
// ---------------------------------------------------------------------------

function renderLetterHtml(data: SnapshotData): string {
  const sender = data.sender;
  const recipient = data.recipient;
  const today = new Date().toLocaleDateString(data.locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const senderBlock = sender
    ? [
        sender.company,
        `${sender.firstName} ${sender.lastName}`,
        sender.addressLine1,
        sender.addressLine2,
        `${sender.postalCode} ${sender.city}`,
      ]
        .filter(Boolean)
        .map((l) => escapeHtml(l!))
        .join("<br>")
    : "";

  const recipientBlock = recipient
    ? [
        recipient.company,
        recipient.department,
        [recipient.firstName, recipient.lastName].filter(Boolean).join(" ") || null,
        recipient.addressLine1,
        recipient.addressLine2,
        `${recipient.postalCode} ${recipient.city}`,
      ]
        .filter(Boolean)
        .map((l) => escapeHtml(l!))
        .join("<br>")
    : "";

  return `<!DOCTYPE html>
<html lang="${escapeHtml(data.locale)}">
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 25mm 25mm 30mm 25mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
    }
    .sender-block {
      font-size: 9pt;
      color: #666;
      margin-bottom: 20mm;
    }
    .recipient-block {
      min-height: 30mm;
      margin-bottom: 10mm;
    }
    .date-line {
      text-align: right;
      margin-bottom: 15mm;
    }
    .subject-line {
      font-weight: bold;
      margin-bottom: 8mm;
    }
    .letter-body {
      white-space: pre-wrap;
      margin-bottom: 10mm;
    }
    .enclosure-note {
      font-size: 9pt;
      color: #666;
      margin-top: 15mm;
      border-top: 1px solid #ccc;
      padding-top: 3mm;
    }
  </style>
</head>
<body>
  <div class="sender-block">${senderBlock}</div>
  <div class="recipient-block">${recipientBlock}</div>
  <div class="date-line">${escapeHtml(today)}</div>
  ${data.subject ? `<div class="subject-line">${escapeHtml(data.subject)}</div>` : ""}
  <div class="letter-body">${escapeHtml(data.body ?? "")}</div>
  ${data.enclosureNote ? `<div class="enclosure-note">${escapeHtml(data.enclosureNote)}</div>` : ""}
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Main render function
// ---------------------------------------------------------------------------

export async function renderSnapshotToPdf(
  snapshotId: string,
): Promise<RenderResult> {
  const db = getDb();

  // 1. Load snapshot
  const [snapshot] = await db
    .select()
    .from(schema.draftSnapshots)
    .where(eq(schema.draftSnapshots.id, snapshotId))
    .limit(1);

  if (!snapshot) {
    throw new Error(`Snapshot not found: ${snapshotId}`);
  }

  const snapshotData = snapshot.snapshotData as SnapshotData;

  // 2. Render HTML
  const html = renderLetterHtml(snapshotData);

  // 3. Generate PDF via Puppeteer
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "25mm",
        right: "25mm",
        bottom: "30mm",
        left: "25mm",
      },
    });

    // Estimate page count from PDF byte boundaries
    // A rough heuristic: count /Type /Page occurrences in the PDF
    const pdfStr = Buffer.from(pdfBuffer).toString("latin1");
    const pageCount = Math.max(
      1,
      (pdfStr.match(/\/Type\s*\/Page[^s]/g) || []).length,
    );

    // 4. Upload to storage
    const storageKey = renderStorageKey(snapshot.draftId, snapshot.version);
    await uploadObject(storageKey, Buffer.from(pdfBuffer), "application/pdf");

    // 5. Get session ID for file asset
    const [draft] = await db
      .select({ sessionId: schema.draftLetters.sessionId })
      .from(schema.draftLetters)
      .where(eq(schema.draftLetters.id, snapshot.draftId))
      .limit(1);

    if (!draft) {
      throw new Error(`Draft not found: ${snapshot.draftId}`);
    }

    const fileAsset = await createFileAsset(db, {
      sessionId: draft.sessionId,
      draftId: snapshot.draftId,
      kind: "rendered_pdf",
      storageKey,
      originalFilename: `letter-v${snapshot.version}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: pdfBuffer.byteLength,
    });

    // 6. Link PDF to snapshot
    await setSnapshotPdfAsset(db, snapshotId, fileAsset.id);

    logger.info(
      {
        snapshotId,
        draftId: snapshot.draftId,
        version: snapshot.version,
        pageCount,
        sizeBytes: pdfBuffer.byteLength,
      },
      "PDF rendered successfully",
    );

    return {
      pdfAssetId: fileAsset.id,
      storageKey,
      sizeBytes: pdfBuffer.byteLength,
      pageCount,
    };
  } finally {
    await page.close();
  }
}
