import { afterEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";

import type * as DraftFileLockModule from "../src/modules/files/draft-file-lock.js";

const downloadObjectBuffer = vi.fn();
const ocrExtractText = vi.fn();

// Set by a single test to make the lock fail the way an outage does, rather
// than the way a frozen letter does. Everywhere else the real lock runs, so the
// blocking tests below are testing Postgres and not a stub agreeing with itself.
let lockFailure: Error | null = null;

// The two edges of ingestion that leave the database: object storage and the
// OCR vendor. Stubbed so the test is about when the extraction write lands,
// not about reading a real PDF.
vi.mock("../src/modules/files/adapters/s3.adapter.js", () => ({
  downloadObjectBuffer,
}));
vi.mock("../src/modules/files/ocr-adapter.js", () => ({
  isOcrConfigured: () => true,
  ocrExtractText,
}));

vi.mock("../src/modules/files/draft-file-lock.js", async () => {
  const actual = await vi.importActual<typeof DraftFileLockModule>(
    "../src/modules/files/draft-file-lock.js",
  );
  return {
    ...actual,
    lockDraftForFileChange: async (
      ...args: Parameters<typeof actual.lockDraftForFileChange>
    ) => {
      if (lockFailure) throw lockFailure;
      return actual.lockDraftForFileChange(...args);
    },
  };
});

const { ingestAttachment } =
  await import("../src/modules/files/attachment-ingestion.service.js");
const { captureReviewSnapshot } =
  await import("../src/modules/drafting/review-snapshot.service.js");
const { attachmentIdsInLatestSnapshot, createDraftLockHarness, firstRow, statusOf } =
  await import("./helpers/draft-lock-harness.js");
const { integrationDatabaseUrl } = await import("./helpers/postgres-integration.js");

type Harness = Awaited<ReturnType<typeof createDraftLockHarness>>;

const describeIfIntegrationDb = integrationDatabaseUrl ? describe : describe.skip;

const OCR_TEXT = "Kundennummer 4711, Vertragsende 31.12.2026";

/**
 * The user story under test:
 *
 *   A customer uploads a photo of their contract and, without waiting, hits
 *   "send to review". Reading the photo happens in the background and can take
 *   seconds, so its write arrives at an arbitrary moment — including the moment
 *   review is freezing the letter.
 *
 * The extraction write is a write to the enclosure rows review reads to build
 * the snapshot Swiss Post prints from, and the delete path clears
 * `extracted_text` under the draft's lock precisely so a removed document stops
 * being readable in our database. An extraction that writes without that lock
 * is a third party mutating the letter's files while both of those are in
 * flight: it can rewrite an enclosure of a letter that is already frozen, paid
 * for and sent, and it can put the contents of a document the customer deleted
 * straight back. Taking `lockDraftForFileChange` first means the write either
 * commits before review reads the file list, or waits and is then refused.
 */
describeIfIntegrationDb("draft row lock: attachment extraction versus review", () => {
  let harness: Harness | null = null;

  afterEach(async () => {
    if (harness) {
      await harness.close();
      harness = null;
    }
    lockFailure = null;
    vi.clearAllMocks();
  });

  async function setup(): Promise<Harness> {
    downloadObjectBuffer.mockResolvedValue({ buffer: Buffer.from("photo-bytes") });
    ocrExtractText.mockResolvedValue(OCR_TEXT);
    harness = await createDraftLockHarness();
    return harness;
  }

  async function extractionOf(
    harnessDb: Harness["db"],
    fileId: string,
  ): Promise<{ status: string | null; text: string | null }> {
    const rows = await harnessDb.execute<{ status: string | null; text: string | null }>(
      sql`SELECT extraction_status AS status, extracted_text AS text
          FROM file_assets WHERE id = ${fileId}`,
    );
    return firstRow(rows);
  }

  /**
   * The interleaving the bug needed: extraction finishes reading while review is
   * between its file read and its status write.
   *
   * Review is stopped inside its transaction by an exclusive lock on
   * `draft_snapshots`, which it needs for the insert that follows the file read.
   * The draft still says `fields_complete` at that moment, so an unlocked
   * extraction would be told the letter is editable and would write the
   * document's text into an enclosure that is, a millisecond later, part of a
   * frozen letter. It queues on the draft row instead, and by the time it is let
   * through the letter is not the customer's to change any more.
   */
  it("an extraction write arriving inside review's window blocks and is then refused", async () => {
    const h = await setup();
    const { db } = h;
    const fixture = await h.createFixture({
      mimeType: "image/png",
      extractionStatus: "pending",
    });

    const holder = await h.openConnection();
    const reviewer = await h.openConnection();
    const ingester = await h.openConnection();

    await holder.client.query("BEGIN");
    await holder.client.query("LOCK TABLE draft_snapshots IN EXCLUSIVE MODE");

    const review = captureReviewSnapshot(reviewer.db, fixture.draftId, fixture.sessionId);
    await h.waitUntilBlocked(reviewer);
    expect(await statusOf(db, fixture.draftId)).toBe("fields_complete");

    const ingestion = ingestAttachment(ingester.db, fixture.fileId);
    await h.waitUntilBlocked(ingester);
    // Attribution, not just "something blocked": review is the holder of the
    // row extraction is waiting for.
    expect(await h.blockingPids(ingester)).toContain(reviewer.pid);

    await holder.client.query("COMMIT");

    const snapshot = await review;
    const outcome = await ingestion;

    expect(snapshot.attachmentFileIds).toEqual([fixture.fileId]);
    expect(await attachmentIdsInLatestSnapshot(db, fixture.draftId)).toEqual([
      fixture.fileId,
    ]);
    expect(await statusOf(db, fixture.draftId)).toBe("rendering");

    // Nothing was written into the frozen letter's enclosure, and the vendor was
    // never called: refusing before the OCR request also means not paying to
    // read a document whose text has nowhere to go.
    expect(outcome).toBe("pending");
    expect(await extractionOf(db, fixture.fileId)).toEqual({
      status: "pending",
      text: null,
    });
    expect(ocrExtractText).not.toHaveBeenCalled();
  });

  /**
   * The mirror case: extraction gets to the draft row first.
   *
   * Held up mid-write by a table lock on `file_assets`, it is still holding the
   * draft row, so the review that starts next has to wait for it rather than
   * read a file list the background job is halfway through rewriting. That
   * waiting is the whole property — with the write unlocked, review would sail
   * past and the snapshot would be taken from rows in flux.
   */
  it("review waits for an in-flight extraction instead of reading a half-written file list", async () => {
    const h = await setup();
    const { db } = h;
    const fixture = await h.createFixture({
      mimeType: "image/png",
      extractionStatus: "pending",
    });

    const holder = await h.openConnection();
    const ingester = await h.openConnection();
    const reviewer = await h.openConnection();

    await holder.client.query("BEGIN");
    await holder.client.query("LOCK TABLE file_assets IN EXCLUSIVE MODE");

    // Extraction has the draft row and is stuck on the file write.
    const ingestion = ingestAttachment(ingester.db, fixture.fileId);
    await h.waitUntilBlocked(ingester);

    const review = captureReviewSnapshot(reviewer.db, fixture.draftId, fixture.sessionId);
    await h.waitUntilBlocked(reviewer);
    expect(await h.blockingPids(reviewer)).toContain(ingester.pid);

    await holder.client.query("COMMIT");

    await ingestion;
    const snapshot = await review;

    // Whichever of the two finishes first, the file is in the envelope and the
    // letter is frozen exactly once.
    expect(snapshot.attachmentFileIds).toEqual([fixture.fileId]);
    expect(await statusOf(db, fixture.draftId)).toBe("rendering");
  });

  /**
   * Refusal and outage arrive at the same `catch`, and only one of them is a
   * decision.
   *
   * "The letter is frozen" is an answer: nothing downstream reads this text, so
   * dropping the write is correct and quiet. A dropped connection or a
   * serialisation failure is not an answer — it means we do not know whether the
   * letter is frozen. Treating it as a refusal would discard extracted text and
   * write a line in the log stating something untrue about a letter the customer
   * is very likely still editing, leaving the assistant drafting without a
   * document the customer can plainly see was uploaded, and no error anywhere to
   * explain it. So anything that is not the refusal propagates, where the
   * background wrapper logs it at error level.
   */
  it("propagates an infrastructure failure instead of reporting it as a frozen letter", async () => {
    const h = await setup();
    const { db } = h;
    const fixture = await h.createFixture({
      mimeType: "image/png",
      extractionStatus: "pending",
    });

    lockFailure = new Error("Connection terminated unexpectedly");

    await expect(ingestAttachment(db, fixture.fileId)).rejects.toThrow(
      "Connection terminated unexpectedly",
    );
    expect(await extractionOf(db, fixture.fileId)).toEqual({
      status: "pending",
      text: null,
    });
  });
});
