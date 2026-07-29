import { and, eq } from "drizzle-orm";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { notFoundError, validationError } from "../../shared/errors/index.js";
import { createSnapshot, type SnapshotRow } from "../rendering/snapshot.service.js";
import { getReviewMissingFields } from "./review-validation.js";
import { lockDraftRow, transitionDraftStatus, type DraftRow } from "./draft.service.js";

export interface ReviewSnapshotResult {
  snapshot: SnapshotRow;
  snapshotData: ReturnType<typeof buildSnapshotData>;
  attachmentFileIds: string[];
  signatureFileId: string | null;
}

type SenderRow = typeof schema.senderProfiles.$inferSelect;
type RecipientRow = typeof schema.recipientProfiles.$inferSelect;

function buildSnapshotData(input: {
  draft: DraftRow;
  sender: SenderRow;
  recipient: RecipientRow;
  attachmentFileIds: string[];
  signatureFileId: string | null;
}) {
  const { draft, sender, recipient } = input;

  return {
    schemaVersion: draft.schemaVersion,
    locale: draft.locale,
    deliveryType: draft.deliveryType,
    signatureFlowMode: draft.signatureFlowMode,
    subject: draft.subject,
    body: draft.body,
    enclosureNote: draft.enclosureNote,
    signatureMode: draft.signatureMode,
    tone: draft.tone,
    intent: draft.intent,
    sender: {
      firstName: sender.firstName,
      lastName: sender.lastName,
      company: sender.company ?? null,
      addressLine1: sender.addressLine1,
      addressLine2: sender.addressLine2 ?? null,
      postalCode: sender.postalCode,
      city: sender.city,
      country: sender.country,
    },
    recipient: {
      firstName: recipient.firstName ?? null,
      lastName: recipient.lastName ?? null,
      company: recipient.company ?? null,
      department: recipient.department ?? null,
      addressLine1: recipient.addressLine1,
      addressLine2: recipient.addressLine2 ?? null,
      postalCode: recipient.postalCode,
      city: recipient.city,
      country: recipient.country,
    },
    attachmentAssetIds: input.attachmentFileIds,
    signatureAssetId: input.signatureFileId,
    estimatedPages: draft.estimatedPages ?? null,
    metadata: draft.metadata as Record<string, unknown> | null,
  };
}

async function loadProfile<T>(
  rows: Promise<T[]>,
  field: "sender" | "recipient",
  label: string,
): Promise<T> {
  const [row] = await rows;
  if (!row) {
    throw validationError(`${label} profile not found`, [
      { field, message: `${label} profile not found` },
    ]);
  }
  return row;
}

/**
 * Freeze the letter: capture everything that will be printed into an immutable
 * snapshot and advance the draft out of its editable states.
 *
 * All of it happens under the draft's row lock, which is the point. The file
 * list is the part that cannot be read outside it: a delete that only checked
 * the status could pass that check against a draft this function had already
 * moved past `reviewed`, and retire an enclosure already captured below — an
 * app that reports the document as removed while Swiss Post delivers an
 * envelope that still contains it. Holding the row from the read of
 * `file_assets` through the status transitions means a concurrent file change
 * either commits first (and is in the snapshot, or absent from it) or waits and
 * is then refused.
 *
 * The lock order is the one `lockDraftRow` documents: this draft row first, and
 * nothing else exclusively, so it can block a file mutation but cannot deadlock
 * with one.
 */
export async function captureReviewSnapshot(
  db: Db,
  draftId: string,
  sessionId: string,
): Promise<ReviewSnapshotResult> {
  return await db.transaction(async (tx) => {
    const draft = await lockDraftRow(tx, draftId, sessionId);
    if (!draft) throw notFoundError("draft");

    // Re-validated against the locked row, not the one the handler read before
    // the lock: an autosave could have emptied the body in between.
    const missingFields = getReviewMissingFields(draft);
    if (missingFields.length > 0) {
      throw validationError("Required fields missing for review", missingFields);
    }

    const senderProfileId = draft.senderProfileId;
    const recipientProfileId = draft.recipientProfileId;
    if (!senderProfileId || !recipientProfileId) {
      // getReviewMissingFields already covers this; kept for the type narrowing.
      throw validationError("Required fields missing for review", missingFields);
    }

    const sender = await loadProfile(
      tx
        .select()
        .from(schema.senderProfiles)
        .where(eq(schema.senderProfiles.id, senderProfileId))
        .limit(1),
      "sender",
      "Sender",
    );
    const recipient = await loadProfile(
      tx
        .select()
        .from(schema.recipientProfiles)
        .where(eq(schema.recipientProfiles.id, recipientProfileId))
        .limit(1),
      "recipient",
      "Recipient",
    );

    const files = await tx
      .select()
      .from(schema.fileAssets)
      .where(
        and(
          eq(schema.fileAssets.draftId, draftId),
          eq(schema.fileAssets.sessionId, sessionId),
          eq(schema.fileAssets.status, "active"),
        ),
      );
    const attachmentFileIds = files
      .filter((f) => f.kind === "attachment")
      .map((f) => f.id);
    const signatureFileId = files.find((f) => f.kind === "signature")?.id ?? null;

    const snapshotData = buildSnapshotData({
      draft,
      sender,
      recipient,
      attachmentFileIds,
      signatureFileId,
    });

    // Review is only valid from `fields_complete`; promote directly when
    // the required fields now satisfy that state.
    if (draft.status === "collecting") {
      await transitionDraftStatus(tx, draftId, sessionId, "fields_complete");
    }

    const snapshot = await createSnapshot(tx, draftId, snapshotData);

    // Transition to reviewed, then rendering while the final PDF is validated.
    await transitionDraftStatus(tx, draftId, sessionId, "reviewed");
    await transitionDraftStatus(tx, draftId, sessionId, "rendering");

    return { snapshot, snapshotData, attachmentFileIds, signatureFileId };
  });
}
