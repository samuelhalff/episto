import { afterEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

import {
  recordPromoRedemption,
  releasePromoRedemptionByCode,
} from "../src/modules/payments/promo.service.js";
import {
  createIntegrationDb,
  integrationDatabaseUrl,
} from "./helpers/postgres-integration.js";

type IntegrationDb = Awaited<ReturnType<typeof createIntegrationDb>>["db"];

const describeIfIntegrationDb = integrationDatabaseUrl ? describe : describe.skip;

describeIfIntegrationDb("promo redemption consumption", () => {
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

  async function insertPromo(
    db: IntegrationDb,
    fields: {
      code: string;
      max?: number | null;
      expiresAt?: string | null;
      count?: number;
    },
  ): Promise<string> {
    const rows = await db.execute<{ id: string }>(sql`
      INSERT INTO promo_codes (code, kind, value, max_redemptions, redeemed_count, expires_at, active)
      VALUES (${fields.code}, 'percent', 20, ${fields.max ?? null}, ${fields.count ?? 0},
              ${fields.expiresAt ?? null}, true)
      RETURNING id
    `);
    const id = rows.rows[0]?.id;
    if (!id) throw new Error("insert did not return an id");
    return id;
  }

  async function countOf(db: IntegrationDb, id: string): Promise<number> {
    const r = await db.execute<{ redeemed_count: number }>(
      sql`SELECT redeemed_count FROM promo_codes WHERE id = ${id}`,
    );
    return Number(r.rows[0]?.redeemed_count ?? NaN);
  }

  it("consumes within the cap and refuses once exhausted", async () => {
    const db = await setup();
    const id = await insertPromo(db, { code: "CAP1", max: 1 });
    expect(await recordPromoRedemption(db, id)).toBe(true);
    expect(await recordPromoRedemption(db, id)).toBe(false);
    expect(await countOf(db, id)).toBe(1);
  });

  it("refuses to consume a code past its expiry (atomic re-check)", async () => {
    const db = await setup();
    const past = new Date(Date.now() - 60_000).toISOString();
    const id = await insertPromo(db, { code: "OLD", expiresAt: past });
    expect(await recordPromoRedemption(db, id)).toBe(false);
    expect(await countOf(db, id)).toBe(0);
  });

  it("releases a reserved redemption and floors at zero", async () => {
    const db = await setup();
    const id = await insertPromo(db, { code: "REL", count: 1 });
    await releasePromoRedemptionByCode(db, "REL");
    expect(await countOf(db, id)).toBe(0);
    // A second release must not go negative.
    await releasePromoRedemptionByCode(db, "rel");
    expect(await countOf(db, id)).toBe(0);
  });
});
