import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../../db/index.js";
import { validationError } from "../../shared/errors/index.js";
import { recordEvent } from "../analytics/index.js";
import { syncDraftFulfillmentFromPaymentState } from "../signing/fulfillment.service.js";
import { getLatestSignatureSession } from "../signing/signature-session.service.js";
import { constructWebhookEvent } from "./adapters/stripe.adapter.js";
import { getPaymentAttemptById, transitionPaymentState } from "./payment.service.js";
import { enqueueDispatchIfEligible } from "./payment-route-helpers.js";

export async function registerPaymentWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (request, body, done) => {
      if (!Buffer.isBuffer(body)) {
        done(new Error("Invalid JSON"), undefined);
        return;
      }

      request.rawBodyBuffer = body;
      try {
        done(null, JSON.parse(body.toString("utf-8")));
      } catch {
        done(new Error("Invalid JSON"), undefined);
      }
    },
  );

  async function getWebhookPayment(draftId: string, paymentAttemptId: string) {
    const db = getDb();
    const payment = await getPaymentAttemptById(db, paymentAttemptId);
    if (!payment || payment.draftId !== draftId) {
      return { db, payment: null as null, signatureFlowMode: null as null };
    }

    const [draft] = await db
      .select({ signatureFlowMode: schema.draftLetters.signatureFlowMode })
      .from(schema.draftLetters)
      .where(eq(schema.draftLetters.id, draftId))
      .limit(1);

    return { db, payment, signatureFlowMode: draft?.signatureFlowMode ?? null };
  }

  app.post("/webhooks/stripe", async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers["stripe-signature"];
    if (typeof signature !== "string") {
      throw validationError("Missing stripe-signature header");
    }

    const rawBody: unknown = request.rawBodyBuffer;
    if (!Buffer.isBuffer(rawBody)) {
      throw validationError("Missing raw request body");
    }

    const event = constructWebhookEvent(rawBody, signature);

    switch (event.type) {
      case "payment_intent.amount_capturable_updated": {
        const intent = event.data.object;
        const draftId = intent.metadata?.draftId;
        const paymentAttemptId = intent.metadata?.paymentAttemptId;
        if (!draftId || !paymentAttemptId || intent.status !== "requires_capture") break;

        const { db, payment, signatureFlowMode } = await getWebhookPayment(
          draftId,
          paymentAttemptId,
        );
        if (!payment) break;
        const signatureSession = await getLatestSignatureSession(db, draftId);

        await transitionPaymentState(db, payment.id, "authorized", {
          stripePaymentIntentId: intent.id,
        });
        await syncDraftFulfillmentFromPaymentState(db, draftId, {
          signatureFlowMode:
            signatureFlowMode ?? signatureSession?.signatureFlowMode ?? "visual",
          paymentState: "authorized",
          signatureSessionStatus: signatureSession?.status ?? null,
        });
        await enqueueDispatchIfEligible({
          db,
          draftId,
          paymentId: payment.id,
          log: request.log,
          failureMessage: "Failed to enqueue dispatch after webhook authorization",
        });
        break;
      }

      case "payment_intent.succeeded": {
        const intent = event.data.object;
        const draftId = intent.metadata?.draftId;
        const paymentAttemptId = intent.metadata?.paymentAttemptId;
        if (!draftId || !paymentAttemptId) break;

        const { db, payment, signatureFlowMode } = await getWebhookPayment(
          draftId,
          paymentAttemptId,
        );
        if (!payment) break;
        const signatureSession = await getLatestSignatureSession(db, draftId);

        const chargeId =
          typeof intent.latest_charge === "string" ? intent.latest_charge : null;

        await transitionPaymentState(db, payment.id, "captured", {
          stripeChargeId: chargeId ?? undefined,
        });
        await syncDraftFulfillmentFromPaymentState(db, draftId, {
          signatureFlowMode:
            signatureFlowMode ?? signatureSession?.signatureFlowMode ?? "visual",
          paymentState: "captured",
          signatureSessionStatus: signatureSession?.status ?? null,
        });
        await enqueueDispatchIfEligible({
          db,
          draftId,
          paymentId: payment.id,
          log: request.log,
          failureMessage: "Failed to enqueue dispatch after webhook capture",
        });

        recordEvent({
          event: "payment_captured",
          draftId,
          paymentAttemptId: payment.id,
          amountCents: payment.amountCents,
        });
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object;
        const draftId = intent.metadata?.draftId;
        const paymentAttemptId = intent.metadata?.paymentAttemptId;
        if (!draftId || !paymentAttemptId) break;

        const { db, payment } = await getWebhookPayment(draftId, paymentAttemptId);
        if (!payment) break;

        const failureMessage = intent.last_payment_error?.message ?? "Payment failed";
        await transitionPaymentState(db, payment.id, "failed", {
          failureReason: failureMessage,
        });

        recordEvent({
          event: "payment_failed",
          draftId,
          paymentAttemptId: payment.id,
          errorFamily: "payment_failure",
        });
        break;
      }

      case "payment_intent.canceled": {
        const intent = event.data.object;
        const draftId = intent.metadata?.draftId;
        const paymentAttemptId = intent.metadata?.paymentAttemptId;
        if (!draftId || !paymentAttemptId) break;

        const { db, payment } = await getWebhookPayment(draftId, paymentAttemptId);
        if (!payment) break;

        await transitionPaymentState(db, payment.id, "cancelled");
        break;
      }

      default:
        break;
    }

    reply.status(200).send({ received: true });
  });
}
