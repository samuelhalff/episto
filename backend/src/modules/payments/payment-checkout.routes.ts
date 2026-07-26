import { buildOrderReference, type PaymentBreakdown } from "@episto/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { getDb, schema } from "../../db/index.js";
import { AppError, notFoundError } from "../../shared/errors/index.js";
import { recordEvent } from "../analytics/index.js";
import { resolvePaymentDispatchQuoteForDraft } from "../dispatch/dispatch-quote.service.js";
import { assertVerifiedPhoneForCheckout } from "../phone-verification/phone-verification.service.js";
import { requireSession, getRequiredSession } from "../sessions/session.middleware.js";
import { syncDraftFulfillmentFromPaymentState } from "../signing/fulfillment.service.js";
import {
  ALLOWED_PAYMENT_METHOD_TYPES,
  createPaymentIntent,
  getPaymentIntentForCheckout,
  updatePaymentIntentReceiptDetails,
} from "./adapters/stripe.adapter.js";
import { captureFreeOrder } from "./free-order.service.js";
import { enqueueDispatchIfEligible } from "./payment-route-helpers.js";
import { issueReceiptSafe } from "./receipt.service.js";
import {
  createPaymentAttempt,
  getPaymentForDraft,
  setPaymentIntentId,
  transitionPaymentState,
} from "./payment.service.js";
import {
  applyPromoToTotal,
  recordPromoRedemption,
  type AppliedPromo,
} from "./promo.service.js";

const CheckoutBody = z.object({
  email: z.string().email().max(254),
  promoCode: z.string().trim().min(1).max(64).optional(),
});

const CHECKOUT_READY_DRAFT_STATUSES = new Set([
  "ready",
  "ready_to_sign",
  "submitted",
  "dispatched",
]);
const NON_TERMINAL_STATES = ["pending", "authorized", "captured", "refund_pending"];
const MAX_CHECKOUT_RECONCILIATION_ATTEMPTS = 3;
const RESUMABLE_STRIPE_INTENT_STATUSES = new Set([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
  "processing",
]);

// A resumed intent offering a non-allowlisted method (e.g. a stale Klarna/Amazon
// Pay intent) is recreated so the customer only sees our allowlisted methods.
function hasUnexpectedPaymentMethods(paymentMethodTypes?: string[]): boolean {
  if (!paymentMethodTypes) return false;
  return paymentMethodTypes.some((method) => !ALLOWED_PAYMENT_METHOD_TYPES.has(method));
}
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
          locale: schema.draftLetters.locale,
          status: schema.draftLetters.status,
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

      const verifiedPhone = await assertVerifiedPhoneForCheckout(db, {
        sessionId: session.id,
      });
      const resolvedPaymentQuote = await resolvePaymentDispatchQuoteForDraft(db, draftId);
      const baseQuote = resolvedPaymentQuote.quote;

      // Apply a promo code strictly server-side; the client only submits the
      // code string, and the charged total is (re)computed here.
      let chargeCents = baseQuote.totalCents;
      let appliedPromo: AppliedPromo | null = null;
      if (body.promoCode) {
        appliedPromo = await applyPromoToTotal(db, {
          code: body.promoCode,
          baseTotalCents: baseQuote.totalCents,
        });
        chargeCents = appliedPromo.finalCents;
      }

      const orderBreakdown = {
        deliveryType: baseQuote.deliveryType,
        providerQuotedCents: baseQuote.providerQuotedCents,
        swissMailMarkupCents: baseQuote.swissMailMarkupCents,
        totalCents: chargeCents,
        providerQuoteReference: baseQuote.providerQuoteReference,
        attachmentHandling: baseQuote.attachmentHandling,
        lineItems: baseQuote.lineItems,
        promo: appliedPromo
          ? {
              code: appliedPromo.code,
              kind: appliedPromo.kind,
              discountCents: appliedPromo.discountCents,
            }
          : null,
      };

      // Free order (fully discounted): capture directly, skipping Stripe.
      // See captureFreeOrder for the existing-attempt reuse/cancel semantics.
      if (chargeCents === 0 && appliedPromo) {
        const outcome = await captureFreeOrder(db, {
          draftId,
          sessionId: session.id,
          email: body.email,
          promoCodeId: appliedPromo.promoCodeId,
          signatureFlowMode: draft.signatureFlowMode,
          verifiedPhone,
          orderBreakdown,
        });

        await enqueueDispatchIfEligible({
          db,
          draftId,
          paymentId: outcome.payment.id,
          log: request.log,
          failureMessage: "Failed to enqueue dispatch after free-order capture",
          suppressFailure: true,
        });
        if (outcome.created) {
          recordEvent({
            event: "checkout_started",
            draftId,
            deliveryType: draft.deliveryType,
            priceCents: 0,
          });
        }
        return reply.send({
          paymentAttemptId: outcome.payment.id,
          clientSecret: null,
          priceCents: outcome.payment.amountCents,
          currency: "CHF" as const,
          quote: outcome.created ? orderBreakdown : outcome.payment.breakdown,
        });
      }

      const createOrResumeCheckout = async () =>
        db.transaction(async (tx) => {
          // Serialize concurrent checkouts for the same draft (see captureFreeOrder)
          // so parallel requests can't create two live payment attempts.
          await tx
            .select({ id: schema.draftLetters.id })
            .from(schema.draftLetters)
            .where(eq(schema.draftLetters.id, draftId))
            .for("update");

          if (body.email) {
            await tx
              .update(schema.sessions)
              .set({ email: body.email, updatedAt: new Date() })
              .where(eq(schema.sessions.id, session.id));
          }

          const existing = await getPaymentForDraft(tx, draftId);
          // Replace a pending attempt whose amount OR promo changed on resume;
          // cancelling releases the old code's reservation. Reuse non-pending.
          const amountChanged = existing?.amountCents !== chargeCents;
          const existingPromoCode =
            (existing?.breakdown as PaymentBreakdown | null)?.promo?.code ?? null;
          const promoChanged = existingPromoCode !== (appliedPromo?.code ?? null);
          if (
            existing &&
            existing.state === "pending" &&
            (amountChanged || promoChanged)
          ) {
            await transitionPaymentState(tx, existing.id, "cancelled");
          } else if (existing && NON_TERMINAL_STATES.includes(existing.state)) {
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

          // Defensive: a zero charge must never reach Stripe (handled above).
          if (chargeCents <= 0) {
            throw new AppError({
              family: "payment_failure",
              statusCode: 400,
              code: "PAYMENT_INVALID_REQUEST",
              message: "A zero-amount order cannot create a Stripe payment intent",
              userMessage: "We could not start this checkout. Please try again.",
              userAction: "Refresh and retry.",
            });
          }

          // A discount (>0) consumes one redemption when the attempt is created.
          if (appliedPromo) {
            const consumed = await recordPromoRedemption(tx, appliedPromo.promoCodeId);
            if (!consumed) {
              throw new AppError({
                family: "validation_error",
                statusCode: 400,
                code: "PROMO_LIMIT_REACHED",
                message: "Promo code fully redeemed",
                userMessage: "This promo code has reached its limit.",
                userAction: "Remove the code to continue, or try another.",
              });
            }
          }

          const payment = await createPaymentAttempt(tx, {
            draftId,
            sessionId: session.id,
            amountCents: chargeCents,
            verifiedPhoneE164: verifiedPhone.phoneE164,
            phoneVerifiedAt: verifiedPhone.phoneVerifiedAt,
            breakdown: orderBreakdown,
          });

          const stripeResult = await createPaymentIntent(chargeCents, {
            draftId,
            sessionId: session.id,
            paymentAttemptId: payment.id,
            customerEmail: body.email,
            orderRef,
            deliveryType: draft.deliveryType,
            captureStrategy: "automatic",
          });

          await setPaymentIntentId(tx, payment.id, stripeResult.paymentIntentId);

          return {
            isExisting: false as const,
            paymentAttemptId: payment.id,
            paymentState: payment.state,
            stripePaymentIntentId: stripeResult.paymentIntentId,
            clientSecret: stripeResult.clientSecret,
            priceCents: chargeCents,
            quote: orderBreakdown,
          };
        });

      let result = await createOrResumeCheckout();
      let reconciliationAttempts = 0;

      async function recreateCheckoutFromStaleStripeIntent(
        stripeError: string,
      ): Promise<void> {
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
          const stripeIntent = await getPaymentIntentForCheckout(
            result.stripePaymentIntentId,
          );

          if (RESUMABLE_STRIPE_INTENT_STATUSES.has(stripeIntent.status)) {
            if (hasUnexpectedPaymentMethods(stripeIntent.paymentMethodTypes)) {
              await recreateCheckoutFromStaleStripeIntent(
                `PaymentIntent ${result.stripePaymentIntentId} offers non-allowlisted methods: ${stripeIntent.paymentMethodTypes.join(", ")}`,
              );
              continue;
            }

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
            await syncDraftFulfillmentFromPaymentState(db, draftId, {
              signatureFlowMode: draft.signatureFlowMode,
              paymentState: "authorized",
            });
            await enqueueDispatchIfEligible({
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
            await syncDraftFulfillmentFromPaymentState(db, draftId, {
              signatureFlowMode: draft.signatureFlowMode,
              paymentState: "captured",
            });
            await enqueueDispatchIfEligible({
              db,
              draftId,
              paymentId: payment.id,
              log: request.log,
              failureMessage:
                "Failed to enqueue dispatch after checkout capture reconciliation",
              suppressFailure: true,
            });
            issueReceiptSafe(db, payment.id);
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
        await enqueueDispatchIfEligible({
          db,
          draftId,
          paymentId: result.paymentAttemptId,
          log: request.log,
          failureMessage:
            "Failed to enqueue dispatch after reopening authorized checkout",
        });
      }

      if (result.isExisting && result.paymentState === "captured") {
        await enqueueDispatchIfEligible({
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
