import { afterEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

import { captureReviewSnapshot } from "../src/modules/drafting/review-snapshot.service.js";
import { deleteFileAsset } from "../src/modules/files/file.service.js";
import { registerUploadedFileAsset } from "../src/modules/files/file-registration.js";
import {
  attachmentIdsInLatestSnapshot,
  createDraftLockHarness,
  fileStatus,
  firstRow,
  statusOf,
  type DraftLockHarness,
} from "./helpers/draft-lock-harness.js";
import { integrationDatabaseUrl } from "./helpers/postgres-integration.js";

const describeIfIntegrationDb = integrationDatabaseUrl ? describe : describe.skip;

const UPLOAD_CONSTRAINTS = {
  allowedMimeTypes: ["application/pdf"] as [string, ...string[]],
  maxAttachmentsPerDraft: 5,
  maxFileBytes: 10_000_000,
  maxTotalBytes: 20_000_000,
};

/**
 * The user story under test:
 *
 *   A customer hits "send to review" and, in the same second, removes an
 *   enclosure from the other tab. What Swiss Post prints comes from the
 *   snapshot taken at review, so the two must not both succeed: an app that
 *   reports the document as removed while the envelope still contains it is a
 *   discrepancy nobody can explain to the recipient afterwards.
 *
 * Both paths now take `draft_letters FOR UPDATE` before they read the status
 * they act on, which only a real Postgres can demonstrate — a mocked db has no
 * lock queue and no notion of one transaction waiting for another.
 */
describeIfIntegrationDb("draft row lock: review versus file mutation", () => {
  let harness: DraftLockHarness | null = null;

  afterEach(async () => {
    if (harness) {
      await harness.close();
      harness = null;
    }
  });

  async function setup(): Promise<DraftLockHarness> {
    harness = await createDraftLockHarness();
    return harness;
  }

  /**
   * The exact interleaving the bug needed: the delete arrives *after* review has
   * read the file list and *before* review has advanced the draft.
   *
   * Review is stopped inside its transaction by an exclusive lock on
   * `draft_snapshots`, which it needs for the insert that comes after the file
   * read. At that moment the draft still says `fields_complete`, so a delete
   * that only read the status would be told the letter is editable, retire the
   * enclosure, and leave the snapshot — the thing Swiss Post prints from —
   * listing a document the app reports as deleted. It blocks instead, because
   * review is holding the draft row.
   */
  it("a delete arriving inside review's window blocks, and the enclosure stays in the envelope", async () => {
    const h = await setup();
    const { db } = h;
    const fixture = await h.createFixture();

    const holder = await h.openConnection();
    const reviewer = await h.openConnection();
    const deleter = await h.openConnection();

    await holder.client.query("BEGIN");
    await holder.client.query("LOCK TABLE draft_snapshots IN EXCLUSIVE MODE");

    // Review gets as far as the snapshot insert: past the file read, still
    // holding the draft row, with the draft not yet advanced.
    const review = captureReviewSnapshot(reviewer.db, fixture.draftId, fixture.sessionId);
    await h.waitUntilBlocked(reviewer);
    expect(await statusOf(db, fixture.draftId)).toBe("fields_complete");

    const remove = deleteFileAsset(deleter.db, fixture.fileId, fixture.sessionId).then(
      () => "deleted" as const,
      (error: unknown) => error,
    );
    await h.waitUntilBlocked(deleter);

    await holder.client.query("COMMIT");

    const snapshot = await review;
    const removeOutcome = await remove;

    expect(snapshot.attachmentFileIds).toEqual([fixture.fileId]);
    expect(await attachmentIdsInLatestSnapshot(db, fixture.draftId)).toEqual([
      fixture.fileId,
    ]);

    // The delete has to lose: the letter it would change is already frozen.
    expect(removeOutcome).toBeInstanceOf(Error);
    expect((removeOutcome as Error).message).toMatch(
      /Draft files cannot be changed in status 'rendering'/,
    );
    expect(await fileStatus(db, fixture.fileId)).toBe("active");
    expect(await statusOf(db, fixture.draftId)).toBe("rendering");
  });

  /** The other consistent outcome: the delete wins and review never sees it. */
  it("a delete that wins the race leaves the enclosure out of the snapshot", async () => {
    const h = await setup();
    const { db } = h;
    const fixture = await h.createFixture();

    const holder = await h.openConnection();
    const reviewer = await h.openConnection();
    const deleter = await h.openConnection();

    await holder.client.query("BEGIN");
    await holder.client.query("SELECT id FROM draft_letters WHERE id = $1 FOR UPDATE", [
      fixture.draftId,
    ]);

    const remove = deleteFileAsset(deleter.db, fixture.fileId, fixture.sessionId);
    await h.waitUntilBlocked(deleter);

    const review = captureReviewSnapshot(reviewer.db, fixture.draftId, fixture.sessionId);
    await h.waitUntilBlocked(reviewer);

    await holder.client.query("COMMIT");

    await remove;
    const snapshot = await review;

    expect(snapshot.attachmentFileIds).toEqual([]);
    expect(await attachmentIdsInLatestSnapshot(db, fixture.draftId)).toEqual([]);
    expect(await fileStatus(db, fixture.fileId)).toBe("pending_deletion");
  });

  /** Uploads are the same race with the opposite sign: a late enclosure. */
  it("an upload racing review is refused rather than landing after the snapshot", async () => {
    const h = await setup();
    const { db } = h;
    const fixture = await h.createFixture();

    const holder = await h.openConnection();
    const reviewer = await h.openConnection();
    const uploader = await h.openConnection();

    await holder.client.query("BEGIN");
    await holder.client.query("LOCK TABLE draft_snapshots IN EXCLUSIVE MODE");

    const review = captureReviewSnapshot(reviewer.db, fixture.draftId, fixture.sessionId);
    await h.waitUntilBlocked(reviewer);

    const upload = registerUploadedFileAsset(uploader.db, {
      draftId: fixture.draftId,
      sessionId: fixture.sessionId,
      kind: "attachment",
      sizeBytes: 2048,
      constraints: UPLOAD_CONSTRAINTS,
      storageKey: `attachments/${fixture.sessionId}/late-${Date.now()}`,
      originalFilename: "late.pdf",
      mimeType: "application/pdf",
    }).then(
      () => "registered" as const,
      (error: unknown) => error,
    );
    await h.waitUntilBlocked(uploader);

    await holder.client.query("COMMIT");

    const snapshot = await review;
    const uploadOutcome = await upload;

    expect(uploadOutcome).toBeInstanceOf(Error);
    expect((uploadOutcome as Error).message).toMatch(
      /Draft files cannot be changed in status 'rendering'/,
    );

    // And nothing was inserted: the snapshot's file list is still the whole
    // truth about what goes in the envelope.
    const rows = await db.execute<{ total: string }>(sql`
      SELECT count(*)::text AS total FROM file_assets WHERE draft_id = ${fixture.draftId}
    `);
    expect(firstRow(rows).total).toBe("1");
    expect(snapshot.attachmentFileIds).toEqual([fixture.fileId]);
  });
});
