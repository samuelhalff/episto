import { eq, and, desc } from "drizzle-orm";
import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { notFoundError, validationError, AppError } from "../../shared/errors/index.js";
import { generateResumeToken, hashResumeToken } from "../sessions/session.service.js";
import { env } from "../../shared/config/index.js";
import {
  assertTransitionPayment,
  type PaymentState,
  type PaymentBreakdown,
} from "@episto/shared";
import { releasePromoRedemptionByCode } from "./promo.service.js";

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
  verifiedPhoneE164: string | null;
  phoneVerifiedAt: Date | null;
  orderAccessTokenHash: string | null;
  orderAccessTokenExpiresAt: Date | null;
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
    verifiedPhoneE164: row.verifiedPhoneE164 ?? null,
    phoneVerifiedAt: row.phoneVerifiedAt ?? null,
    orderAccessTokenHash: row.orderAccessTokenHash ?? null,
    orderAccessTokenExpiresAt: row.orderAccessTokenExpiresAt ?? null,
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
    verifiedPhoneE164?: string | null | undefined;
    phoneVerifiedAt?: Date | null | undefined;
  },
): Promise<PaymentAttemptRow> {
  // 0 is allowed only for fully-discounted (free-promo) orders, which skip
  // Stripe and are captured directly. Negative amounts are always invalid.
  if (data.amountCents < 0 || !Number.isInteger(data.amountCents)) {
    throw validationError("Amount must be a non-negative integer in cents.");
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
      verifiedPhoneE164: data.verifiedPhoneE164 ?? null,
      phoneVerifiedAt: data.phoneVerifiedAt ?? null,
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

export async function getPaymentAttemptById(
  db: Db,
  paymentId: string,
): Promise<PaymentAttemptRow | null> {
  const [row] = await db
    .select()
    .from(schema.paymentAttempts)
    .where(eq(schema.paymentAttempts.id, paymentId))
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

export async function setPaymentIntentId(
  db: Db,
  paymentId: string,
  stripePaymentIntentId: string,
): Promise<PaymentAttemptRow> {
  const [row] = await db
    .update(schema.paymentAttempts)
    .set({
      stripePaymentIntentId,
      updatedAt: new Date(),
    })
    .where(eq(schema.paymentAttempts.id, paymentId))
    .returning();

  if (!row) throw notFoundError("payment attempt");
  return toPaymentRow(row);
}

// ---------------------------------------------------------------------------
// Transition payment state
// ---------------------------------------------------------------------------

export interface TransitionPaymentResult {
  payment: PaymentAttemptRow;
  /**
   * Raw order access token, present only when transitioning to 'captured'
   * for the first time because it must be hashed and persisted to the DB.
   * Customer-facing emails must not embed this raw token directly; dispatch
   * notifications should use signed order-access tokens issued on demand.
   */
  rawOrderAccessToken: string | null;
}

export interface TransitionPaymentExtra {
  stripePaymentIntentId?: string | undefined;
  stripeChargeId?: string | undefined;
  failureReason?: string | undefined;
  refundReason?: string | undefined;
  // Immutable capture attribution + actual Stripe fee. Written fill-if-missing:
  // capture time is set once and never overwritten (a webhook retry only fills
  // a gap). The fee triple is all-or-nothing to satisfy the DB pair constraint.
  capturedAt?: Date | undefined;
  capturedAtSource?: "webhook" | "local_capture" | "stripe_backfill" | undefined;
  stripeBalanceTransactionId?: string | undefined;
  stripeFeeCents?: number | undefined;
  stripeFeeCurrency?: string | undefined;
  stripeFeeRecordedAt?: Date | undefined;
}

/** Additive fills for immutable capture time / actual fee — never overwrite. */
export function captureFillValues(
  existing: {
    capturedAt: Date | null;
    stripeFeeCents: number | null;
    stripeBalanceTransactionId: string | null;
  },
  extra: TransitionPaymentExtra | undefined,
): Record<string, unknown> {
  const fills: Record<string, unknown> = {};
  if (!existing.capturedAt && extra?.capturedAt && extra.capturedAtSource) {
    fills.capturedAt = extra.capturedAt;
    fills.capturedAtSource = extra.capturedAtSource;
  }
  if (
    existing.stripeFeeCents == null &&
    extra?.stripeFeeCents != null &&
    extra.stripeFeeCurrency != null &&
    extra.stripeFeeRecordedAt != null
  ) {
    fills.stripeFeeCents = extra.stripeFeeCents;
    fills.stripeFeeCurrency = extra.stripeFeeCurrency;
    fills.stripeFeeRecordedAt = extra.stripeFeeRecordedAt;
  }
  if (
    existing.stripeBalanceTransactionId == null &&
    extra?.stripeBalanceTransactionId != null
  ) {
    fills.stripeBalanceTransactionId = extra.stripeBalanceTransactionId;
  }
  return fills;
}

export async function transitionPaymentState(
  db: Db,
  paymentId: string,
  newState: string,
  extra?: TransitionPaymentExtra | undefined,
): Promise<TransitionPaymentResult> {
  const [existing] = await db
    .select()
    .from(schema.paymentAttempts)
    .where(eq(schema.paymentAttempts.id, paymentId))
    .limit(1);

  if (!existing) throw notFoundError("payment attempt");

  // Idempotency: if already in the target state, return as-is (webhook retries)
  // — but still fill a missing capture time / actual fee that a retry supplies.
  if (existing.state === newState) {
    const fills = captureFillValues(existing, extra);
    if (Object.keys(fills).length === 0) {
      return { payment: toPaymentRow(existing), rawOrderAccessToken: null };
    }
    fills.updatedAt = new Date();
    const [filled] = await db
      .update(schema.paymentAttempts)
      .set(fills)
      .where(eq(schema.paymentAttempts.id, paymentId))
      .returning();
    return { payment: toPaymentRow(filled ?? existing), rawOrderAccessToken: null };
  }

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
  Object.assign(values, captureFillValues(existing, extra));

  // On first capture: generate a distinct long-lived order access token.
  // This separates paid-order access from the ephemeral drafting session token.
  let rawOrderAccessToken: string | null = null;
  if (newState === "captured" && !existing.orderAccessTokenHash) {
    rawOrderAccessToken = generateResumeToken();
    // Order access token lifetime tracks content retention so a paid order stays
    // accessible for exactly as long as its content is retained.
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + env().ORDER_ACCESS_DAYS);
    values.orderAccessTokenHash = hashResumeToken(rawOrderAccessToken);
    values.orderAccessTokenExpiresAt = expiresAt;
  }

  const [row] = await db
    .update(schema.paymentAttempts)
    .set(values)
    .where(eq(schema.paymentAttempts.id, paymentId))
    .returning();

  if (!row) throw notFoundError("payment attempt");

  // Return a reserved promo redemption when a discounted attempt ends without a
  // capture. The paid+discounted path reserves at creation (free orders reserve
  // at capture instead), so a pre-capture attempt (pending/authorized) that goes
  // to a terminal unpaid state (cancelled OR failed — e.g. a card decline) still
  // holds exactly one reservation. Capture consumes it and must NOT release. Both
  // target states are terminal, so this fires at most once per attempt.
  const wasPreCapture = existing.state === "pending" || existing.state === "authorized";
  const endedUnpaid = newState === "cancelled" || newState === "failed";
  if (wasPreCapture && endedUnpaid) {
    const code = (existing.breakdown as PaymentBreakdown | null)?.promo?.code;
    if (code) await releasePromoRedemptionByCode(db, code);
  }

  return { payment: toPaymentRow(row), rawOrderAccessToken };
}
