import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import deCH from "../src/messages/de-CH.json";
import enCH from "../src/messages/en-CH.json";
import frCH from "../src/messages/fr-CH.json";
import itCH from "../src/messages/it-CH.json";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const bodyStepSource = read("frontend/src/components/product/draft-flow/BodyStep.tsx");
const bodyStepControllerSource = read(
  "frontend/src/components/product/draft-flow/useBodyStepController.ts",
);
const attachmentSyncSource = read(
  "frontend/src/components/product/draft-flow/use-attachment-draft-sync.ts",
);
const uploaderSource = read("frontend/src/components/product/AttachmentUploader.tsx");
const reviewPageSource = read(
  "frontend/src/components/product/review/ReviewPageReady.tsx",
);
const enclosureSuggestionSource = read(
  "frontend/src/components/product/review/EnclosureNoteSuggestion.tsx",
);

const LOCALES = { "de-CH": deCH, "en-CH": enCH, "fr-CH": frCH, "it-CH": itCH } as const;

function lookup(messages: unknown, dottedKey: string): unknown {
  return dottedKey
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[key]
          : undefined,
      messages,
    );
}

function expectKeys(keys: string[]) {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    for (const key of keys) {
      expect(lookup(messages, key), `${locale}: ${key}`).toEqual(expect.any(String));
    }
  }
}

/**
 * A draft written before the user changed their documents must never ship
 * silently: the body step surfaces a quiet, dismissible banner instead of a
 * toast or a block.
 */
describe("stale body after attachment changes", () => {
  it("tracks the attachment set the body was drafted against", () => {
    expect(attachmentSyncSource).toContain("episto.body-attachments-synced.v1.");
    expect(attachmentSyncSource).toContain("attachmentsChangedSinceDraft");
    expect(bodyStepControllerSource).toContain("useAttachmentDraftSync");
    expect(bodyStepControllerSource).toContain("markAttachmentsSynced");
  });

  it("offers update-or-keep, and update goes through the refinement thread", () => {
    expect(bodyStepSource).toContain("attachmentsChangedSinceDraft");
    expect(bodyStepSource).toContain('t("attachmentsChangedUpdate")');
    expect(bodyStepSource).toContain('t("attachmentsChangedKeep")');
    expect(bodyStepControllerSource).toContain(
      'sendRefinementInstruction(t("attachmentsChangedRefineInstruction"))',
    );
  });

  it("carries banner copy in all four locales", () => {
    expectKeys([
      "draft.attachmentsChangedTitle",
      "draft.attachmentsChangedBody",
      "draft.attachmentsChangedUpdate",
      "draft.attachmentsChangedKeep",
      "draft.attachmentsChangedRefineInstruction",
    ]);
  });
});

/** PDFs are mailed, images only inform the assistant — visible on every row. */
describe("uploader mailability transparency", () => {
  it("renders a mailability chip from the shared helper", () => {
    expect(uploaderSource).toContain("mailabilityChip");
  });
});

/**
 * The Swiss enclosures line ("Beilage: …") should not depend on users knowing
 * the convention: review suggests one from the actually-mailed PDFs, editable
 * and declinable, without implying the choice changes what is mailed.
 */
describe("review enclosure note suggestion", () => {
  it("suggests only when mailed PDFs exist and the note is empty", () => {
    expect(reviewPageSource).toContain('a.mimeType === "application/pdf"');
    expect(reviewPageSource).toContain("mailedPdfs.length > 0 && !displayEnclosureNote");
  });

  it("saves the visible suggestion, not a stale edit buffer", () => {
    expect(enclosureSuggestionSource).toContain("updateDraft.mutateAsync");
    expect(enclosureSuggestionSource).toContain(
      "enclosureNote: editing ? noteValue : suggestedText",
    );
  });

  it("is declinable and remembered per draft", () => {
    expect(enclosureSuggestionSource).toContain(
      "episto.enclosure-suggestion-dismissed.v1.",
    );
  });

  it("carries suggestion copy in all four locales", () => {
    expectKeys([
      "review.enclosureSuggestionTitle",
      "review.enclosureSuggestionBody",
      "review.enclosureSuggestionPrefix",
      "review.enclosureSuggestionHelp",
      "review.enclosureSuggestionAdd",
      "review.enclosureSuggestionEdit",
      "review.enclosureSuggestionDecline",
    ]);
  });
});
