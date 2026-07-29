/**
 * The receipt row and the promise to email it must be one commit.
 *
 * The receipt row is also this flow's idempotency guard: `issueReceiptForCapturedPayment`
 * returns immediately if one already exists. So if the row committed and the
 * outbox row did not, no retry could ever heal it — not the caller's, not
 * Stripe's webhook redelivery. The customer would be permanently owed a VAT
 * receipt and the order-access link that is their only way back to the letter
 * they paid for, and nothing in the system would record the debt.
 *
 * These tests are about that pairing, from both sides: they commit together, or
 * neither commits and the operation is genuinely repeatable.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";

import {
  createIntegrationDb,
  integrationDatabaseUrl,
} from "./helpers/postgres-integration.js";

type IntegrationDb = Awaited<ReturnType<typeof createIntegrationDb>>["db"];

const mocks = vi.hoisted(() => ({
  add: vi.fn(async () => undefined),
  uploaded: [] as string[],
  tokenError: null as Error | null,
}));

vi.mock("../src/queue/index.js", () => ({
  getQueue: () => ({ add: mocks.add }),
  QUEUE_NAMES: { SEND_EMAIL: "send-email" },
}));

vi.mock("../src/shared/config/index.js", () => ({
  isEnvLoaded: () => false,
  env: () => ({
    CORS_ORIGIN: "https://episto.ch",
    APP_PUBLIC_URL: "https://episto.ch",
    STATEMENT_RETENTION_DAYS: 10,
    APP_DISPLAY_NAME: "episto",
    SUPPORT_EMAIL: "contact@episto.ch",
    LEGAL_ENTITY_NAME: "West Bay SA",
    LEGAL_ENTITY_ADDRESS_LINE_1: "Route de Genthod 1",
    LEGAL_ENTITY_ADDRESS_LINE_2: "1294 Genthod",
    LEGAL_ENTITY_COUNTRY: "Switzerland",
    LEGAL_ENTITY_UID_VAT: "CHE-107.892.984 MWST",
  }),
}));

vi.mock("../src/modules/orders/order-access-token.js", () => ({
  issueOrderAccessToken: vi.fn(async () => {
    if (mocks.tokenError) throw mocks.tokenError;
    return "test-order-token";
  }),
  orderAccessGeneration: () => "gen1",
}));

vi.mock("../src/modules/rendering/render.service.js", () => ({
  renderPdfBufferFromHtml: vi.fn(async () => ({
    pdfBuffer: Buffer.from("%PDF-1.4 receipt"),
  })),
}));

vi.mock("../src/modules/files/adapters/s3.adapter.js", () => ({
  uploadObject: vi.fn(async (key: string) => {
    mocks.uploaded.push(key);
  }),
  // If this is ever reached the caller failed to hand over the buffer it just
  // rendered, which would mean a network round trip inside the transaction.
  downloadObjectBuffer: vi.fn(async () => {
    throw new Error("receipt PDF was downloaded instead of reused");
  }),
}));

const { issueReceiptForCapturedPayment } =
  await import("../src/modules/payments/receipt.service.js");

const describeIfIntegrationDb = integrationDatabaseUrl ? describe : describe.skip;

describeIfIntegrationDb("receipt and its email commit together", () => {
  let cleanup: (() => Promise<void>) | null = null;
  let db: IntegrationDb;
  let paymentId: string;

  beforeEach(async () => {
    mocks.add.mockClear();
    mocks.add.mockResolvedValue(undefined);
    mocks.uploaded = [];
    mocks.tokenError = null;

    const ctx = await createIntegrationDb();
    cleanup = ctx.cleanup;
    db = ctx.db;

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

    // The order-access token fields must be present: without them the email
    // cannot be addressed and the flow legitimately records no promise.
    const payment = await db.execute<{ id: string }>(sql`
      INSERT INTO payment_attempts (draft_id, session_id, amount_cents, state, breakdown,
                                    captured_at, captured_at_source,
                                    order_access_token_hash, order_access_token_expires_at,
                                    updated_at)
      VALUES (${draftId}, ${sessionId}, 455, 'captured', '{}'::jsonb,
              NOW(), 'webhook', 'token-hash', NOW() + interval '30 days', NOW())
      RETURNING id
    `);
    const id = payment.rows[0]?.id;
    if (!id) throw new Error("payment insert returned no id");
    paymentId = id;
  });

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
      cleanup = null;
    }
  });

  async function countRows(): Promise<{ receipts: number; outbox: number }> {
    const receipts = await db.execute<{ count: number }>(
      sql`SELECT COUNT(*)::int AS count FROM receipts WHERE payment_attempt_id = ${paymentId}`,
    );
    const outbox = await db.execute<{ count: number }>(
      sql`SELECT COUNT(*)::int AS count FROM email_outbox WHERE template = 'payment-receipt'`,
    );
    return {
      receipts: Number(receipts.rows[0]?.count ?? 0),
      outbox: Number(outbox.rows[0]?.count ?? 0),
    };
  }

  it("writes the receipt and the email it owes in the same commit", async () => {
    await issueReceiptForCapturedPayment(db, paymentId);

    expect(await countRows()).toEqual({ receipts: 1, outbox: 1 });
    // Dispatched only after the commit, and exactly once.
    expect(mocks.add).toHaveBeenCalledTimes(1);
  });

  it("keeps no receipt at all when the email it owes cannot be recorded", async () => {
    mocks.tokenError = new Error("order-access key unavailable");

    await expect(issueReceiptForCapturedPayment(db, paymentId)).rejects.toThrow(
      "order-access key unavailable",
    );

    // The point of the whole change. A committed receipt here would be
    // permanent: the guard at the top of issueReceiptForCapturedPayment would
    // short-circuit every retry, including Stripe's redelivery, and the
    // customer would never be sent anything.
    expect(await countRows()).toEqual({ receipts: 0, outbox: 0 });
    expect(mocks.add).not.toHaveBeenCalled();

    // And because nothing committed, the operation is genuinely repeatable.
    mocks.tokenError = null;
    await issueReceiptForCapturedPayment(db, paymentId);
    expect(await countRows()).toEqual({ receipts: 1, outbox: 1 });
  });

  it("keeps both rows when only the queue hand-off fails, and does not throw", async () => {
    mocks.add.mockRejectedValue(new Error("Redis unreachable"));

    // A dead Redis must not fail a capture. The row is `pending`, which is
    // exactly what the stall sweep and /admin/email-outbox exist to find.
    await expect(issueReceiptForCapturedPayment(db, paymentId)).resolves.toBeUndefined();

    expect(await countRows()).toEqual({ receipts: 1, outbox: 1 });
    const status = await db.execute<{ status: string }>(
      sql`SELECT status FROM email_outbox WHERE template = 'payment-receipt'`,
    );
    expect(status.rows[0]?.status).toBe("pending");
  });

  it("still issues the receipt for a customer who left no email address", async () => {
    await db.execute(sql`
      UPDATE sessions SET email = NULL
      WHERE id = (SELECT session_id FROM payment_attempts WHERE id = ${paymentId})
    `);

    await issueReceiptForCapturedPayment(db, paymentId);

    // The receipt is a bookkeeping record we are required to keep whether or not
    // anyone can be mailed it, so the missing address costs the email only.
    expect(await countRows()).toEqual({ receipts: 1, outbox: 0 });
    expect(mocks.add).not.toHaveBeenCalled();
  });
});
