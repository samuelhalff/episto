import { afterEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

import {
  createAdminPromo,
  deleteAdminPromo,
  listAdminPromos,
  setAdminPromoActive,
  updateAdminPromo,
} from "../src/modules/admin/admin-promos.service.js";
import {
  createIntegrationDb,
  integrationDatabaseUrl,
} from "./helpers/postgres-integration.js";

type IntegrationDb = Awaited<ReturnType<typeof createIntegrationDb>>["db"];

const describeIfIntegrationDb = integrationDatabaseUrl ? describe : describe.skip;

const NOW = new Date("2026-07-26T12:00:00.000Z");

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    code: "SAVE20",
    kind: "percent" as const,
    value: 20,
    maxRedemptions: null as number | null,
    expiresAt: null as string | null,
    active: true,
    note: null as string | null,
    ...overrides,
  };
}

describeIfIntegrationDb("admin promos integration", () => {
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

  /** Force a redemption count without going through the whole payment flow. */
  async function setRedeemed(
    db: IntegrationDb,
    id: string,
    count: number,
  ): Promise<void> {
    await db.execute(
      sql`UPDATE promo_codes SET redeemed_count = ${count} WHERE id = ${id}`,
    );
  }

  it("creates a reusable percentage code and lists it as active", async () => {
    const db = await setup();
    const promo = await createAdminPromo(baseInput(), db, NOW);
    expect(promo.code).toBe("SAVE20");
    expect(promo.status).toBe("active");
    expect(promo.maxRedemptions).toBeNull();

    const active = await listAdminPromos("active", db, NOW);
    expect(active.map((p) => p.code)).toContain("SAVE20");
  });

  it("creates a one-time code (maxRedemptions=1) and marks it expired once redeemed", async () => {
    const db = await setup();
    const promo = await createAdminPromo(
      baseInput({ code: "ONCE", kind: "free", value: 0, maxRedemptions: 1 }),
      db,
      NOW,
    );
    await setRedeemed(db, promo.id, 1);

    const expired = await listAdminPromos("expired", db, NOW);
    expect(expired.map((p) => p.code)).toContain("ONCE");
    const active = await listAdminPromos("active", db, NOW);
    expect(active.map((p) => p.code)).not.toContain("ONCE");
  });

  it("rejects a duplicate normalised code", async () => {
    const db = await setup();
    await createAdminPromo(baseInput(), db, NOW);
    await expect(
      createAdminPromo(baseInput({ code: "  save20 " }), db, NOW),
    ).rejects.toMatchObject({ code: "PROMO_CODE_EXISTS" });
  });

  it("refuses to rename a redeemed code and to drop the cap below usage", async () => {
    const db = await setup();
    const promo = await createAdminPromo(baseInput({ maxRedemptions: 100 }), db, NOW);
    await setRedeemed(db, promo.id, 5);

    await expect(
      updateAdminPromo(
        promo.id,
        baseInput({ code: "RENAMED", maxRedemptions: 100 }),
        db,
        NOW,
      ),
    ).rejects.toMatchObject({ code: "PROMO_CODE_IMMUTABLE" });

    await expect(
      updateAdminPromo(promo.id, baseInput({ maxRedemptions: 3 }), db, NOW),
    ).rejects.toMatchObject({ code: "PROMO_MAX_BELOW_USAGE" });

    // Same code + a cap at/above usage is allowed.
    const ok = await updateAdminPromo(
      promo.id,
      baseInput({ maxRedemptions: 200, value: 25 }),
      db,
      NOW,
    );
    expect(ok.value).toBe(25);
  });

  it("won't reactivate an expired/exhausted code", async () => {
    const db = await setup();
    const promo = await createAdminPromo(
      baseInput({ code: "GONE", maxRedemptions: 1 }),
      db,
      NOW,
    );
    await setRedeemed(db, promo.id, 1);
    await setAdminPromoActive(promo.id, false, db, NOW);
    await expect(setAdminPromoActive(promo.id, true, db, NOW)).rejects.toMatchObject({
      code: "PROMO_NOT_USABLE",
    });
  });

  it("hard-deletes an unused code but archives a redeemed one", async () => {
    const db = await setup();
    const unused = await createAdminPromo(baseInput({ code: "UNUSED" }), db, NOW);
    expect(await deleteAdminPromo(unused.id, db)).toEqual({
      outcome: "hard_deleted",
      promoId: unused.id,
    });

    const used = await createAdminPromo(baseInput({ code: "USED" }), db, NOW);
    await setRedeemed(db, used.id, 2);
    expect(await deleteAdminPromo(used.id, db)).toEqual({
      outcome: "archived",
      promoId: used.id,
    });
    const all = await listAdminPromos("all", db, NOW);
    const archived = all.find((p) => p.id === used.id);
    expect(archived?.active).toBe(false);
  });
});
