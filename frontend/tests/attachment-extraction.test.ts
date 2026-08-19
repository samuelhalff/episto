import { describe, expect, it } from "vitest";
import type { FileAsset } from "@episto/shared";

import {
  extractionChip,
  extractionMessageKey,
  isAttachmentExtractionInProgress,
  summarizeAttachmentExtraction,
} from "../src/components/product/attachment-extraction";

import deCH from "../src/messages/de-CH.json";
import frCH from "../src/messages/fr-CH.json";
import itCH from "../src/messages/it-CH.json";
import enCH from "../src/messages/en-CH.json";

type ExtractionStatus = FileAsset["extractionStatus"];

/** Every value the backend can put in `file_assets.extraction_status`. */
const ALL_STATUSES = [
  "pending",
  "ocr_running",
  "extracted",
  "empty",
  "unsupported",
  "no_ocr",
  "too_long",
  "budget",
  "failed",
  null,
  undefined,
] as const;

const LOCALES = {
  "de-CH": deCH,
  "fr-CH": frCH,
  "it-CH": itCH,
  "en-CH": enCH,
} as const;

function attachment(extractionStatus: ExtractionStatus): FileAsset {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    sessionId: "00000000-0000-0000-0000-000000000000",
    draftId: null,
    kind: "attachment",
    storageKey: "attachments/x",
    originalFilename: "contract.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1,
    sortOrder: 0,
    status: "active",
    extractionStatus,
    deletedAt: null,
    createdAt: new Date(),
  } as FileAsset;
}

function lookup(messages: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[key]
          : undefined,
      messages,
    );
}

/**
 * User story: "I attached my mobile contract. Whatever the attachments screen
 * tells me about it, the chat screen has to tell me the same thing." Two
 * screens answering "did the assistant read this?" differently is worse than
 * either answer alone, so both read from this one module.
 */
describe("extractionChip", () => {
  it("maps every backend status to a chip, with no unhandled status", () => {
    for (const status of ALL_STATUSES) {
      const chip = extractionChip(status as ExtractionStatus);
      expect(
        chip === null ||
          ["reading", "readingImage", "read", "couldNotRead"].includes(chip),
        `unhandled status: ${String(status)}`,
      ).toBe(true);
    }
  });

  it("treats an unreadable document as unreadable, not as absent", () => {
    // These are the statuses a photo or a scan lands on when OCR is not
    // available — the user must not be left thinking the file was used.
    for (const status of [
      "empty",
      "unsupported",
      "no_ocr",
      "too_long",
      "budget",
      "failed",
    ]) {
      expect(extractionChip(status as ExtractionStatus)).toBe("couldNotRead");
    }
  });

  it("says nothing when the status is unknown rather than inventing one", () => {
    expect(extractionChip(null)).toBeNull();
    expect(extractionChip(undefined)).toBeNull();
  });
});

describe("summarizeAttachmentExtraction", () => {
  it("shows nothing when there are no attachments", () => {
    expect(summarizeAttachmentExtraction([])).toBeNull();
  });

  /**
   * The composer has room for one badge. A document we could not read is the
   * one thing the user has to hear about, so it outranks the successes — but
   * work still in flight outranks it, because the failure is not final yet.
   */
  it("surfaces work in progress over a failure, and a failure over a success", () => {
    expect(
      summarizeAttachmentExtraction([attachment("extracted"), attachment("failed")]),
    ).toBe("couldNotRead");

    expect(
      summarizeAttachmentExtraction([attachment("failed"), attachment("pending")]),
    ).toBe("reading");

    expect(
      summarizeAttachmentExtraction([attachment("pending"), attachment("ocr_running")]),
    ).toBe("readingImage");
  });

  it("confirms the assistant read the documents when they all came through", () => {
    expect(
      summarizeAttachmentExtraction([attachment("extracted"), attachment("extracted")]),
    ).toBe("read");
  });

  it("stays silent when the only attachment has no status yet", () => {
    expect(summarizeAttachmentExtraction([attachment(null)])).toBeNull();
  });
});

describe("isAttachmentExtractionInProgress", () => {
  it("blocks leaving the attachment step while a file is still being read", () => {
    expect(isAttachmentExtractionInProgress([attachment("pending")] as FileAsset[])).toBe(
      true,
    );
    expect(
      isAttachmentExtractionInProgress([attachment("ocr_running")] as FileAsset[]),
    ).toBe(true);
  });

  it("allows terminal readable and unreadable outcomes to continue", () => {
    expect(isAttachmentExtractionInProgress([attachment("extracted")])).toBe(false);
    expect(isAttachmentExtractionInProgress([attachment("no_ocr")])).toBe(false);
    expect(isAttachmentExtractionInProgress([attachment("failed")])).toBe(false);
  });
});

/**
 * A chip or message with no translation renders as a raw key like
 * `extraction.couldNotRead` — which is exactly the moment the user is being
 * told something went wrong. Every branch must resolve in all four locales.
 */
describe("translation coverage", () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`resolves every chip and message in ${locale}`, () => {
      for (const status of ALL_STATUSES) {
        const chip = extractionChip(status as ExtractionStatus);
        if (chip) {
          expect(
            lookup(messages, `files.extraction.${chip}`),
            `${locale}: ${chip}`,
          ).toEqual(expect.any(String));
        }

        const messageKey = extractionMessageKey(status as ExtractionStatus);
        if (messageKey) {
          expect(
            lookup(messages, `files.${messageKey}`),
            `${locale}: ${messageKey}`,
          ).toEqual(expect.any(String));
        }
      }
    });
  }
});
