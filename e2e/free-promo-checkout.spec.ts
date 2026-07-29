import { execFileSync } from "node:child_process";
import { test, expect } from "@playwright/test";
import {
  createSession,
  createDraft,
  seedDraftContent,
  submitForReview,
  disposeSession,
  type SessionContext,
} from "./helpers/api";

/**
 * CHF 0 free-promo checkout — the one checkout branch that never touches Stripe.
 *
 * `POST /v1/drafts/:id/checkout` with a 100%-off promo goes through
 * `captureFreeOrder` (backend/src/modules/payments/free-order.service.ts) instead
 * of creating a Stripe PaymentIntent. This spec proves the whole chain still
 * works: promo redeemed → attempt captured locally → VAT receipt row with a
 * discount line and total 0 → receipt email enqueued → dispatch attempt created.
 *
 * Assertions read Postgres directly, because a 200 from /checkout says nothing
 * about the fire-and-forget receipt/dispatch work that happens after it returns.
 *
 * Local-only: it shells into the `postgres` compose service. Skipped unless
 * E2E_DB=1 (default on when running against localhost).
 */

const API_BASE = process.env.E2E_API_URL || "http://localhost:5000/api";
const LOCAL_TARGET = API_BASE.includes("localhost") || API_BASE.includes("127.0.0.1");
const DB_ENABLED = process.env.E2E_DB === "1" || LOCAL_TARGET;

/** Promo code seeded for this spec. Not `LAUNCH`: the test consumes redemptions. */
const PROMO_CODE = "E2EFREE";
/** Recipient domain is pinned to example.com — Resend is REAL in this env. */
const CHECKOUT_EMAIL = "e2e-free-promo@example.com";

const SENDER = {
  firstName: "Anna",
  lastName: "Muster",
  addressLine1: "Bahnhofstrasse 1",
  postalCode: "8001",
  city: "Zürich",
  country: "CH",
};

const RECIPIENT = {
  firstName: "Bruno",
  lastName: "Beispiel",
  addressLine1: "Rue du Marché 7",
  postalCode: "1003",
  city: "Lausanne",
  country: "CH",
};

// ── Postgres access ────────────────────────────────────────────────────────

/** Run SQL in the compose `postgres` service and return rows as `|`-joined lines. */
function sql(statement: string): string[] {
  const out = execFileSync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "postgres",
      "psql",
      "-U",
      "episto",
      "-d",
      "episto",
      "-At",
      "-F",
      "|",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      statement,
    ],
    { encoding: "utf8", cwd: process.cwd() },
  );
  return out
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Run a redis-cli command in the compose `redis` service. */
function redis(...args: string[]): string {
  return execFileSync(
    "docker",
    ["compose", "exec", "-T", "redis", "redis-cli", ...args],
    { encoding: "utf8", cwd: process.cwd() },
  ).trim();
}

/**
 * True once a BullMQ `send-transactional-email` job whose payload mentions
 * `needle` exists. Reads Redis rather than the DB so the assertion survives the
 * queue-only and outbox-backed enqueue paths alike.
 */
function emailJobEnqueued(needle: string): boolean {
  const keys = redis("--scan", "--pattern", "bull:send-transactional-email:*")
    .split("\n")
    .map((k) => k.trim())
    .filter((k) => /bull:send-transactional-email:[^:]+$/.test(k));
  for (const key of keys) {
    if (redis("type", key) !== "hash") continue;
    if (redis("hget", key, "data").includes(needle)) return true;
  }
  return false;
}

function sqlRow(statement: string): string[] | null {
  const lines = sql(statement);
  return lines[0] ? lines[0].split("|") : null;
}

/** Poll until `fn` returns a row or the deadline passes (receipt/dispatch are async). */
async function waitForRow(
  statement: string,
  timeoutMs = 30_000,
): Promise<string[] | null> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const row = sqlRow(statement);
    if (row) return row;
    if (Date.now() > deadline) return null;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

// ── Test ───────────────────────────────────────────────────────────────────

test.describe("CHF 0 free-promo checkout (no Stripe)", () => {
  test.skip(!DB_ENABLED, "Requires direct Postgres access (local docker compose)");

  let session: SessionContext;
  let draftId: string;

  test.beforeAll(() => {
    // A dedicated, uncapped free code so the test never burns a real LAUNCH slot
    // and never fails because a capped code ran out.
    sql(
      `insert into promo_codes (code, kind, value, max_redemptions, active, note)
       values ('${PROMO_CODE}', 'free', 100, null, true, 'e2e free-promo checkout spec')
       on conflict (code) do update set kind='free', value=100, max_redemptions=null, active=true`,
    );
  });

  test.afterEach(async () => {
    if (session) await disposeSession(session);
  });

  test("captures locally, issues a CHF 0 VAT receipt, enqueues email and dispatch", async () => {
    test.setTimeout(180_000);

    // 1. Bootstrap a draft all the way to "ready" via the real API.
    session = await createSession("de-CH");
    ({ draftId } = await createDraft(session));
    await seedDraftContent(session, draftId, {
      sender: SENDER,
      recipient: RECIPIENT,
      subject: "Empfangsbestätigung",
      body:
        "Sehr geehrte Damen und Herren,\n\n" +
        "Hiermit bestätige ich den Erhalt Ihrer Sendung.\n\n" +
        "Mit freundlichen Grüssen,\nAnna Muster",
      deliveryType: "standard",
    });
    await submitForReview(session, draftId);

    // The snapshot PDF renders asynchronously; checkout rejects anything that is
    // still "rendering" with DRAFT_RENDER_PENDING.
    const draftStatus = await waitForRow(
      `select status from draft_letters
        where id = '${draftId}' and status in ('ready','ready_to_sign')`,
      60_000,
    );
    expect(draftStatus, "draft never finished rendering").not.toBeNull();

    // 2. Mark the session's phone verified directly. `assertVerifiedPhoneForCheckout`
    //    only reads sessions.phone_e164 / phone_verified_at, and the local SMS
    //    provider is a REAL paid gateway (SMS_PROVIDER=budgetsms) — driving the
    //    /phone-verification routes here would send a chargeable text.
    sql(
      `update sessions set phone_e164 = '+41791112233', phone_verified_at = now()
       where id = '${session.sessionId}'`,
    );

    const redeemedBefore = Number(
      sqlRow(`select redeemed_count from promo_codes where code = '${PROMO_CODE}'`)?.[0],
    );

    // 3. Checkout with the 100%-off code.
    const res = await session.request.post(`${API_BASE}/v1/drafts/${draftId}/checkout`, {
      data: { email: CHECKOUT_EMAIL, promoCode: PROMO_CODE },
    });
    expect(res.status(), await res.text()).toBe(200);
    const body = await res.json();

    // The free branch returns no Stripe client secret — that is the whole point.
    expect(body.clientSecret).toBeNull();
    expect(body.priceCents).toBe(0);
    expect(body.currency).toBe("CHF");
    expect(body.quote.totalCents).toBe(0);
    expect(body.quote.promo.code).toBe(PROMO_CODE);
    expect(body.quote.promo.kind).toBe("free");
    // The discount must equal the undiscounted total, not zero.
    expect(body.quote.promo.discountCents).toBe(
      body.quote.providerQuotedCents + body.quote.swissMailMarkupCents,
    );
    const paymentAttemptId: string = body.paymentAttemptId;
    const discountCents: number = body.quote.promo.discountCents;

    // 4. Order captured — locally, with no Stripe intent.
    const payment = sqlRow(
      `select state, amount_cents, currency, captured_at_source,
              coalesce(stripe_payment_intent_id, ''), (order_access_token_hash is not null)
         from payment_attempts where id = '${paymentAttemptId}'`,
    );
    expect(payment).not.toBeNull();
    expect(payment?.[0]).toBe("captured");
    expect(payment?.[1]).toBe("0");
    expect(payment?.[2]).toBe("CHF");
    expect(payment?.[3]).toBe("local_capture");
    expect(payment?.[4]).toBe(""); // never touched Stripe
    // The receipt/confirmation emails link via a signed order-access token.
    expect(payment?.[5]).toBe("t");

    // Promo redemption consumed exactly once.
    const redeemedAfter = Number(
      sqlRow(`select redeemed_count from promo_codes where code = '${PROMO_CODE}'`)?.[0],
    );
    expect(redeemedAfter).toBe(redeemedBefore + 1);

    // Fulfillment advanced off "draft_created".
    const fulfillment = sqlRow(
      `select fulfillment_status from draft_letters where id = '${draftId}'`,
    );
    // Dispatch may already have raced ahead by now — either is a pass, "draft_created"
    // is not.
    expect(["payment_captured", "dispatch_submitted"]).toContain(fulfillment?.[0]);

    // 5. VAT receipt: issued fire-and-forget after the capture transaction.
    const receipt = await waitForRow(
      `select receipt_number, net_cents, vat_cents, total_cents, vat_rate_bp,
              discount_cents, promo_code, order_ref, storage_key
         from receipts where payment_attempt_id = '${paymentAttemptId}'`,
      60_000,
    );
    expect(receipt, "no receipt row was created for the CHF 0 order").not.toBeNull();
    expect(receipt?.[0]).toMatch(/^EP-R-\d{6}$/);
    expect(receipt?.[1]).toBe("0"); // net
    expect(receipt?.[2]).toBe("0"); // VAT — 8.1% of zero is zero
    expect(receipt?.[3]).toBe("0"); // total
    expect(receipt?.[4]).toBe("810");
    // The discount line must be on the receipt, otherwise the document shows a
    // CHF 0 total with nothing explaining it.
    expect(receipt?.[5]).toBe(String(discountCents));
    expect(receipt?.[6]).toBe(PROMO_CODE);
    expect(receipt?.[7]).toMatch(/^EP-/);
    expect(receipt?.[8]).toBe(`receipts/${paymentAttemptId}.pdf`);

    // 6. Receipt email enqueued. The worker may or may not be running locally,
    //    so assert on the queued job rather than on delivery.
    if (!receipt) throw new Error("receipt row missing after free checkout");
    const orderRef = receipt[7];
    const emailDeadline = Date.now() + 45_000;
    let emailQueued = emailJobEnqueued(orderRef);
    while (!emailQueued && Date.now() < emailDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      emailQueued = emailJobEnqueued(orderRef);
    }
    expect(
      emailQueued,
      `no send-transactional-email job for ${orderRef} — the customer gets no receipt`,
    ).toBe(true);

    // 7. Dispatch submitted. enqueueDispatchIfEligible pushes a BullMQ job; the
    //    submit-dispatch worker creates the dispatch_attempts row. The local
    //    ePost adapter is in mock mode (EPOST_SUBMISSION_MODE defaults to "mock"),
    //    so nothing is actually mailed.
    const dispatch = await waitForRow(
      `select state, provider_name, coalesce(provider_reference, ''),
              coalesce(failure_reason, '')
         from dispatch_attempts where payment_attempt_id = '${paymentAttemptId}'`,
      90_000,
    );
    expect(
      dispatch,
      "no dispatch_attempts row — the free order was never submitted for mailing",
    ).not.toBeNull();
    expect(dispatch?.[3], "dispatch failed").toBe("");
    expect(["queued", "submitted", "in_transit", "delivered"]).toContain(dispatch?.[0]);
    expect(dispatch?.[1]).toContain("epost");

    // 8. Replaying checkout must be inert. A retried request (double-click, page
    //    reload, flaky network) has to reuse the captured order — a second
    //    capture would burn another redemption, mint a second receipt number and
    //    mail the letter twice.
    const replay = await session.request.post(
      `${API_BASE}/v1/drafts/${draftId}/checkout`,
      { data: { email: CHECKOUT_EMAIL, promoCode: PROMO_CODE } },
    );
    expect(replay.status(), await replay.text()).toBe(200);
    const replayBody = await replay.json();
    expect(replayBody.paymentAttemptId).toBe(paymentAttemptId);
    expect(replayBody.priceCents).toBe(0);
    expect(replayBody.clientSecret).toBeNull();

    expect(
      sql(`select id from payment_attempts where draft_id = '${draftId}'`),
      "checkout replay created a second payment attempt",
    ).toHaveLength(1);
    expect(
      sql(`select id from receipts where payment_attempt_id = '${paymentAttemptId}'`),
      "checkout replay issued a second receipt",
    ).toHaveLength(1);
    expect(
      sql(`select id from dispatch_attempts where draft_id = '${draftId}'`),
      "checkout replay queued a second dispatch — the letter would be mailed twice",
    ).toHaveLength(1);
    expect(
      Number(
        sqlRow(
          `select redeemed_count from promo_codes where code = '${PROMO_CODE}'`,
        )?.[0],
      ),
      "checkout replay consumed a second promo redemption",
    ).toBe(redeemedAfter);
  });
});
