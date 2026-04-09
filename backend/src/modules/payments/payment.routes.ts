import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getDb, schema } from "../../db/index.js";
import { requireSession } from "../sessions/session.middleware.js";
import { AppError, notFoundError, validationError } from "../../shared/errors/index.js";
import {
  createPaymentAttempt,
  getPaymentAttemptById,
  getPaymentForDraft,
  setPaymentIntentId,
  transitionPaymentState,
} from "./payment.service.js";
import { enqueueDispatchConfirmationEmail } from "../dispatch/dispatch-confirmation.js";
import {
  createPaymentIntent,
  constructWebhookEvent,
  getPaymentIntentForCheckout,
} from "./adapters/stripe.adapter.js";
import { recordEvent } from "../analytics/index.js";
import { getLatestSnapshot } from "../rendering/snapshot.service.js";
import { enqueueDispatchSubmission } from "../dispatch/dispatch.jobs.js";
import {
  resolveDisplayDispatchQuoteForDraft,
  resolvePaymentDispatchQuoteForDraft,
} from "../dispatch/dispatch-quote.service.js";

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const CheckoutBody = z.object({
  email: z.string().email().max(254),
});

// ---------------------------------------------------------------------------
// Webhook sub-plugin (encapsulated — overrides content-type parser for raw body)
// ---------------------------------------------------------------------------

async function webhookRoutes(app: FastifyInstance): Promise<void> {
  // Override JSON parser to preserve raw body for Stripe signature verification.
  // This only affects routes registered inside this encapsulated plugin.
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (req, body, done) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).rawBodyBuffer = body;
      try {
        done(null, JSON.parse((body as Buffer).toString("utf-8")));
      } catch {
        done(new Error("Invalid JSON"), undefined);
      }
    },
  );

  async function getWebhookPayment(draftId: string, paymentAttemptId: string) {
    const db = getDb();
    const payment = await getPaymentAttemptById(db, paymentAttemptId);
    if (!payment || payment.draftId !== draftId) {
      return { db, payment: null as null };
    }

    return { db, payment };
  }

  app.post("/webhooks/stripe", async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers["stripe-signature"];
    if (typeof signature !== "string") {
      throw validationError("Missing stripe-signature header");
    }

    // Raw body preserved by our custom content type parser
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawBody: unknown = (request as any).rawBodyBuffer;
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

        const { db, payment } = await getWebhookPayment(draftId, paymentAttemptId);
        if (!payment) break;

        await transitionPaymentState(db, payment.id, "authorized", {
          stripePaymentIntentId: intent.id,
        });

        const snapshot = await getLatestSnapshot(db, draftId);
        if (snapshot?.renderedPdfAssetId) {
          await enqueueDispatchSubmission({
            draftId,
            snapshotId: snapshot.id,
            paymentId: payment.id,
          });
        }
        break;
      }

      case "payment_intent.succeeded": {
        const intent = event.data.object;
        const draftId = intent.metadata?.draftId;
        const paymentAttemptId = intent.metadata?.paymentAttemptId;
        if (!draftId || !paymentAttemptId) break;

        const { db, payment } = await getWebhookPayment(draftId, paymentAttemptId);
        if (!payment) break;

        const chargeId =
          typeof intent.latest_charge === "string" ? intent.latest_charge : null;

        const { rawOrderAccessToken } = await transitionPaymentState(
          db,
          payment.id,
          "captured",
          {
            stripeChargeId: chargeId ?? undefined,
          },
        );

        // Enqueue dispatch — with automatic capture this is the primary trigger.
        // BullMQ deduplicates by jobId (dispatch:{paymentId}), so webhook retries
        // and race conditions with render-pdf worker are safe.
        const snapshot = await getLatestSnapshot(db, draftId);
        if (snapshot?.renderedPdfAssetId) {
          await enqueueDispatchSubmission({
            draftId,
            snapshotId: snapshot.id,
            paymentId: payment.id,
          });
        }

        recordEvent({
          event: "payment_captured",
          draftId,
          paymentAttemptId: payment.id,
          amountCents: payment.amountCents,
        });

        if (rawOrderAccessToken) {
          try {
            await enqueueDispatchConfirmationEmail(db, payment, rawOrderAccessToken);
          } catch (err) {
            request.log.error({ err }, "Failed to enqueue dispatch confirmation email");
          }
        }
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
        // Unhandled event type — acknowledge receipt
        break;
    }

    reply.status(200).send({ received: true });
  });
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export async function paymentRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { draftId: string } }>(
    "/drafts/:draftId/quote",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const session = request.session!;
      const db = getDb();
      const { draftId } = request.params;

      const [draft] = await db
        .select({ id: schema.draftLetters.id })
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

  // ---- POST /drafts/:draftId/checkout (session required) ----
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
      const session = request.session!;
      const db = getDb();
      const { draftId } = request.params;

      const body = CheckoutBody.parse(request.body);

      // Verify draft belongs to this session
      const [draft] = await db
        .select({
          id: schema.draftLetters.id,
          deliveryType: schema.draftLetters.deliveryType,
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

      const resolvedPaymentQuote = await resolvePaymentDispatchQuoteForDraft(db, draftId);
      const amountCents = resolvedPaymentQuote.quote.totalCents;

      // Use a transaction to prevent concurrent checkout race conditions.
      // Re-check for existing non-terminal payment inside the transaction.
      const NON_TERMINAL_STATES = ["pending", "authorized", "captured", "refund_pending"];
      const MAX_CHECKOUT_RECONCILIATION_ATTEMPTS = 3;
      const RESUMABLE_STRIPE_INTENT_STATUSES = new Set([
        "requires_payment_method",
        "requires_confirmation",
        "requires_action",
        "processing",
      ]);
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

      async function enqueueDispatchIfSnapshotReady(
        paymentId: string,
        options: { suppressFailure?: boolean } = {},
      ): Promise<void> {
        try {
          const snapshot = await getLatestSnapshot(db, draftId);
          if (snapshot?.renderedPdfAssetId) {
            await enqueueDispatchSubmission({
              draftId,
              snapshotId: snapshot.id,
              paymentId,
            });
          }
        } catch (err) {
          request.log.error(
            { err, draftId, paymentId },
            "Failed to enqueue dispatch after checkout payment reconciliation",
          );
          if (!options.suppressFailure) {
            throw err;
          }
        }
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

            result = {
              ...result,
              clientSecret: stripeIntent.clientSecret,
            };
            break;
          }

          if (stripeIntent.status === "requires_capture") {
            const { payment } = await transitionPaymentState(db, result.paymentAttemptId, "authorized", {
              stripePaymentIntentId: result.stripePaymentIntentId,
            });
            await enqueueDispatchIfSnapshotReady(payment.id);
            result = {
              ...result,
              paymentState: payment.state,
              clientSecret: null,
            };
            break;
          }

          if (stripeIntent.status === "succeeded") {
            const { payment, rawOrderAccessToken } = await transitionPaymentState(
              db,
              result.paymentAttemptId,
              "captured",
              {
                stripePaymentIntentId: result.stripePaymentIntentId,
                stripeChargeId: stripeIntent.latestChargeId ?? undefined,
              },
            );
            await enqueueDispatchIfSnapshotReady(payment.id, {
              suppressFailure: true,
            });
            if (rawOrderAccessToken) {
              try {
                await enqueueDispatchConfirmationEmail(db, payment, rawOrderAccessToken);
              } catch (err) {
                request.log.error({ err }, "Failed to enqueue dispatch confirmation email");
              }
            }
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
        await enqueueDispatchIfSnapshotReady(result.paymentAttemptId);
      }

      if (result.isExisting && result.paymentState === "captured") {
        await enqueueDispatchIfSnapshotReady(result.paymentAttemptId, {
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

  // Webhook routes live in an encapsulated sub-plugin with raw body parsing
  await app.register(webhookRoutes);

  // ---- GET /drafts/:draftId/payment (session required) ----
  app.get<{ Params: { draftId: string } }>(
    "/drafts/:draftId/payment",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const session = request.session!;
      const db = getDb();
      const { draftId } = request.params;

      // Verify draft belongs to this session
      const [draft] = await db
        .select({ id: schema.draftLetters.id })
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

      if (payment.state === "pending" && payment.stripePaymentIntentId) {
        const stripeIntent = await getPaymentIntentForCheckout(payment.stripePaymentIntentId);

        if (stripeIntent.status === "requires_capture") {
          const result = await transitionPaymentState(db, payment.id, "authorized", {
            stripePaymentIntentId: payment.stripePaymentIntentId,
          });
          payment = result.payment;

          const snapshot = await getLatestSnapshot(db, draftId);
          if (snapshot?.renderedPdfAssetId) {
            await enqueueDispatchSubmission({
              draftId,
              snapshotId: snapshot.id,
              paymentId: payment.id,
            });
          }
        } else if (stripeIntent.status === "succeeded") {
          const result = await transitionPaymentState(db, payment.id, "captured", {
            stripePaymentIntentId: payment.stripePaymentIntentId,
            stripeChargeId: stripeIntent.latestChargeId ?? undefined,
          });
          payment = result.payment;

          const snapshot = await getLatestSnapshot(db, draftId);
          if (snapshot?.renderedPdfAssetId) {
            await enqueueDispatchSubmission({
              draftId,
              snapshotId: snapshot.id,
              paymentId: payment.id,
            });
          }

          if (result.rawOrderAccessToken) {
            try {
              await enqueueDispatchConfirmationEmail(db, payment, result.rawOrderAccessToken);
            } catch (err) {
              request.log.error({ err }, "Failed to enqueue dispatch confirmation email");
            }
          }
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
          authorizedAt: null,
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
