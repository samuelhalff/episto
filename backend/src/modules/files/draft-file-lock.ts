import { EDITABLE_STATUSES } from "../drafting/draft.service.js";
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
