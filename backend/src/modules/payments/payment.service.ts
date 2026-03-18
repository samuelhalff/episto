import { eq, and, sql, desc } from "drizzle-orm";
import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { notFoundError, validationError, AppError } from "../../shared/errors/index.js";
import {
  assertTransitionPayment,
  type PaymentState,
  type PaymentBreakdown,
} from "@swiss-mail/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PaymentStateValue = (typeof PaymentState)[keyof typeof PaymentState];

export interface PaymentAttemptRow {
  id: string;
  draftId: string;
  sessionId: string;
  state: string;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  amountCents: number;
  currency: string;
  breakdown: unknown;
  failureReason: string | null;
  refundReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toPaymentRow(
  row: typeof schema.paymentAttempts.$inferSelect,
): PaymentAttemptRow {
  return {
    id: row.id,
    draftId: row.draftId,
    sessionId: row.sessionId,
    state: row.state,
    stripePaymentIntentId: row.stripePaymentIntentId,
    stripeChargeId: row.stripeChargeId,
    amountCents: row.amountCents,
    currency: row.currency,
    breakdown: row.breakdown,
    failureReason: row.failureReason,
    refundReason: row.refundReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Create payment attempt
// ---------------------------------------------------------------------------

export async function createPaymentAttempt(
  db: Db,
  data: {
    draftId: string;
    sessionId: string;
    amountCents: number;
    breakdown: PaymentBreakdown;
  },
): Promise<PaymentAttemptRow> {
  if (data.amountCents <= 0) {
    throw validationError("Amount must be a positive integer in cents.");
  }

  const [row] = await db
    .insert(schema.paymentAttempts)
    .values({
      draftId: data.draftId,
      sessionId: data.sessionId,
      state: "pending",
      amountCents: data.amountCents,
      currency: "CHF",
      breakdown: data.breakdown,
    })
    .returning();

  if (!row) throw new Error("Failed to create payment attempt");
  return toPaymentRow(row);
}

// ---------------------------------------------------------------------------
// Get payment attempt (scoped to session)
// ---------------------------------------------------------------------------

export async function getPaymentAttempt(
  db: Db,
  paymentId: string,
  sessionId: string,
): Promise<PaymentAttemptRow | null> {
  const [row] = await db
    .select()
    .from(schema.paymentAttempts)
    .where(
      and(
        eq(schema.paymentAttempts.id, paymentId),
        eq(schema.paymentAttempts.sessionId, sessionId),
      ),
    )
    .limit(1);

  return row ? toPaymentRow(row) : null;
}

// ---------------------------------------------------------------------------
// Get latest payment for a draft
// ---------------------------------------------------------------------------

export async function getPaymentForDraft(
  db: Db,
  draftId: string,
): Promise<PaymentAttemptRow | null> {
  const [row] = await db
    .select()
    .from(schema.paymentAttempts)
    .where(eq(schema.paymentAttempts.draftId, draftId))
    .orderBy(desc(schema.paymentAttempts.createdAt))
    .limit(1);

  return row ? toPaymentRow(row) : null;
}

// ---------------------------------------------------------------------------
// Transition payment state
// ---------------------------------------------------------------------------

export async function transitionPaymentState(
  db: Db,
  paymentId: string,
  newState: string,
  extra?: {
    stripePaymentIntentId?: string | undefined;
    stripeChargeId?: string | undefined;
    failureReason?: string | undefined;
    refundReason?: string | undefined;
  } | undefined,
): Promise<PaymentAttemptRow> {
  const [existing] = await db
    .select()
    .from(schema.paymentAttempts)
    .where(eq(schema.paymentAttempts.id, paymentId))
    .limit(1);

  if (!existing) throw notFoundError("payment attempt");

  try {
    assertTransitionPayment(
      existing.state as PaymentStateValue,
      newState as PaymentStateValue,
    );
  } catch (err) {
    throw new AppError({
      family: "validation_error",
      statusCode: 409,
      code: "INVALID_STATE_TRANSITION",
      message: err instanceof Error ? err.message : "Invalid payment state transition",
      userMessage: "This payment cannot be updated to the requested state.",
      userAction: null,
    });
  }

  const values: Record<string, unknown> = {
    state: newState,
    updatedAt: new Date(),
  };

  if (extra?.stripePaymentIntentId !== undefined) {
    values.stripePaymentIntentId = extra.stripePaymentIntentId;
  }
  if (extra?.stripeChargeId !== undefined) {
    values.stripeChargeId = extra.stripeChargeId;
  }
  if (extra?.failureReason !== undefined) {
    values.failureReason = extra.failureReason;
  }
  if (extra?.refundReason !== undefined) {
    values.refundReason = extra.refundReason;
  }

  const [row] = await db
    .update(schema.paymentAttempts)
    .set(values)
    .where(eq(schema.paymentAttempts.id, paymentId))
    .returning();

  if (!row) throw notFoundError("payment attempt");
  return toPaymentRow(row);
}
