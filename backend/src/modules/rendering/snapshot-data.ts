import { SnapshotDataSchema, type SnapshotData } from "@episto/shared";

import { erasedDraftError } from "../../shared/errors/erased-draft.js";

/**
 * Admin erasure overwrites `draft_snapshots.snapshot_data` with `{}` — the
 * snapshot is a frozen copy of the letter body and both addresses, so leaving
 * it intact would have made erasure meaningless.
 *
 * The scrubbed value is deliberately not a valid snapshot: erased data must
 * never look like a letter something downstream can render or dispatch. That
 * makes it every reader's job to tell "erased" apart from "corrupt", which is
 * what this does — otherwise erasure turns every stale link into a 500.
 */
export const ERASED_SNAPSHOT_DATA = {} as const;

export function isErasedSnapshotData(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  );
}

export function parseStoredSnapshotData(value: unknown): SnapshotData {
  if (isErasedSnapshotData(value)) {
    throw erasedDraftError();
  }
  return SnapshotDataSchema.parse(value);
}
