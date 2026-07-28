import { sql, type SQL } from "drizzle-orm";

import type { Db } from "../db/index.js";

/**
 * Draft-scoped file retention.
 *
 * Every step here retires a `file_assets` row that a draft still owns, and
 * dispatch only ever loads `active` rows. Retiring one out from under a queued
 * dispatch attempt posts a registered letter without the enclosure the user
 * paid to send — or, once `buildDispatchPackage` refuses to do that, fails a
 * dispatch whose payment is already captured.
 *
 * ## Why two commands and not one
 *
 * The obvious shape is a single `UPDATE ... WHERE ... AND NOT EXISTS (queued
 * attempt)`. It does not work. Under READ COMMITTED a command runs on the
 * snapshot taken when it started, and PostgreSQL only re-evaluates an UPDATE's
 * predicate when the *target row itself* was concurrently updated and the
 * UPDATE had to wait for it. A dispatch insert touches `dispatch_attempts` and
 * `draft_letters`, never `file_assets` — so the guard is simply stale, and
 * folding `FOR UPDATE` into the same statement does not refresh it either.
 *
 * So each step is:
 *
 *   1. lock the candidate drafts (`FOR UPDATE SKIP LOCKED`), and
 *   2. run the retirement as a *separate* command, which therefore gets a new
 *      snapshot — taken after the lock, and so after anything the previous
 *      holder of that lock committed.
 *
 * A draft whose lock a dispatch holds right now is skipped rather than waited
 * on, and picked up by the next run.
 *
 * The lock is what makes step 2's guard trustworthy; the guard is what makes
 * the lock worth taking. Neither alone is sufficient, and the guard must stay
 * in the UPDATE.
 *
 * The dispatch side takes the matching share lock on `draft_letters` — partly
 * explicitly (`submit-dispatch.worker.ts`), partly for free via the erasure
 * triggers from migration `0024`, which do `SELECT ... FOR SHARE` on the
 * owning draft before every `dispatch_attempts` insert.
 *
 * ## Lock ordering
 *
 * Everything that takes more than one draft lock takes them `ORDER BY id`:
 * this module and `admin-erasure.service.ts`. Two sweeps, or a sweep and an
 * erasure, therefore queue behind each other rather than deadlocking.
 */

/** No dispatch attempt is created-but-not-yet-handed-to-the-provider. */
const NO_QUEUED_ATTEMPT = sql`
  NOT EXISTS (
    SELECT 1 FROM dispatch_attempts da
    WHERE da.draft_id = fa.draft_id
      AND da.state = 'queued'
      AND da.submitted_at IS NULL
  )`;

export interface RetentionStepResult {
  /** Ids of the assets actually retired. */
  assetIds: string[];
  /**
   * Drafts that were eligible but whose lock was held by someone else. They are
   * not lost — the next run picks them up — but a number that never falls means
   * something is holding draft locks far too long.
   */
  deferredDrafts: number;
}

/**
 * Lock the drafts owning assets that match `candidate`, then retire those
 * assets in a second command — skipping any draft with a dispatch still queued.
 *
 * `candidate` is a predicate over the alias `fa` and may assume nothing about
 * the row beyond it being a `file_assets` row.
 *
 * `batchSize` bounds drafts, not assets: one draft's assets are retired
 * together so the lock covers all of them. A letter carries a handful of
 * files, so the transaction stays short in practice.
 */
export async function retireDraftAssets(
  db: Db,
  batchSize: number,
  candidate: SQL,
  update: SQL = sql`status = 'pending_deletion'`,
): Promise<RetentionStepResult> {
  return db.transaction(async (tx) => {
    const eligible = await tx.execute<{ id: string }>(sql`
      SELECT d.id
      FROM draft_letters d
      WHERE EXISTS (
        SELECT 1 FROM file_assets fa
        WHERE fa.draft_id = d.id AND (${candidate})
      )
      ORDER BY d.id
      LIMIT ${batchSize}
    `);

    if (eligible.rows.length === 0) {
      return { assetIds: [], deferredDrafts: 0 };
    }

    const draftIds = eligible.rows.map((row) => row.id);

    const locked = await tx.execute<{ id: string }>(sql`
      SELECT d.id
      FROM draft_letters d
      WHERE d.id IN (${sql.join(
        draftIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )})
      ORDER BY d.id
      FOR UPDATE SKIP LOCKED
    `);

    const lockedIds = locked.rows.map((row) => row.id);
    const deferredDrafts = draftIds.length - lockedIds.length;

    if (lockedIds.length === 0) {
      return { assetIds: [], deferredDrafts };
    }

    // New command, new snapshot: the NOT EXISTS below sees every dispatch
    // attempt committed before the lock above was granted, including ones the
    // candidate query a moment earlier could not.
    const retired = await tx.execute<{ id: string }>(sql`
      UPDATE file_assets fa
      SET ${update}
      WHERE fa.draft_id IN (${sql.join(
        lockedIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )})
        AND (${candidate})
        AND ${NO_QUEUED_ATTEMPT}
      RETURNING fa.id
    `);

    return { assetIds: retired.rows.map((row) => row.id), deferredDrafts };
  });
}

/**
 * The same retirement for assets that belong to no draft.
 *
 * A signature can be uploaded before the draft exists, so `draft_id` is
 * nullable. Nothing can dispatch such a row, so there is no lock to take and
 * no queued-attempt guard to apply — but it still has to be collected, and the
 * draft-scoped query above cannot see it.
 */
export async function retireDraftlessAssets(
  db: Db,
  batchSize: number,
  candidate: SQL,
): Promise<string[]> {
  const retired = await db.execute<{ id: string }>(sql`
    UPDATE file_assets
    SET status = 'pending_deletion'
    WHERE id IN (
      SELECT fa.id FROM file_assets fa
      WHERE fa.draft_id IS NULL AND (${candidate})
      LIMIT ${batchSize}
    )
    RETURNING id
  `);

  return retired.rows.map((row) => row.id);
}
