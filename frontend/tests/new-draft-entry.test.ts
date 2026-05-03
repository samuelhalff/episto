import { DraftStatus, type DraftLetter } from "@episto/shared";
import { describe, expect, it } from "vitest";

import { findRecoverableDraft, shouldForceFreshEntry } from "../src/lib/new-draft-entry";

function createDraft(
  id: string,
  status: DraftLetter["status"],
  updatedAt: string,
): DraftLetter {
  return {
    id,
    sessionId: "11111111-1111-1111-1111-111111111111",
    status,
    locale: "en-CH",
    deliveryType: "standard",
    subject: null,
    body: null,
    tone: null,
    intent: null,
    enclosureNote: null,
    signatureMode: null,
    schemaVersion: 1,
    senderProfileId: null,
    recipientProfileId: null,
    signatureAssetId: null,
    estimatedPages: null,
    reviewedAt: null,
    metadata: null,
    createdAt: new Date("2026-04-01T10:00:00.000Z"),
    updatedAt: new Date(updatedAt),
  };
}

describe("findRecoverableDraft", () => {
  it("returns the most recent unfinished draft", () => {
    const drafts = [
      createDraft(
        "22222222-2222-2222-2222-222222222222",
        DraftStatus.submitted,
        "2026-04-02T12:00:00.000Z",
      ),
      createDraft(
        "33333333-3333-3333-3333-333333333333",
        DraftStatus.collecting,
        "2026-04-03T12:00:00.000Z",
      ),
      createDraft(
        "44444444-4444-4444-4444-444444444444",
        DraftStatus.ready,
        "2026-04-04T12:00:00.000Z",
      ),
    ];

    expect(findRecoverableDraft(drafts)?.id).toBe("44444444-4444-4444-4444-444444444444");
  });

  it("ignores submitted, dispatched, and closed drafts", () => {
    const drafts = [
      createDraft(
        "55555555-5555-5555-5555-555555555555",
        DraftStatus.submitted,
        "2026-04-05T12:00:00.000Z",
      ),
      createDraft(
        "66666666-6666-6666-6666-666666666666",
        DraftStatus.dispatched,
        "2026-04-06T12:00:00.000Z",
      ),
      createDraft(
        "77777777-7777-7777-7777-777777777777",
        DraftStatus.closed,
        "2026-04-07T12:00:00.000Z",
      ),
    ];

    expect(findRecoverableDraft(drafts)).toBeNull();
  });
});

describe("shouldForceFreshEntry", () => {
  it("returns true only for the explicit fresh=1 flag", () => {
    expect(shouldForceFreshEntry(new URLSearchParams("fresh=1"))).toBe(true);
    expect(shouldForceFreshEntry(new URLSearchParams("fresh=0"))).toBe(false);
    expect(shouldForceFreshEntry(new URLSearchParams(""))).toBe(false);
  });
});
