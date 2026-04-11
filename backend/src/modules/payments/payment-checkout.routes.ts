import { buildOrderReference } from "@swiss-mail/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { getDb, schema } from "../../db/index.js";
import { AppError, notFoundError } from "../../shared/errors/index.js";
import { recordEvent } from "../analytics/index.js";
import { resolvePaymentDispatchQuoteForDraft } from "../dispatch/dispatch-quote.service.js";
import { requireSession, getRequiredSession } from "../sessions/session.middleware.js";
import {
  createPaymentIntent,
  getPaymentIntentForCheckout,
  updatePaymentIntentReceiptDetails,
} from "./adapters/stripe.adapter.js";
import { enqueueDispatchIfSnapshotReady } from "./payment-route-helpers.js";
import {
  createPaymentAttempt,
  getPaymentForDraft,
  setPaymentIntentId,
  transitionPaymentState,
} from "./payment.service.js";

const CheckoutBody = z.object({
  email: z.string().email().max(254),
});

const CHECKOUT_READY_DRAFT_STATUSES = new Set(["ready", "submitted", "dispatched"]);
const NON_TERMINAL_STATES = ["pending", "authorized", "captured", "refund_pending"];
const MAX_CHECKOUT_RECONCILIATION_ATTEMPTS = 3;
const RESUMABLE_STRIPE_INTENT_STATUSES = new Set([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
  "processing",
]);

export async function registerPaymentCheckoutRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { draftId: string } }>(
    "/drafts/:draftId/checkout",
    {
      preHandler: [requireSession],
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 hour",
          keyGenerator: (req: FastifyRequest) => req.session?.id ?? req.ip,
        },
      },
    },
    async (request, reply) => {
      const session = getRequiredSession(request);
      const db = getDb();
      const { draftId } = request.params;

      const body = CheckoutBody.parse(request.body);
      const orderRef = buildOrderReference(draftId);

      const [draft] = await db
        .select({
          id: schema.draftLetters.id,
          deliveryType: schema.draftLetters.deliveryType,
          status: schema.draftLetters.status,
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
      if (!CHECKOUT_READY_DRAFT_STATUSES.has(draft.status)) {
        throw new AppError({
          family: "policy_refusal",
          statusCode: 409,
          code: "DRAFT_RENDER_PENDING",
          message: `Draft is not ready for checkout: ${draft.status}`,
          userMessage: "Your final letter preview is still being prepared.",
          userAction: "Wait for the preview to finish rendering, then try again.",
        });
      }

      const resolvedPaymentQuote = await resolvePaymentDispatchQuoteForDraft(db, draftId);
      const amountCents = resolvedPaymentQuote.quote.totalCents;

      const createOrResumeCheckout = async () =>
        db.transaction(async (tx) => {
          if (body.email) {
            await tx
              .update(schema.sessions)
              .set({ email: body.email, updatedAt: new Date() })
              .where(eq(schema.sessions.id, session.id));
          }

          const existing = await getPaymentForDraft(tx, draftId);
          if (existing && NON_TERMINAL_STATES.includes(existing.state)) {
            return {
              isExisting: true as const,
              paymentAttemptId: existing.id,
              paymentState: existing.state,
              stripePaymentIntentId: existing.stripePaymentIntentId,
              clientSecret: null as string | null,
              priceCents: existing.amountCents,
              quote: existing.breakdown,
            };
          }

          const payment = await createPaymentAttempt(tx, {
            draftId,
            sessionId: session.id,
            amountCents,
            breakdown: {
              deliveryType: resolvedPaymentQuote.quote.deliveryType,
              providerQuotedCents: resolvedPaymentQuote.quote.providerQuotedCents,
              swissMailMarkupCents: resolvedPaymentQuote.quote.swissMailMarkupCents,
              totalCents: resolvedPaymentQuote.quote.totalCents,
              providerQuoteReference: resolvedPaymentQuote.quote.providerQuoteReference,
              attachmentHandling: resolvedPaymentQuote.quote.attachmentHandling,
              lineItems: resolvedPaymentQuote.quote.lineItems,
            },
          });

          const stripeResult = await createPaymentIntent(amountCents, {
            draftId,
            sessionId: session.id,
            paymentAttemptId: payment.id,
            customerEmail: body.email,
            orderRef,
            deliveryType: draft.deliveryType,
          });

          await setPaymentIntentId(tx, payment.id, stripeResult.paymentIntentId);

          return {
            isExisting: false as const,
            paymentAttemptId: payment.id,
            paymentState: payment.state,
            stripePaymentIntentId: stripeResult.paymentIntentId,
            clientSecret: stripeResult.clientSecret,
            priceCents: amountCents,
            quote: resolvedPaymentQuote.quote,
          };
        });

      let result = await createOrResumeCheckout();
      let reconciliationAttempts = 0;

      async function recreateCheckoutFromStaleStripeIntent(stripeError: string): Promise<void> {
        request.log.warn(
          {
            draftId,
            paymentAttemptId: result.paymentAttemptId,
            stripePaymentIntentId: result.stripePaymentIntentId,
            stripeError,
          },
          "Cancelling stale pending Stripe payment intent before recreating checkout",
        );

        await transitionPaymentState(db, result.paymentAttemptId, "cancelled");
        reconciliationAttempts += 1;
        if (reconciliationAttempts >= MAX_CHECKOUT_RECONCILIATION_ATTEMPTS) {
          request.log.error(
            {
              draftId,
              paymentAttemptId: result.paymentAttemptId,
              stripePaymentIntentId: result.stripePaymentIntentId,
              attempts: reconciliationAttempts,
            },
            "Checkout reconciliation exceeded the maximum number of stale payment retries",
          );
          throw new AppError({
            family: "provider_outage",
            statusCode: 503,
            code: "CHECKOUT_RECONCILIATION_EXCEEDED",
            message: `Checkout could not stabilize after ${MAX_CHECKOUT_RECONCILIATION_ATTEMPTS} stale payment retries`,
            userMessage: "Payment is temporarily unavailable. Please try again shortly.",
            userAction: "Wait a moment and retry.",
          });
        }
        result = await createOrResumeCheckout();
      }

      while (result.isExisting && result.paymentState === "pending") {
        if (!result.stripePaymentIntentId) {
          await recreateCheckoutFromStaleStripeIntent(
            "Pending payment attempt is missing a Stripe payment intent ID",
          );
          continue;
        }

        try {
          const stripeIntent = await getPaymentIntentForCheckout(result.stripePaymentIntentId);

          if (RESUMABLE_STRIPE_INTENT_STATUSES.has(stripeIntent.status)) {
            if (!stripeIntent.clientSecret) {
              throw new AppError({
                family: "payment_failure",
                statusCode: 400,
                code: "PAYMENT_INVALID_REQUEST",
                message: `Stripe PaymentIntent ${result.stripePaymentIntentId} is missing a client_secret`,
                userMessage: "The payment request was invalid.",
                userAction: "Please try again or use a different payment method.",
              });
            }

            try {
              await updatePaymentIntentReceiptDetails(result.stripePaymentIntentId, {
                customerEmail: body.email,
                orderRef,
                draftId,
                sessionId: session.id,
                paymentAttemptId: result.paymentAttemptId,
                deliveryType: draft.deliveryType,
              });
            } catch (error) {
              const stripeError = error instanceof Error ? error.message : String(error);
              await recreateCheckoutFromStaleStripeIntent(stripeError);
              continue;
            }

            result = {
              ...result,
              clientSecret: stripeIntent.clientSecret,
            };
            break;
          }

          if (stripeIntent.status === "requires_capture") {
            const { payment } = await transitionPaymentState(
              db,
              result.paymentAttemptId,
              "authorized",
              {
                stripePaymentIntentId: result.stripePaymentIntentId,
              },
            );
            await enqueueDispatchIfSnapshotReady({
              db,
              draftId,
              paymentId: payment.id,
              log: request.log,
              failureMessage: "Failed to enqueue dispatch after checkout authorization",
            });
            result = {
              ...result,
              paymentState: payment.state,
              clientSecret: null,
            };
            break;
          }

          if (stripeIntent.status === "succeeded") {
            const { payment } = await transitionPaymentState(
              db,
              result.paymentAttemptId,
              "captured",
              {
                stripePaymentIntentId: result.stripePaymentIntentId,
                stripeChargeId: stripeIntent.latestChargeId ?? undefined,
              },
            );
            await enqueueDispatchIfSnapshotReady({
              db,
              draftId,
              paymentId: payment.id,
              log: request.log,
              failureMessage: "Failed to enqueue dispatch after checkout capture reconciliation",
              suppressFailure: true,
            });
            result = {
              ...result,
              paymentState: payment.state,
              clientSecret: null,
            };
            break;
          }

          await recreateCheckoutFromStaleStripeIntent(
            `Stripe PaymentIntent ${result.stripePaymentIntentId} is ${stripeIntent.status}`,
          );
        } catch (error) {
          if (error instanceof AppError && error.code === "PAYMENT_INVALID_REQUEST") {
            await recreateCheckoutFromStaleStripeIntent(error.message);
            continue;
          }

          throw error;
        }
      }

      if (result.isExisting && result.paymentState === "authorized") {
        await enqueueDispatchIfSnapshotReady({
          db,
          draftId,
          paymentId: result.paymentAttemptId,
          log: request.log,
          failureMessage: "Failed to enqueue dispatch after reopening authorized checkout",
        });
      }

      if (result.isExisting && result.paymentState === "captured") {
        await enqueueDispatchIfSnapshotReady({
          db,
          draftId,
          paymentId: result.paymentAttemptId,
          log: request.log,
          failureMessage: "Failed to enqueue dispatch after reopening captured checkout",
          suppressFailure: true,
        });
      }

      if (result.isExisting && result.paymentState !== "pending") {
        result = {
          ...result,
          clientSecret: null,
        };
      }

      if (!result.isExisting) {
        recordEvent({
          event: "checkout_started",
          draftId,
          deliveryType: draft.deliveryType,
          priceCents: result.priceCents,
        });
        recordEvent({
          event: "payment_intent_created",
          draftId,
          paymentAttemptId: result.paymentAttemptId,
        });
      }

      return reply.send({
        paymentAttemptId: result.paymentAttemptId,
        clientSecret: result.clientSecret,
        priceCents: result.priceCents,
        currency: "CHF" as const,
        quote: result.quote,
      });
    },
  );
}
