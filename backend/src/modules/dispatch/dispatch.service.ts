import { eq, desc, sql } from "drizzle-orm";
import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { notFoundError, AppError } from "../../shared/errors/index.js";
import { assertTransitionDispatch, type DispatchState } from "@episto/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DispatchStateValue = (typeof DispatchState)[keyof typeof DispatchState];

export interface DispatchAttemptRow {
  id: string;
  draftId: string;
  snapshotId: string;
  paymentAttemptId: string | null;
  state: string;
  providerName: string;
  providerReference: string | null;
  trackingNumber: string | null;
  submittedAt: Date | null;
  lastCheckedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DispatchStatusEventRow {
  id: string;
  dispatchAttemptId: string;
  previousState: string | null;
  newState: string;
  source: string;
  createdAt: Date;
}

function toDispatchRow(
  row: typeof schema.dispatchAttempts.$inferSelect,
): DispatchAttemptRow {
  return {
    id: row.id,
    draftId: row.draftId,
    snapshotId: row.snapshotId,
    paymentAttemptId: row.paymentAttemptId ?? null,
    state: row.state,
    providerName: row.providerName,
    providerReference: row.providerReference,
    trackingNumber: row.trackingNumber ?? null,
    submittedAt: row.submittedAt,
    lastCheckedAt: row.lastCheckedAt,
    failureReason: row.failureReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toEventRow(
  row: typeof schema.dispatchStatusEvents.$inferSelect,
): DispatchStatusEventRow {
  return {
    id: row.id,
    dispatchAttemptId: row.dispatchAttemptId,
    previousState: row.previousState,
    newState: row.newState,
    source: row.source,
    createdAt: row.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Create dispatch attempt
// ---------------------------------------------------------------------------

export async function createDispatchAttempt(
  db: Db,
  data: {
    draftId: string;
    snapshotId: string;
    paymentAttemptId?: string | null;
    providerName: string;
  },
): Promise<DispatchAttemptRow> {
  const [row] = await db
    .insert(schema.dispatchAttempts)
    .values({
      draftId: data.draftId,
      snapshotId: data.snapshotId,
      paymentAttemptId: data.paymentAttemptId ?? null,
      state: "queued",
      providerName: data.providerName,
    })
    .returning();

  if (!row) throw notFoundError("dispatch attempt (insert returned no rows)");
  return toDispatchRow(row);
}

/**
 * How long a submitting worker owns an attempt before another may take it.
 *
 * Long enough that a slow Swiss Post call is never overtaken; short enough
 * that a worker killed mid-submission does not hold the letter hostage.
 */
export const DISPATCH_CLAIM_TTL_MINUTES = 15;

/**
 * Proof that a worker holds the lease: the exact `claimed_at` it wrote, as
 * text. Text rather than `Date` because the value only ever travels back into
 * SQL, and a round trip through a driver's timestamp parser is a place for
 * microseconds to go missing — which would silently break the equality check
 * this whole guarantee rests on.
 */
export type DispatchClaimToken = string;

/**
 * Take the submission lease on a queued attempt.
 *
 * Returns the lease token (the `claimed_at` we wrote) or null if someone else
 * holds it, if the attempt is no longer queued, or if a previous worker already
 * reached the provider. Submit jobs already carry a deterministic BullMQ job
 * id, so this is not the first line of defence — it is the one that survives a
 * stalled job being re-delivered while the original worker is still talking to
 * the provider, which would otherwise post the user's letter twice.
 *
 * A conditional UPDATE rather than `FOR UPDATE`: the provider call happens
 * outside any transaction, and a row lock cannot span it.
 */
export async function claimDispatchAttempt(
  db: Db,
  attemptId: string,
): Promise<DispatchClaimToken | null> {
  const claimed = await db.execute<{ claimed_at: string }>(sql`
    UPDATE dispatch_attempts
    SET claimed_at = NOW(), updated_at = NOW()
    WHERE id = ${attemptId}
      AND state = 'queued'
      AND submitted_at IS NULL
      AND submission_started_at IS NULL
      AND (
        claimed_at IS NULL
        OR claimed_at < NOW() - make_interval(mins => ${DISPATCH_CLAIM_TTL_MINUTES})
      )
    RETURNING claimed_at::text
  `);

  return claimed.rows[0]?.claimed_at ?? null;
}

/**
 * Give the lease back, for a job that gave up before it called the provider.
 *
 * The token makes this owner-safe: a worker whose lease has already expired and
 * been taken by someone else cannot clear the new holder's claim. Releasing is
 * only ever correct while nothing has been sent, which
 * `submission_started_at IS NULL` enforces independently of the caller.
 */
export async function releaseDispatchClaim(
  db: Db,
  attemptId: string,
  token: DispatchClaimToken,
): Promise<void> {
  await db.execute(sql`
    UPDATE dispatch_attempts
    SET claimed_at = NULL, updated_at = NOW()
    WHERE id = ${attemptId}
      AND state = 'queued'
      AND submitted_at IS NULL
      AND submission_started_at IS NULL
      AND claimed_at = ${token}::timestamptz
  `);
}

/**
 * Record that this attempt is about to be handed to the provider.
 *
 * The point of no return. Past it we can no longer tell a letter that was never
 * sent from one Swiss Post already has, so no worker may claim the attempt
 * again — the liveness sweep sends it to reconciliation instead of resubmitting
 * it. Returns false if another worker got there first.
 */
export async function markDispatchSubmissionStarted(
  db: Db,
  attemptId: string,
  token: DispatchClaimToken,
): Promise<boolean> {
  const marked = await db.execute<{ id: string }>(sql`
    UPDATE dispatch_attempts
    SET submission_started_at = NOW(), updated_at = NOW()
    WHERE id = ${attemptId}
      AND state = 'queued'
      AND submission_started_at IS NULL
      AND claimed_at = ${token}::timestamptz
    RETURNING id
  `);

  return marked.rows.length > 0;
}

export interface StuckDispatchRow {
  id: string;
  draftId: string;
  snapshotId: string;
  paymentAttemptId: string | null;
  submissionStarted: boolean;
}

/**
 * Queued attempts that nobody is working on any more.
 *
 * A queued attempt is normally short-lived. One that has outlived its lease is
 * a letter the user paid for that no job is going to pick up again: the worker
 * died, or BullMQ exhausted its retries. `submissionStarted` says which of the
 * two safe outcomes applies — resubmit, or hand to reconciliation.
 */
export async function findStuckDispatchAttempts(
  db: Db,
  limit: number,
): Promise<StuckDispatchRow[]> {
  const rows = await db.execute<{
    id: string;
    draft_id: string;
    snapshot_id: string;
    payment_attempt_id: string | null;
    submission_started: boolean;
  }>(sql`
    SELECT id, draft_id, snapshot_id, payment_attempt_id,
           (submission_started_at IS NOT NULL) AS submission_started
    FROM dispatch_attempts
    WHERE state = 'queued'
      AND submitted_at IS NULL
      AND created_at < NOW() - make_interval(mins => ${DISPATCH_CLAIM_TTL_MINUTES})
      AND (
        claimed_at IS NULL
        OR claimed_at < NOW() - make_interval(mins => ${DISPATCH_CLAIM_TTL_MINUTES})
      )
    ORDER BY created_at
    LIMIT ${limit}
  `);

  return rows.rows.map((row) => ({
    id: row.id,
    draftId: row.draft_id,
    snapshotId: row.snapshot_id,
    paymentAttemptId: row.payment_attempt_id,
    submissionStarted: row.submission_started,
  }));
}

/**
 * Ambiguous attempts that nothing is watching.
 *
 * When a submission's outcome is unknown, the worker hands it to reconciliation
 * — and if *that* enqueue fails, the attempt is stranded. The failure that made
 * the outcome unknown and the failure that lost the enqueue are the same
 * outage often enough that this cannot be treated as unlikely: Redis being
 * down is exactly when both happen.
 *
 * A stranded `unknown` is a paid letter nobody is looking at, so the sweep
 * re-drives reconciliation for any that has sat still past the lease TTL. The
 * reconcile job id is deterministic, so a live one is not duplicated.
 */
export async function findUnwatchedUnknownDispatches(
  db: Db,
  limit: number,
): Promise<Array<{ id: string; draftId: string }>> {
  const rows = await db.execute<{ id: string; draft_id: string }>(sql`
    SELECT id, draft_id
    FROM dispatch_attempts
    WHERE state = 'unknown'
      AND updated_at < NOW() - make_interval(mins => ${DISPATCH_CLAIM_TTL_MINUTES})
    ORDER BY updated_at
    LIMIT ${limit}
  `);

  return rows.rows.map((row) => ({ id: row.id, draftId: row.draft_id }));
}

// ---------------------------------------------------------------------------
// Get dispatch attempt by ID
// ---------------------------------------------------------------------------

export async function getDispatchAttempt(
  db: Db,
  dispatchId: string,
): Promise<DispatchAttemptRow | null> {
  const [row] = await db
    .select()
    .from(schema.dispatchAttempts)
    .where(eq(schema.dispatchAttempts.id, dispatchId))
    .limit(1);

  return row ? toDispatchRow(row) : null;
}

// ---------------------------------------------------------------------------
// Get latest dispatch for a draft
// ---------------------------------------------------------------------------

export async function getDispatchForDraft(
  db: Db,
  draftId: string,
): Promise<DispatchAttemptRow | null> {
  const [row] = await db
    .select()
    .from(schema.dispatchAttempts)
    .where(eq(schema.dispatchAttempts.draftId, draftId))
    .orderBy(desc(schema.dispatchAttempts.createdAt))
    .limit(1);

  return row ? toDispatchRow(row) : null;
}

export async function getDispatchAttemptByPaymentAttemptId(
  db: Db,
  paymentAttemptId: string,
): Promise<DispatchAttemptRow | null> {
  const [row] = await db
    .select()
    .from(schema.dispatchAttempts)
    .where(eq(schema.dispatchAttempts.paymentAttemptId, paymentAttemptId))
    .orderBy(desc(schema.dispatchAttempts.createdAt))
    .limit(1);

  return row ? toDispatchRow(row) : null;
}

// ---------------------------------------------------------------------------
// Transition dispatch state
// ---------------------------------------------------------------------------

export async function transitionDispatchState(
  db: Db,
  dispatchId: string,
  newState: string,
  extra?:
    | {
        providerReference?: string | undefined;
        trackingNumber?: string | undefined | null;
        failureReason?: string | undefined;
      }
    | undefined,
): Promise<DispatchAttemptRow> {
  const [existing] = await db
    .select()
    .from(schema.dispatchAttempts)
    .where(eq(schema.dispatchAttempts.id, dispatchId))
    .limit(1);

  if (!existing) throw notFoundError("dispatch attempt");

  // Idempotency: if already in the target state, return as-is (retries, reconciliation)
  if (existing.state === newState) {
    return toDispatchRow(existing);
  }

  try {
    assertTransitionDispatch(
      existing.state as DispatchStateValue,
      newState as DispatchStateValue,
    );
  } catch (err) {
    throw new AppError({
      family: "dispatch_rejection",
      statusCode: 409,
      code: "INVALID_STATE_TRANSITION",
      message: err instanceof Error ? err.message : "Invalid dispatch state transition",
      userMessage: "This dispatch cannot be updated to the requested state.",
      userAction: null,
    });
  }

  const values: Record<string, unknown> = {
    state: newState,
    updatedAt: new Date(),
  };

  if (extra?.providerReference !== undefined) {
    values.providerReference = extra.providerReference;
  }
  if (extra?.trackingNumber !== undefined) {
    values.trackingNumber = extra.trackingNumber;
  }
  if (extra?.failureReason !== undefined) {
    values.failureReason = extra.failureReason;
  }
  if (newState === "submitted") {
    values.submittedAt = new Date();
  }

  const [row] = await db
    .update(schema.dispatchAttempts)
    .set(values)
    .where(eq(schema.dispatchAttempts.id, dispatchId))
    .returning();

  if (!row) throw notFoundError("dispatch attempt");

  // Record the state transition event
  await recordDispatchEvent(db, {
    dispatchAttemptId: dispatchId,
    previousState: existing.state,
    newState,
    source: "system",
  });

  return toDispatchRow(row);
}

// ---------------------------------------------------------------------------
// Record dispatch status event
// ---------------------------------------------------------------------------

export async function recordDispatchEvent(
  db: Db,
  data: {
    dispatchAttemptId: string;
    previousState: string | null;
    newState: string;
    source: string;
  },
): Promise<DispatchStatusEventRow> {
  const [row] = await db
    .insert(schema.dispatchStatusEvents)
    .values({
      dispatchAttemptId: data.dispatchAttemptId,
      previousState: data.previousState as DispatchStateValue | null,
      newState: data.newState as DispatchStateValue,
      source: data.source,
    })
    .returning();

  if (!row) throw notFoundError("dispatch status event (insert returned no rows)");
  return toEventRow(row);
}
