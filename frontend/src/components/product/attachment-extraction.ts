import type { FileAsset } from "@episto/shared";

/**
 * Shared vocabulary for "can the assistant actually read this document?".
 *
 * The attachments step and the chat composer both have to answer that question,
 * and they have to answer it the same way — a file that reads as "Could not
 * read" on one screen must not look fine on the other.
 */
export type ExtractionChip = "reading" | "readingImage" | "read" | "couldNotRead" | null;

/** Whether the draft must wait before an attachment can inform its first draft. */
export function isAttachmentExtractionInProgress(attachments: FileAsset[]): boolean {
  return attachments.some(
    (file) =>
      file.extractionStatus === "pending" || file.extractionStatus === "ocr_running",
  );
}

export function extractionChip(status: FileAsset["extractionStatus"]): ExtractionChip {
  switch (status) {
    case "pending":
      return "reading";
    case "ocr_running":
      return "readingImage";
    case "extracted":
      return "read";
    case null:
    case undefined:
      return null;
    default:
      return "couldNotRead"; // empty | unsupported | no_ocr | too_long | budget | failed
  }
}

/** The inline explanation shown under a document, keyed into the `files` namespace. */
export function extractionMessageKey(
  status: FileAsset["extractionStatus"],
): string | null {
  switch (status) {
    case "ocr_running":
      return "extraction.msg.ocrRunning";
    case "too_long":
      return "extraction.msg.tooLong";
    case "budget":
      return "extraction.msg.budget";
    case "failed":
      return "extraction.msg.failed";
    case "no_ocr":
    case "empty":
    case "unsupported":
      return "extraction.msg.noOcr";
    default:
      return null; // pending | extracted | none
  }
}

/**
 * Collapse a draft's attachments into the single state worth showing next to
 * the composer, where there is only room for one badge.
 *
 * Ordered by what the user needs to act on: something still being read outranks
 * a failure (the failure may not be final), and a failure outranks a success
 * (a document we could not read is the one thing they have to hear about).
 */
export function summarizeAttachmentExtraction(attachments: FileAsset[]): ExtractionChip {
  const chips = attachments.map((file) => extractionChip(file.extractionStatus));
  if (chips.includes("readingImage")) return "readingImage";
  if (chips.includes("reading")) return "reading";
  if (chips.includes("couldNotRead")) return "couldNotRead";
  if (chips.includes("read")) return "read";
  return null;
}
