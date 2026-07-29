import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { scrubSessionIdentifiers } from "../src/modules/admin/session-erasure.js";
import { createPaymentAttempt } from "../src/modules/payments/payment.service.js";
import {
  createIntegrationDb,
  integrationDatabaseUrl,
} from "./helpers/postgres-integration.js";

type IntegrationDb = Awaited<ReturnType<typeof createIntegrationDb>>["db"];

const describeIfIntegrationDb = integrationDatabaseUrl ? describe : describe.skip;

interface AttributionRow {
  ga_client_id: string | null;
  attribution_gclid: string | null;
  attribution_utm_source: string | null;
  attribution_utm_medium: string | null;
  attribution_utm_campaign: string | null;
}

describeIfIntegrationDb("payment acquisition attribution", () => {
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

  async function seedDraft(
    db: IntegrationDb,
  ): Promise<{ sessionId: string; draftId: string }> {
    const sessionRows = await db.execute<{ id: string }>(sql`
      INSERT INTO sessions (resume_token_hash, resume_token_expires_at, expires_at)
      VALUES (${`attr-${Date.now()}-${Math.random()}`},
              NOW() + interval '3 days', NOW() + interval '3 days')
      RETURNING id
    `);
    const sessionId = sessionRows.rows[0]?.id;
    if (!sessionId) throw new Error("session insert returned no id");

    const draftRows = await db.execute<{ id: string }>(sql`
      INSERT INTO draft_letters (session_id, locale, subject)
      VALUES (${sessionId}, 'de-CH', 'Kündigung')
      RETURNING id
    `);
    const draftId = draftRows.rows[0]?.id;
    if (!draftId) throw new Error("draft insert returned no id");

    return { sessionId, draftId };
  }

  async function readAttribution(
    db: IntegrationDb,
    paymentId: string,
  ): Promise<AttributionRow> {
    const rows = await db.execute<AttributionRow>(sql`
      SELECT ga_client_id, attribution_gclid, attribution_utm_source,
             attribution_utm_medium, attribution_utm_campaign
      FROM payment_attempts WHERE id = ${paymentId}
    `);
    const row = rows.rows[0];
    if (!row) throw new Error("payment row not found");
    return row;
  }

  it("round-trips attribution from the checkout call onto the payment row", async () => {
    const db = await setup();
    const { sessionId, draftId } = await seedDraft(db);

    const payment = await createPaymentAttempt(db, {
      draftId,
      sessionId,
      amountCents: 625,
      breakdown: { totalCents: 625 } as never,
      attribution: {
        gaClientId: "1234567890.1699999999",
        gclid: "Cj0KCQjw-test",
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "kuendigung-ch",
      },
    });

    expect(payment.gaClientId).toBe("1234567890.1699999999");
    expect(payment.attributionUtmSource).toBe("google");
    expect(await readAttribution(db, payment.id)).toEqual({
      ga_client_id: "1234567890.1699999999",
      attribution_gclid: "Cj0KCQjw-test",
      attribution_utm_source: "google",
      attribution_utm_medium: "cpc",
      attribution_utm_campaign: "kuendigung-ch",
    });
  });

  it("records nulls when the visitor gave no analytics consent", async () => {
    const db = await setup();
    const { sessionId, draftId } = await seedDraft(db);

    const payment = await createPaymentAttempt(db, {
      draftId,
      sessionId,
      amountCents: 625,
      breakdown: { totalCents: 625 } as never,
    });

    expect(await readAttribution(db, payment.id)).toEqual({
      ga_client_id: null,
      attribution_gclid: null,
      attribution_utm_source: null,
      attribution_utm_medium: null,
      attribution_utm_campaign: null,
    });
  });

  it("rejects an over-long attribution value at the database boundary", async () => {
    const db = await setup();
    const { sessionId, draftId } = await seedDraft(db);

    await expect(
      createPaymentAttempt(db, {
        draftId,
        sessionId,
        amountCents: 625,
        breakdown: { totalCents: 625 } as never,
        attribution: { utmSource: "x".repeat(200) },
      }),
    ).rejects.toThrow();
  });

  it("erasure clears the re-identifying ids but keeps the channel", async () => {
    const db = await setup();
    const { sessionId, draftId } = await seedDraft(db);

    const payment = await createPaymentAttempt(db, {
      draftId,
      sessionId,
      amountCents: 625,
      breakdown: { totalCents: 625 } as never,
      attribution: {
        gaClientId: "1234567890.1699999999",
        gclid: "Cj0KCQjw-test",
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "kuendigung-ch",
      },
    });

    await db.transaction(async (tx) => {
      await scrubSessionIdentifiers(tx, sessionId, [draftId]);
    });

    // The client id and the click id both resolve back to a person at Google;
    // "google / cpc" resolves to a channel. Only the former are personal data,
    // and dropping the latter would rewrite the revenue history of an order the
    // business is legally required to keep anyway.
    expect(await readAttribution(db, payment.id)).toEqual({
      ga_client_id: null,
      attribution_gclid: null,
      attribution_utm_source: "google",
      attribution_utm_medium: "cpc",
      attribution_utm_campaign: "kuendigung-ch",
    });
  });
});
