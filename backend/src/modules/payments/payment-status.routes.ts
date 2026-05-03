import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "../../db/index.js";
import { notFoundError } from "../../shared/errors/index.js";
import { requireSession, getRequiredSession } from "../sessions/session.middleware.js";
import { resolveDisplayDispatchQuoteForDraft } from "../dispatch/dispatch-quote.service.js";
import { syncDraftFulfillmentFromPaymentState } from "../signing/fulfillment.service.js";
import { getLatestSignatureSession } from "../signing/signature-session.service.js";
import { getPaymentIntentForCheckout } from "./adapters/stripe.adapter.js";
import { getPaymentForDraft, transitionPaymentState } from "./payment.service.js";
import { enqueueDispatchIfEligible } from "./payment-route-helpers.js";

export async function registerPaymentStatusRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { draftId: string } }>(
    "/drafts/:draftId/quote",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const session = getRequiredSession(request);
      const db = getDb();
      const { draftId } = request.params;

      const [draft] = await db
        .select({
          id: schema.draftLetters.id,
          signatureFlowMode: schema.draftLetters.signatureFlowMode,
        })
        .from(schema.draftLetters)
        .where(
          and(
            eq(schema.draftLetters.id, draftId),
            eq(schema.draftLetters.sessionId, session.id),
          ),
        )
        .limit(1);

      if (!draft) throw notFoundError("draft");

      const resolvedDisplayQuote = await resolveDisplayDispatchQuoteForDraft(db, draftId);
      reply.send({
        quote: resolvedDisplayQuote.quote,
        meta: resolvedDisplayQuote.meta,
      });
    },
  );

  app.get<{ Params: { draftId: string } }>(
    "/drafts/:draftId/payment",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const session = getRequiredSession(request);
      const db = getDb();
      const { draftId } = request.params;

      const [draft] = await db
        .select({
          id: schema.draftLetters.id,
          signatureFlowMode: schema.draftLetters.signatureFlowMode,
        })
        .from(schema.draftLetters)
        .where(
          and(
            eq(schema.draftLetters.id, draftId),
            eq(schema.draftLetters.sessionId, session.id),
          ),
        )
        .limit(1);

      if (!draft) throw notFoundError("draft");

      let payment = await getPaymentForDraft(db, draftId);
      if (!payment) throw notFoundError("payment");
      const signatureSession = await getLatestSignatureSession(db, draftId);

      if (payment.state === "pending" && payment.stripePaymentIntentId) {
        const stripeIntent = await getPaymentIntentForCheckout(
          payment.stripePaymentIntentId,
        );

        if (stripeIntent.status === "requires_capture") {
          const result = await transitionPaymentState(db, payment.id, "authorized", {
            stripePaymentIntentId: payment.stripePaymentIntentId,
          });
          payment = result.payment;
          await syncDraftFulfillmentFromPaymentState(db, draftId, {
            signatureFlowMode: draft.signatureFlowMode,
            paymentState: "authorized",
            signatureSessionStatus: signatureSession?.status ?? null,
          });
          await enqueueDispatchIfEligible({
            db,
            draftId,
            paymentId: payment.id,
            log: request.log,
            failureMessage:
              "Failed to enqueue dispatch after payment status authorization",
          });
        } else if (stripeIntent.status === "succeeded") {
          const result = await transitionPaymentState(db, payment.id, "captured", {
            stripePaymentIntentId: payment.stripePaymentIntentId,
            stripeChargeId: stripeIntent.latestChargeId ?? undefined,
          });
          payment = result.payment;
          await syncDraftFulfillmentFromPaymentState(db, draftId, {
            signatureFlowMode: draft.signatureFlowMode,
            paymentState: "captured",
            signatureSessionStatus: signatureSession?.status ?? null,
          });
          await enqueueDispatchIfEligible({
            db,
            draftId,
            paymentId: payment.id,
            log: request.log,
            failureMessage: "Failed to enqueue dispatch after payment status capture",
          });
        }
      }

      reply.send({
        payment: {
          draftId: payment.draftId,
          paymentAttemptId: payment.id,
          state: payment.state,
          priceCents: payment.amountCents,
          currency: "CHF" as const,
          breakdown: payment.breakdown,
          authorizedAt:
            payment.state === "authorized" ? payment.updatedAt.toISOString() : null,
          capturedAt:
            payment.state === "captured" ? payment.updatedAt.toISOString() : null,
          refundedAt:
            payment.state === "refunded" ? payment.updatedAt.toISOString() : null,
          failureReason: payment.failureReason ?? null,
        },
      });
    },
  );
}
