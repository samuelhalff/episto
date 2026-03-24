import { eq, desc } from "drizzle-orm";
import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { notFoundError, AppError } from "../../shared/errors/index.js";
import {
  assertTransitionDispatch,
  type DispatchState,
} from "@swiss-mail/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DispatchStateValue = (typeof DispatchState)[keyof typeof DispatchState];

export interface DispatchAttemptRow {
  id: string;
  draftId: string;
  snapshotId: string;
  state: string;
  providerName: string;
  providerReference: string | null;
  providerPayload: unknown;
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
  providerEventData: unknown;
  createdAt: Date;
}

function toDispatchRow(
  row: typeof schema.dispatchAttempts.$inferSelect,
): DispatchAttemptRow {
  return {
    id: row.id,
    draftId: row.draftId,
    snapshotId: row.snapshotId,
    state: row.state,
    providerName: row.providerName,
    providerReference: row.providerReference,
    providerPayload: row.providerPayload,
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
    providerEventData: row.providerEventData,
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
    providerName: string;
  },
): Promise<DispatchAttemptRow> {
  const [row] = await db
    .insert(schema.dispatchAttempts)
    .values({
      draftId: data.draftId,
      snapshotId: data.snapshotId,
      state: "queued",
      providerName: data.providerName,
    })
    .returning();

  if (!row) throw notFoundError("dispatch attempt (insert returned no rows)");
  return toDispatchRow(row);
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

// ---------------------------------------------------------------------------
// Transition dispatch state
// ---------------------------------------------------------------------------

export async function transitionDispatchState(
  db: Db,
  dispatchId: string,
  newState: string,
  extra?: {
    providerReference?: string | undefined;
    providerPayload?: unknown | undefined;
    failureReason?: string | undefined;
  } | undefined,
): Promise<DispatchAttemptRow> {
  const [existing] = await db
    .select()
    .from(schema.dispatchAttempts)
    .where(eq(schema.dispatchAttempts.id, dispatchId))
    .limit(1);

  if (!existing) throw notFoundError("dispatch attempt");

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
  if (extra?.providerPayload !== undefined) {
    values.providerPayload = extra.providerPayload;
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
    providerEventData?: unknown | undefined;
  },
): Promise<DispatchStatusEventRow> {
  const [row] = await db
    .insert(schema.dispatchStatusEvents)
    .values({
      dispatchAttemptId: data.dispatchAttemptId,
      previousState: data.previousState as DispatchStateValue | null,
      newState: data.newState as DispatchStateValue,
      source: data.source,
      providerEventData: data.providerEventData ?? null,
    })
    .returning();

  if (!row) throw notFoundError("dispatch status event (insert returned no rows)");
  return toEventRow(row);
}
