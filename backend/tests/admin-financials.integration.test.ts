import { afterEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

import {
  fixedCostsData,
  setFixedCosts,
  financialsData,
} from "../src/modules/admin/admin-financials.service.js";
import {
  createIntegrationDb,
  integrationDatabaseUrl,
} from "./helpers/postgres-integration.js";

type IntegrationDb = Awaited<ReturnType<typeof createIntegrationDb>>["db"];

function returnedId(row: { id: string } | undefined, label: string): string {
  if (!row) throw new Error(`Expected ${label} INSERT to return an id`);
  return row.id;
}

const describeIfIntegrationDb = integrationDatabaseUrl ? describe : describe.skip;

describeIfIntegrationDb("admin financials integration", () => {
  let cleanup: (() => Promise<void>) | null = null;

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
      cleanup = null;
    }
  });

  async function setup(): Promise<IntegrationDb> {
    const ctx = await createIntegrationDb();
    cleanup = ctx.cleanup;
    return ctx.db;
  }

  /** Seed a captured payment attempt with a frozen breakdown + a receipt. */
  async function seedOrder(
    db: IntegrationDb,
    opts: {
      totalCents: number;
      providerQuotedCents: number;
      markupCents: number;
      deliveryType: "standard" | "registered";
      promoCode?: string | null;
      discountCents?: number;
    },
  ): Promise<void> {
    const breakdown = JSON.stringify({
      deliveryType: opts.deliveryType,
      providerQuotedCents: opts.providerQuotedCents,
      swissMailMarkupCents: opts.markupCents,
      totalCents: opts.totalCents,
      lineItems: [],
    });
    const { vatCents, netCents } = ((): { vatCents: number; netCents: number } => {
      if (opts.totalCents <= 0) return { vatCents: 0, netCents: 0 };
      const vat = Math.round(opts.totalCents * (0.081 / 1.081));
      return { vatCents: vat, netCents: opts.totalCents - vat };
    })();

    const session = await db.execute<{ id: string }>(sql`
      INSERT INTO sessions (resume_token_hash, resume_token_expires_at, expires_at)
      VALUES (${"h-" + Math.random()}, NOW() + interval '1 day', NOW() + interval '1 day')
      RETURNING id
    `);
    const sessionId = returnedId(session.rows[0], "session");
    const draft = await db.execute<{ id: string }>(sql`
      INSERT INTO draft_letters (session_id, locale, delivery_type)
      VALUES (${sessionId}, 'de-CH', ${opts.deliveryType})
      RETURNING id
    `);
    const draftId = returnedId(draft.rows[0], "draft");
    const inserted = await db.execute<{ id: string }>(sql`
      INSERT INTO payment_attempts (draft_id, session_id, amount_cents, state, breakdown, updated_at)
      VALUES (${draftId}, ${sessionId}, ${opts.totalCents}, 'captured', ${breakdown}::jsonb, NOW())
      RETURNING id
    `);
    const paymentId = returnedId(inserted.rows[0], "payment");
    const rnd = Math.floor(Math.random() * 1_000_000);
    await db.execute(sql`
      INSERT INTO receipts (payment_attempt_id, receipt_number, net_cents, vat_cents, total_cents,
                            discount_cents, promo_code, delivery_type, order_ref, storage_key)
      VALUES (${paymentId}, ${"EP-R-" + rnd}, ${netCents}, ${vatCents}, ${opts.totalCents},
              ${opts.discountCents ?? 0}, ${opts.promoCode ?? null}, ${opts.deliveryType},
              ${"REF-" + rnd}, ${"s3/" + rnd})
    `);
  }

  it("round-trips fixed-cost input for a month", async () => {
    const db = await setup();

    const empty = await fixedCostsData("2026-07", db);
    expect(empty.amountCents).toBeNull();

    const saved = await setFixedCosts(
      { yearMonth: "2026-07", amountCents: 120_000, note: "rent + tools" },
      db,
    );
    expect(saved.amountCents).toBe(120_000);
    expect(saved.note).toBe("rent + tools");

    // Upsert overwrites.
    const updated = await setFixedCosts(
      { yearMonth: "2026-07", amountCents: 99_000, note: null },
      db,
    );
    expect(updated.amountCents).toBe(99_000);
    expect(updated.note).toBeNull();

    const readBack = await fixedCostsData("2026-07", db);
    expect(readBack.amountCents).toBe(99_000);
  });

  it("computes a reconciling P&L and category breakdown from frozen orders", async () => {
    const db = await setup();
    await seedOrder(db, {
      totalCents: 455,
      providerQuotedCents: 165,
      markupCents: 290,
      deliveryType: "standard",
    });
    await seedOrder(db, {
      totalCents: 455,
      providerQuotedCents: 165,
      markupCents: 290,
      deliveryType: "standard",
      promoCode: "WELCOME20",
      discountCents: 100,
    });
    await seedOrder(db, {
      totalCents: 915,
      providerQuotedCents: 625,
      markupCents: 290,
      deliveryType: "registered",
    });

    // "ytd" window comfortably includes NOW()-dated rows.
    const data = await financialsData("ytd", db);

    // Gross = sum of receipt totals; identity gross = net + vat holds.
    expect(data.pnl.grossRevenueCents).toBe(455 + 455 + 915);
    expect(data.pnl.grossRevenueCents).toBe(data.pnl.netRevenueCents + data.pnl.vatCents);

    // Postage = sum of providerQuotedCents.
    expect(data.pnl.postageCostCents).toBe(165 + 165 + 625);

    // Component split: markup vs postage.
    expect(data.componentSplit.serviceMarkupCents).toBe(290 * 3);
    expect(data.componentSplit.postageCents).toBe(165 + 165 + 625);

    // Category CM1s reconcile to the headline CM1 (no rounding drift).
    const deliveryCm1 = data.byDelivery.reduce((a, r) => a + r.contributionCents, 0);
    const pricingCm1 = data.byPricing.reduce((a, r) => a + r.contributionCents, 0);
    expect(deliveryCm1).toBe(data.pnl.contributionCm1Cents);
    expect(pricingCm1).toBe(data.pnl.contributionCm1Cents);

    // Category gross sums reconcile to total gross.
    const deliveryGross = data.byDelivery.reduce((a, r) => a + r.grossCents, 0);
    expect(deliveryGross).toBe(data.pnl.grossRevenueCents);

    // Pricing segments: one full_price + one promo standard + one full_price registered.
    const promo = data.byPricing.find((r) => r.segment === "promo");
    expect(promo?.orders).toBe(1);

    // Contribution is estimated (no actual Stripe fee persisted).
    expect(data.pnl.contributionEstimated).toBe(true);
    expect(data.pnl.adSpendSource).toBe("stub");
  });
});
