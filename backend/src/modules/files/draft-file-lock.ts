import type { Db } from "../../db/index.js";
import {
  EDITABLE_STATUSES,
  lockDraftRow,
  type DraftRow,
} from "../drafting/draft.service.js";
import { validationError } from "../../shared/errors/index.js";

/**
 * A draft's files are part of the letter, so they stop being editable when the
 * letter does.
 *
 * `updateDraft` has enforced this for the draft's own columns since the
 * beginning; the file routes never did, which left an API path to add or remove
 * an attachment on a draft that had already been snapshotted, rendered, paid
 * for and dispatched. The dispatch reads the snapshot, so the letter Swiss Post
 * delivered would not change — but the file list the customer sees would, and a
 * customer looking at an order that no longer matches the paper in their
 * recipient's hand is the kind of discrepancy that is impossible to explain
 * afterwards. The UI only ever uploads during the draft steps, so this rejects
 * nothing the app itself does.
 */
export function assertDraftAcceptsFileChanges(status: string): void {
  if (!EDITABLE_STATUSES.has(status)) {
    throw validationError(`Draft files cannot be changed in status '${status}'`);
  }
}

/**
 * Claim the draft for a file change, and refuse if the letter is already frozen.
 *
 * The status check on its own is a check-then-act: review reads the file list
 * and then advances the draft, so a delete that only read the status could be
 * told "still editable" by a status review had already left behind, and retire
 * an enclosure the snapshot had captured — an app that says the document was
 * removed while Swiss Post delivers an envelope that still contains it.
 * Taking the draft row exclusively first is what makes the answer hold: the two
 * transactions queue on that row, and whichever arrives second sees the other's
 * committed result.
 *
 * Call this as the first statement of the transaction that writes `file_assets`,
 * and never take a `file_assets` lock before it — see `lockDraftRow` for the
 * lock order and why it cannot deadlock.
 */
export async function lockDraftForFileChange(
  tx: Db,
  draftId: string,
): Promise<DraftRow | null> {
  const draft = await lockDraftRow(tx, draftId);
  if (draft) assertDraftAcceptsFileChanges(draft.status);
  return draft;
}
