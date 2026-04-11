import { randomUUID } from "node:crypto";

import { asc, eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";

const stripeMocks = vi.hoisted(() => ({
  capturePaymentIntent: vi.fn(),
  cancelPaymentIntent: vi.fn(),
}));

vi.mock("../src/modules/payments/adapters/stripe.adapter.js", () => ({
  capturePaymentIntent: stripeMocks.capturePaymentIntent,
  cancelPaymentIntent: stripeMocks.cancelPaymentIntent,
}));

import { schema } from "../src/db/index.js";
import {
  createDispatchAttempt,
  getDispatchAttempt,
  transitionDispatchState,
} from "../src/modules/dispatch/dispatch.service.js";
import {
  createPaymentAttempt,
  getPaymentAttemptById,
  transitionPaymentState,
} from "../src/modules/payments/payment.service.js";
import {
  settlePaymentForDispatchResolution,
  updateDraftStatusForDispatchResolution,
  updateDraftStatusForDispatchSubmission,
} from "../src/workers/dispatch-settlement.js";
import {
  createIntegrationDb,
  integrationDatabaseUrl,
} from "./helpers/postgres-integration.js";

const describeIfIntegrationDb = integrationDatabaseUrl ? describe : describe.skip;

describeIfIntegrationDb("dispatch lifecycle integration", () => {
  let cleanup: (() => Promise<void>) | null = null;

  afterEach(async () => {
    stripeMocks.capturePaymentIntent.mockReset();
    stripeMocks.cancelPaymentIntent.mockReset();

    if (cleanup) {
      await cleanup();
      cleanup = null;
    }
  });

  it("recovers from a post-submit capture failure and finalizes on later reconciliation", async () => {
    const harness = await createIntegrationDb();
    cleanup = harness.cleanup;

    const sessionId = randomUUID();
    const draftId = randomUUID();
    const snapshotId = randomUUID();

    await harness.db.insert(schema.sessions).values({
      id: sessionId,
      type: "guest",
      email: "integration@example.com",
      resumeTokenHash: "resume-token-hash",
      resumeTokenExpiresAt: new Date("2030-01-01T00:00:00Z"),
      locale: "en-CH",
      expiresAt: new Date("2030-01-02T00:00:00Z"),
    });

    await harness.db.insert(schema.draftLetters).values({
      id: draftId,
      sessionId,
      status: "ready",
      locale: "en-CH",
      deliveryType: "standard",
      subject: "Subject",
      body: "Body",
    });

    await harness.db.insert(schema.draftSnapshots).values({
      id: snapshotId,
      draftId,
      version: 1,
      schemaVersion: 1,
      snapshotData: {
        subject: "Subject",
        body: "Body",
      },
    });

    const payment = await createPaymentAttempt(harness.db, {
      draftId,
      sessionId,
      amountCents: 245,
      breakdown: {
        deliveryType: "standard",
        providerQuotedCents: 165,
        swissMailMarkupCents: 80,
        totalCents: 245,
        providerQuoteReference: "preview-1",
        attachmentHandling: "excluded",
        lineItems: [
          { label: "Provider quote", amountCents: 165, source: "provider" },
          { label: "Episto service", amountCents: 80, source: "swiss_mail" },
        ],
      },
    });

    const authorized = await transitionPaymentState(
      harness.db,
      payment.id,
      "authorized",
      {
        stripePaymentIntentId: "pi_integration_1",
      },
    );

    const attempt = await createDispatchAttempt(harness.db, {
      draftId,
      snapshotId,
      paymentAttemptId: authorized.payment.id,
      providerName: "epost-oneapi",
    });

    await transitionDispatchState(harness.db, attempt.id, "submitted", {
      providerReference: "provider-ref-1",
      providerPayload: { status: "PROCESSING" },
    });
    await updateDraftStatusForDispatchSubmission(harness.db, draftId, "submitted");

    stripeMocks.capturePaymentIntent.mockRejectedValueOnce(new Error("capture failed"));

    await expect(
      settlePaymentForDispatchResolution(
        harness.db,
        draftId,
        authorized.payment.id,
        "accepted",
      ),
    ).rejects.toThrow("capture failed");

    const paymentAfterFailure = await getPaymentAttemptById(
      harness.db,
      authorized.payment.id,
    );
    const dispatchAfterFailure = await getDispatchAttempt(harness.db, attempt.id);
    const [draftAfterFailure] = await harness.db
      .select({ status: schema.draftLetters.status })
      .from(schema.draftLetters)
      .where(eq(schema.draftLetters.id, draftId))
      .limit(1);

    expect(paymentAfterFailure?.state).toBe("authorized");
    expect(dispatchAfterFailure?.state).toBe("submitted");
    expect(draftAfterFailure?.status).toBe("submitted");

    stripeMocks.capturePaymentIntent.mockResolvedValueOnce({
      chargeId: "ch_integration_1",
    });

    const settlement = await settlePaymentForDispatchResolution(
      harness.db,
      draftId,
      authorized.payment.id,
      "accepted",
    );

    await updateDraftStatusForDispatchResolution(
      harness.db,
      draftId,
      "accepted",
      settlement.payment,
    );

    await transitionDispatchState(harness.db, attempt.id, "accepted", {
      providerReference: "provider-ref-1",
      trackingNumber: "98.40.541881.00002354",
      providerPayload: { status: "DELIVERED" },
    });

    const finalizedPayment = await getPaymentAttemptById(
      harness.db,
      authorized.payment.id,
    );
    const finalizedDispatch = await getDispatchAttempt(harness.db, attempt.id);
    const [finalizedDraft] = await harness.db
      .select({
        status: schema.draftLetters.status,
        updatedAt: schema.draftLetters.updatedAt,
      })
      .from(schema.draftLetters)
      .where(eq(schema.draftLetters.id, draftId))
      .limit(1);

    const events = await harness.db
      .select({
        previousState: schema.dispatchStatusEvents.previousState,
        newState: schema.dispatchStatusEvents.newState,
      })
      .from(schema.dispatchStatusEvents)
      .where(eq(schema.dispatchStatusEvents.dispatchAttemptId, attempt.id))
      .orderBy(asc(schema.dispatchStatusEvents.createdAt));

    expect(finalizedPayment?.state).toBe("captured");
    expect(finalizedPayment?.stripeChargeId).toBe("ch_integration_1");
    expect(finalizedPayment?.orderAccessTokenHash).toBeTruthy();
    expect(settlement.rawOrderAccessToken).toBeTruthy();
    expect(finalizedDispatch?.state).toBe("accepted");
    expect(finalizedDispatch?.trackingNumber).toBe("98.40.541881.00002354");
    expect(finalizedDraft?.status).toBe("dispatched");
    expect(finalizedDraft?.updatedAt).toBeInstanceOf(Date);
    expect(events).toEqual([
      { previousState: "queued", newState: "submitted" },
      { previousState: "submitted", newState: "accepted" },
    ]);
  });
});
