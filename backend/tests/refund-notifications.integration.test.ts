/**
 * The refund ledger must tell the customer once — and only once.
 *
 * `syncRefundsForCharge` is deliberately idempotent and is called again for
 * every `charge.refunded` / `charge.refund.updated` webhook, from dispatch
 * settlement, and from the admin refund action. So "enqueue an email whenever a
 * refund is successful" would mail the customer on every replay. The behaviour
 * under test is the transition: a refund that was not `succeeded` in the ledger
 * and now is.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";

import {
  createIntegrationDb,
  integrationDatabaseUrl,
} from "./helpers/postgres-integration.js";

type IntegrationDb = Awaited<ReturnType<typeof createIntegrationDb>>["db"];

interface StripeRefundRow {
  refundId: string;
  chargeId: string;
  amountCents: number;
  currency: string;
  status: string;
  stripeCreatedAt: Date;
  balanceTransactionId: string | null;
  feeCents: number | null;
  failureReason: string | null;
}

const mocks = vi.hoisted(() => ({
  refunds: [] as unknown[],
  enqueued: [] as Array<{
    paymentAttemptId: string;
    stripeRefundId: string;
    amountCents: number;
  }>,
}));

vi.mock("../src/modules/payments/adapters/stripe.adapter.js", () => ({
  listRefundsForCharge: vi.fn(async () => mocks.refunds),
}));

vi.mock("../src/modules/payments/refund-notifications.js", () => ({
  enqueueRefundConfirmedEmailSafe: vi.fn(
    (_db: unknown, args: (typeof mocks.enqueued)[number]) => {
      mocks.enqueued.push(args);
    },
  ),
}));

const { syncRefundsForCharge } =
  await import("../src/modules/payments/refund-ledger.service.js");

function refund(overrides: Partial<StripeRefundRow> = {}): StripeRefundRow {
  return {
    refundId: "re_1",
    chargeId: "ch_1",
    amountCents: 455,
    currency: "CHF",
    status: "succeeded",
    stripeCreatedAt: new Date("2026-07-01T10:00:00Z"),
    balanceTransactionId: "txn_1",
    feeCents: 0,
    failureReason: null,
    ...overrides,
  };
}

const describeIfIntegrationDb = integrationDatabaseUrl ? describe : describe.skip;

describeIfIntegrationDb("refund confirmation emails", () => {
  let cleanup: (() => Promise<void>) | null = null;

  beforeEach(() => {
    mocks.refunds = [];
    mocks.enqueued = [];
  });

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
      cleanup = null;
    }
  });

  async function seedCapturedPayment(chargeId: string): Promise<{
    db: IntegrationDb;
    paymentId: string;
  }> {
    const ctx = await createIntegrationDb();
    cleanup = ctx.cleanup;
    const db = ctx.db;

    const session = await db.execute<{ id: string }>(sql`
      INSERT INTO sessions (resume_token_hash, resume_token_expires_at, expires_at, email, locale)
      VALUES (${"h-" + Math.random()}, NOW() + interval '1 day', NOW() + interval '1 day',
              'customer@example.test', 'de-CH')
      RETURNING id
    `);
    const sessionId = session.rows[0]?.id;
    if (!sessionId) throw new Error("session insert returned no id");

    const draft = await db.execute<{ id: string }>(sql`
      INSERT INTO draft_letters (session_id, locale, delivery_type)
      VALUES (${sessionId}, 'de-CH', 'standard')
      RETURNING id
    `);
    const draftId = draft.rows[0]?.id;
    if (!draftId) throw new Error("draft insert returned no id");

    const payment = await db.execute<{ id: string }>(sql`
      INSERT INTO payment_attempts (draft_id, session_id, amount_cents, state, breakdown,
                                    stripe_charge_id, captured_at, captured_at_source, updated_at)
      VALUES (${draftId}, ${sessionId}, 455, 'captured', '{}'::jsonb,
              ${chargeId}, NOW(), 'webhook', NOW())
      RETURNING id
    `);
    const paymentId = payment.rows[0]?.id;
    if (!paymentId) throw new Error("payment insert returned no id");

    // A succeeded refund cannot be written without a VAT split, and the split is
    // allocated from the receipt — so the receipt is part of the fixture, not
    // decoration.
    await db.execute(sql`
      INSERT INTO receipts (payment_attempt_id, receipt_number, net_cents, vat_cents,
                            total_cents, order_ref, storage_key)
      VALUES (${paymentId}, ${"R-" + chargeId}, 421, 34, 455,
              ${"EP-" + chargeId}, ${"receipts/" + chargeId + ".pdf"})
    `);

    return { db, paymentId };
  }

  it("notifies once when a refund first succeeds, and not on replayed syncs", async () => {
    const { db, paymentId } = await seedCapturedPayment("ch_notify_1");

    mocks.refunds = [refund({ chargeId: "ch_notify_1" })];
    expect(await syncRefundsForCharge(db, "ch_notify_1")).toBe("refunded");
    expect(mocks.enqueued).toEqual([
      { paymentAttemptId: paymentId, stripeRefundId: "re_1", amountCents: 455 },
    ]);

    // The same webhook again — Stripe redelivers, and settlement re-syncs.
    mocks.enqueued = [];
    await syncRefundsForCharge(db, "ch_notify_1");
    expect(mocks.enqueued).toEqual([]);
  });

  it("stays silent while a refund is pending and notifies when it settles", async () => {
    const { db, paymentId } = await seedCapturedPayment("ch_notify_2");

    mocks.refunds = [refund({ chargeId: "ch_notify_2", status: "pending" })];
    expect(await syncRefundsForCharge(db, "ch_notify_2")).toBe("refund_pending");
    expect(mocks.enqueued).toEqual([]);

    mocks.refunds = [refund({ chargeId: "ch_notify_2", status: "succeeded" })];
    await syncRefundsForCharge(db, "ch_notify_2");
    expect(mocks.enqueued).toEqual([
      { paymentAttemptId: paymentId, stripeRefundId: "re_1", amountCents: 455 },
    ]);
  });

  it("never announces a refund that failed", async () => {
    const { db } = await seedCapturedPayment("ch_notify_3");

    mocks.refunds = [refund({ chargeId: "ch_notify_3", status: "failed" })];
    expect(await syncRefundsForCharge(db, "ch_notify_3")).toBe("captured");
    expect(mocks.enqueued).toEqual([]);
  });

  it("sends one email per part when a payment is refunded in two parts", async () => {
    const { db, paymentId } = await seedCapturedPayment("ch_notify_4");

    mocks.refunds = [
      refund({ chargeId: "ch_notify_4", refundId: "re_a", amountCents: 200 }),
    ];
    await syncRefundsForCharge(db, "ch_notify_4");
    expect(mocks.enqueued).toEqual([
      { paymentAttemptId: paymentId, stripeRefundId: "re_a", amountCents: 200 },
    ]);

    mocks.enqueued = [];
    mocks.refunds = [
      refund({ chargeId: "ch_notify_4", refundId: "re_a", amountCents: 200 }),
      refund({
        chargeId: "ch_notify_4",
        refundId: "re_b",
        balanceTransactionId: "txn_2",
        amountCents: 255,
        stripeCreatedAt: new Date("2026-07-02T10:00:00Z"),
      }),
    ];
    await syncRefundsForCharge(db, "ch_notify_4");
    // Only the new part: the first was already announced.
    expect(mocks.enqueued).toEqual([
      { paymentAttemptId: paymentId, stripeRefundId: "re_b", amountCents: 255 },
    ]);
  });

  it("does not notify when the charge matches no known payment", async () => {
    const { db } = await seedCapturedPayment("ch_notify_5");

    mocks.refunds = [refund({ chargeId: "ch_unknown" })];
    expect(await syncRefundsForCharge(db, "ch_unknown")).toBeNull();
    expect(mocks.enqueued).toEqual([]);
  });
});
