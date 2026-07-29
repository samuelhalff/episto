import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import * as schema from "../src/db/schema/index.js";
import { rotateOrderAccessToken } from "../src/modules/orders/order-access-rotation.js";
import {
  createIntegrationDb,
  integrationDatabaseUrl,
} from "./helpers/postgres-integration.js";

// ---------------------------------------------------------------------------
// Rotating an order's access token, against a real database.
//
// Rotation is a single UPDATE with conditions on it, which is exactly the kind
// of thing a mocked query builder will happily agree with while the real
// statement matches nothing. What matters here is the row afterwards: a
// different hash, the same expiry, and no rotation at all for an order whose
// access has already been withdrawn.
// ---------------------------------------------------------------------------

type IntegrationDb = Awaited<ReturnType<typeof createIntegrationDb>>["db"];

const describeIfIntegrationDb = integrationDatabaseUrl ? describe : describe.skip;

const EXPIRES_AT = new Date("2027-01-01T00:00:00.000Z");

async function seedCapturedOrder(
  db: IntegrationDb,
  overrides: {
    orderAccessTokenHash?: string | null;
    orderAccessTokenExpiresAt?: Date | null;
  } = {},
): Promise<string> {
  const [session] = await db
    .insert(schema.sessions)
    .values({
      type: "guest",
      resumeTokenHash: `hash-${Math.random().toString(36).slice(2)}`,
      resumeTokenExpiresAt: new Date(Date.now() + 3_600_000),
      locale: "de-CH",
      expiresAt: new Date(Date.now() + 3_600_000),
    })
    .returning();
  if (!session) throw new Error("failed to create session");

  const [draft] = await db
    .insert(schema.draftLetters)
    .values({ sessionId: session.id, status: "submitted", locale: "de-CH" })
    .returning();
  if (!draft) throw new Error("failed to create draft");

  const [payment] = await db
    .insert(schema.paymentAttempts)
    .values({
      sessionId: session.id,
      draftId: draft.id,
      state: "captured",
      amountCents: 460,
      breakdown: {
        deliveryType: "standard",
        providerQuotedCents: 170,
        swissMailMarkupCents: 290,
        totalCents: 460,
        providerQuoteReference: "rotation-test",
        attachmentHandling: "excluded",
        lineItems: [
          { label: "Provider quote", amountCents: 170, source: "provider" },
          { label: "Episto service", amountCents: 290, source: "swiss_mail" },
        ],
      },
      orderAccessTokenHash:
        overrides.orderAccessTokenHash === undefined
          ? "original-access-token-hash"
          : overrides.orderAccessTokenHash,
      orderAccessTokenExpiresAt:
        overrides.orderAccessTokenExpiresAt === undefined
          ? EXPIRES_AT
          : overrides.orderAccessTokenExpiresAt,
    })
    .returning();
  if (!payment) throw new Error("failed to create payment attempt");

  return payment.id;
}

describeIfIntegrationDb("rotateOrderAccessToken", () => {
  it("replaces the access-token hash and leaves the expiry where it was", async () => {
    const { db, cleanup } = await createIntegrationDb();
    try {
      const paymentId = await seedCapturedOrder(db);

      expect(
        await rotateOrderAccessToken(db, paymentId, "original-access-token-hash"),
      ).toBe(true);

      const [row] = await db
        .select({
          hash: schema.paymentAttempts.orderAccessTokenHash,
          expiresAt: schema.paymentAttempts.orderAccessTokenExpiresAt,
        })
        .from(schema.paymentAttempts)
        .where(eq(schema.paymentAttempts.id, paymentId));

      expect(row?.hash).toBeTruthy();
      expect(row?.hash).not.toBe("original-access-token-hash");
      // Rotation replaces the key, it does not shorten the customer's access:
      // moving the expiry here would quietly cut short the retention window
      // they paid for.
      expect(row?.expiresAt?.toISOString()).toBe(EXPIRES_AT.toISOString());
    } finally {
      await cleanup();
    }
  });

  it("issues a different hash on every rotation", async () => {
    const { db, cleanup } = await createIntegrationDb();
    try {
      const paymentId = await seedCapturedOrder(db);

      await rotateOrderAccessToken(db, paymentId, "original-access-token-hash");
      const [first] = await db
        .select({ hash: schema.paymentAttempts.orderAccessTokenHash })
        .from(schema.paymentAttempts)
        .where(eq(schema.paymentAttempts.id, paymentId));

      await rotateOrderAccessToken(db, paymentId, first?.hash ?? "");
      const [second] = await db
        .select({ hash: schema.paymentAttempts.orderAccessTokenHash })
        .from(schema.paymentAttempts)
        .where(eq(schema.paymentAttempts.id, paymentId));

      expect(second?.hash).not.toBe(first?.hash);
    } finally {
      await cleanup();
    }
  });

  /**
   * An order erased under a data-deletion request has both columns cleared.
   * Rotating one would put a fresh hash back on the row and hand the order a
   * working credential again — undoing the erasure by accident.
   */
  it("refuses to rotate an order whose access has already been withdrawn", async () => {
    const { db, cleanup } = await createIntegrationDb();
    try {
      const paymentId = await seedCapturedOrder(db, {
        orderAccessTokenHash: null,
        orderAccessTokenExpiresAt: null,
      });

      expect(
        await rotateOrderAccessToken(db, paymentId, "original-access-token-hash"),
      ).toBe(false);

      const [row] = await db
        .select({ hash: schema.paymentAttempts.orderAccessTokenHash })
        .from(schema.paymentAttempts)
        .where(eq(schema.paymentAttempts.id, paymentId));

      expect(row?.hash).toBeNull();
    } finally {
      await cleanup();
    }
  });

  /**
   * Two requests carrying the same link both authenticate, and without the
   * compare-and-set both rotate. The second would invalidate the link the first
   * is already composing an email around, so the message that arrives last is
   * the one that no longer opens the order — the exact failure the endpoint
   * exists to prevent. Only the request holding the current hash may win.
   */
  it("refuses to rotate for a caller holding a superseded hash", async () => {
    const { db, cleanup } = await createIntegrationDb();
    try {
      const paymentId = await seedCapturedOrder(db);

      expect(
        await rotateOrderAccessToken(db, paymentId, "original-access-token-hash"),
      ).toBe(true);
      expect(
        await rotateOrderAccessToken(db, paymentId, "original-access-token-hash"),
      ).toBe(false);
    } finally {
      await cleanup();
    }
  });

  /**
   * An expired window is not a lock waiting for a new key — it is closed. Minting
   * a fresh credential against it would hand back access the customer's retention
   * period had already ended.
   */
  it("refuses to rotate an order whose access window has closed", async () => {
    const { db, cleanup } = await createIntegrationDb();
    try {
      const paymentId = await seedCapturedOrder(db, {
        orderAccessTokenExpiresAt: new Date(Date.now() - 60_000),
      });

      expect(
        await rotateOrderAccessToken(db, paymentId, "original-access-token-hash"),
      ).toBe(false);
    } finally {
      await cleanup();
    }
  });
});
