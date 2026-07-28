import { and, eq, sql } from "drizzle-orm";

import { schema, type Db } from "../../db/index.js";
import { AppError, notFoundError } from "../../shared/errors/index.js";
import {
  assertNothingInFlight,
  ERASURE_KEY_VERSION,
  erasureSubjectDigest,
  findRetainedDraftIds,
  scrubFreeText,
  scrubSessionIdentifiers,
} from "./session-erasure.js";

export interface SessionErasureResult {
  draftsErased: number;
  paidOrdersRetained: number;
  filesMarkedForDeletion: number;
  totalDrafts: number;
}

/**
 * GDPR/FADP right-to-erasure for one session.
 *
 * Lives in a service rather than in the route because the rules it encodes —
 * what is retained, what is scrubbed, and in what order relative to the
 * erasure-guard triggers — are the part worth testing against a real database.
 */
export async function eraseSessionData(
  db: Db,
  id: string,
  requestedBy = "system",
): Promise<SessionErasureResult> {
  return db.transaction(async (tx) => {
    // Locked first, and held for the whole transaction. Any live request for
    // this session that writes the session row — a locale change, a phone
    // verification landing, a resume-token refresh — takes the same row lock on
    // its UPDATE, so it either commits before this reads, or waits and then
    // writes into an expired session. Without the lock it could commit a fresh
    // email in between the read and the scrub.
    //
    // This does not stop a request that only writes *drafts* from inserting a
    // new one after the scan; that residue is bounded by the expiry set below,
    // which lands in the same transaction and ends the session.
    const [session] = await tx
      .select({ id: schema.sessions.id, expiresAt: schema.sessions.expiresAt })
      .from(schema.sessions)
      .where(eq(schema.sessions.id, id))
      .limit(1)
      .for("update");

    if (!session) throw notFoundError("session");

    // Load all drafts for the session (safety cap: refuse above 1000 to keep tx bounded)
    const [countRow] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.draftLetters)
      .where(eq(schema.draftLetters.sessionId, id))
      .limit(1);

    const totalDrafts = countRow?.count ?? 0;

    if (totalDrafts > 1000) {
      throw new AppError({
        family: "validation_error",
        statusCode: 400,
        code: "TOO_MANY_DRAFTS",
        message: `Session has ${totalDrafts} drafts (max 1000 for erase). Contact engineering.`,
        userMessage: "Too many drafts to erase at once. Please contact support.",
        userAction: null,
      });
    }

    // Locked, not just read. Every write path is guarded by a trigger that
    // takes `FOR SHARE` on this row, so holding it exclusively for the rest
    // of the transaction is what makes a concurrent writer wait and then
    // fail, instead of interleaving with the erasure.
    //
    // `ORDER BY id` because this and the retention sweep both lock several
    // drafts at once. In any other order the two can hold each other's next
    // row and deadlock; in this one, the loser simply waits.
    const drafts = await tx
      .select()
      .from(schema.draftLetters)
      .where(eq(schema.draftLetters.sessionId, id))
      .orderBy(schema.draftLetters.id)
      .limit(1000)
      .for("update");
    let draftsErased = 0;
    let paidOrdersRetained = 0;
    let filesMarkedForDeletion = 0;

    const draftIds = drafts.map((draft) => draft.id);

    // Nothing is scrubbed underneath a worker that is still working.
    await assertNothingInFlight(tx, draftIds);

    const retainedDraftIds = await findRetainedDraftIds(tx, draftIds);

    const erasable: typeof drafts = [];
    // Profiles hang off the session, not the draft, so two drafts can share
    // one. Redacting a profile a retained paid order still points at would
    // corrupt that order's record of who it was sent to.
    const retainedProfileIds = new Set<string>();

    for (const draft of drafts) {
      if (retainedDraftIds.has(draft.id)) {
        paidOrdersRetained++;
        if (draft.senderProfileId) retainedProfileIds.add(draft.senderProfileId);
        if (draft.recipientProfileId) retainedProfileIds.add(draft.recipientProfileId);
        continue; // RETAIN — do not modify
      }

      erasable.push(draft);
    }

    for (const draft of erasable) {
      // Idempotency is the tombstone, not the shape of the content. A draft
      // still being collected legitimately has a null subject, body and
      // tone while holding profiles, metadata, files and a conversation —
      // the old heuristic read that as "already erased" and skipped them.
      const alreadyErased = Boolean(draft.erasureRequestedAt);

      // Redact draft letter PII fields. `metadata` is included because it
      // is not metadata: the drafting model persists the structured
      // document, letter body and all, into it.
      await tx
        .update(schema.draftLetters)
        .set({
          subject: null,
          body: null,
          tone: null,
          intent: null,
          enclosureNote: null,
          metadata: null,
          // Set once: this records when erasure was first requested, not
          // when it was last retried.
          erasureRequestedAt: draft.erasureRequestedAt ?? new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.draftLetters.id, draft.id));

      // The snapshot is a frozen copy of the whole letter — body, sender
      // and recipient addresses. Nothing ever cleared it, so erasure used
      // to leave a complete duplicate behind.
      await tx
        .update(schema.draftSnapshots)
        .set({ snapshotData: {} })
        .where(eq(schema.draftSnapshots.draftId, draft.id));

      // Redact sender profile
      if (draft.senderProfileId && !retainedProfileIds.has(draft.senderProfileId)) {
        await tx
          .update(schema.senderProfiles)
          .set({
            firstName: "[erased]",
            lastName: "[erased]",
            company: null,
            addressLine1: "[erased]",
            addressLine2: null,
            postalCode: "0000",
            city: "[erased]",
            country: "CH",
            phone: null,
            email: null,
            updatedAt: new Date(),
          })
          .where(eq(schema.senderProfiles.id, draft.senderProfileId));
      }

      // Redact recipient profile
      if (draft.recipientProfileId && !retainedProfileIds.has(draft.recipientProfileId)) {
        await tx
          .update(schema.recipientProfiles)
          .set({
            firstName: null,
            lastName: null,
            company: null,
            department: null,
            addressLine1: "[erased]",
            addressLine2: null,
            postalCode: "0000",
            city: "[erased]",
            country: "CH",
            updatedAt: new Date(),
          })
          .where(eq(schema.recipientProfiles.id, draft.recipientProfileId));
      }

      if (!alreadyErased) draftsErased++;

      // Mark active file assets as pending_deletion (reuse existing cleanup
      // worker) and clear their extracted text here and now. The objects go
      // on the worker's schedule, but the document text is already in this
      // database — an erasure request must not leave it sitting there until
      // the next sweep.
      const fileResult = await tx
        .update(schema.fileAssets)
        .set({ status: "pending_deletion", extractedText: null })
        .where(
          and(
            eq(schema.fileAssets.draftId, draft.id),
            eq(schema.fileAssets.status, "active"),
          ),
        )
        .returning({ id: schema.fileAssets.id });

      // The conversation is the user's own words about their situation, and
      // is at least as sensitive as the letter body erased above.
      await tx
        .delete(schema.conversationMessages)
        .where(eq(schema.conversationMessages.draftId, draft.id));

      filesMarkedForDeletion += fileResult.length;
    }

    // The identifiers that were never in the draft: the session's own email,
    // phone and IP, the verification rows, the analytics trail, the phone
    // copied onto the payment, and the resume link itself. This also expires
    // the session, so the soft-expire that used to live here is redundant.
    await scrubSessionIdentifiers(tx, id, draftIds);

    // Free text on rows that outlive the draft's content, retained or not: the
    // uploaded filename and the prose on a failed or refunded payment.
    await scrubFreeText(tx, draftIds);

    // The audit goes in inside the transaction: an erasure that committed
    // without a record, or a record without an erasure, are both wrong.
    await tx.insert(schema.erasureAudits).values({
      subjectDigest: erasureSubjectDigest(id),
      keyVersion: ERASURE_KEY_VERSION,
      requestedBy,
      draftsErased,
      ordersRetained: paidOrdersRetained,
      filesMarked: filesMarkedForDeletion,
    });

    return { draftsErased, paidOrdersRetained, filesMarkedForDeletion, totalDrafts };
  });
}
