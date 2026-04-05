import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getDb, schema } from "../../db/index.js";
import { requireSession } from "../sessions/session.middleware.js";
import { notFoundError, validationError } from "../../shared/errors/index.js";
import {
  createPaymentAttempt,
  getPaymentForDraft,
  setPaymentIntentId,
  transitionPaymentState,
} from "./payment.service.js";
import { enqueuePaymentReceiptEmail } from "./payment-notifications.js";
import {
  createPaymentIntent,
  constructWebhookEvent,
  getPaymentIntentClientSecret,
} from "./adapters/stripe.adapter.js";
import { getQueue, QUEUE_NAMES, type SendEmailJob } from "../../queue/index.js";
import { recordEvent } from "../analytics/index.js";
import { getLatestSnapshot } from "../rendering/snapshot.service.js";
import { enqueueDispatchSubmission } from "../dispatch/dispatch.jobs.js";
import { getDispatchQuoteForDraft } from "../dispatch/dispatch-quote.service.js";

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

  app.post("/webhooks/stripe", async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers["stripe-signature"];
    if (typeof signature !== "string") {
      throw validationError("Missing stripe-signature header");
    }

    // Raw body preserved by our custom content type parser
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawBody: Buffer | undefined = (request as any).rawBodyBuffer;
    if (!rawBody) {
      throw validationError("Missing request body");
    }

    const event = constructWebhookEvent(rawBody, signature);

    switch (event.type) {
      case "payment_intent.amount_capturable_updated": {
        const intent = event.data.object;
        const draftId = intent.metadata?.draftId;
        const paymentAttemptId = intent.metadata?.paymentAttemptId;
        if (!draftId || !paymentAttemptId || intent.status !== "requires_capture") break;

        const db = getDb();
        const payment = await getPaymentForDraft(db, draftId);
        if (!payment || payment.id !== paymentAttemptId) break;

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

        const db = getDb();
        const payment = await getPaymentForDraft(db, draftId);
        if (!payment || payment.id !== paymentAttemptId) break;

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

        recordEvent({
          event: "payment_captured",
          draftId,
          paymentAttemptId: payment.id,
          amountCents: payment.amountCents,
        });

        if (rawOrderAccessToken) {
          // Enqueue payment receipt email with the order status link.
          // Fire-and-forget: a queue failure must not cause Stripe to retry the webhook.
          void (async () => {
            try {
              await enqueuePaymentReceiptEmail(db, payment, rawOrderAccessToken);
            } catch (err) {
              request.log.error({ err }, "Failed to enqueue payment receipt email");
            }
          })();
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object;
        const draftId = intent.metadata?.draftId;
        const paymentAttemptId = intent.metadata?.paymentAttemptId;
        if (!draftId || !paymentAttemptId) break;

        const db = getDb();
        const payment = await getPaymentForDraft(db, draftId);
        if (!payment || payment.id !== paymentAttemptId) break;

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

        const db = getDb();
        const payment = await getPaymentForDraft(db, draftId);
        if (!payment || payment.id !== paymentAttemptId) break;

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

      const quote = await getDispatchQuoteForDraft(db, draftId);
      reply.send({ quote });
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

      const quote = await getDispatchQuoteForDraft(db, draftId);
      const amountCents = quote.totalCents;

      // Use a transaction to prevent concurrent checkout race conditions.
      // Re-check for existing non-terminal payment inside the transaction.
      const NON_TERMINAL_STATES = ["pending", "authorized", "captured", "refund_pending"];
      const result = await db.transaction(async (tx) => {
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
            deliveryType: quote.deliveryType,
            providerQuotedCents: quote.providerQuotedCents,
            swissMailMarkupCents: quote.swissMailMarkupCents,
            totalCents: quote.totalCents,
            providerQuoteReference: quote.providerQuoteReference,
            attachmentHandling: quote.attachmentHandling,
            lineItems: quote.lineItems,
          },
        });

        const stripeResult = await createPaymentIntent(amountCents, {
          draftId,
          sessionId: session.id,
          paymentAttemptId: payment.id,
        });

        await setPaymentIntentId(tx, payment.id, stripeResult.paymentIntentId);

        return {
          isExisting: false as const,
          paymentAttemptId: payment.id,
          paymentState: payment.state,
          stripePaymentIntentId: stripeResult.paymentIntentId,
          clientSecret: stripeResult.clientSecret,
          priceCents: amountCents,
          quote,
        };
      });

      // Store email on session for receipt delivery
      if (body.email) {
        await db
          .update(schema.sessions)
          .set({ email: body.email, updatedAt: new Date() })
          .where(eq(schema.sessions.id, session.id));
      }

      if (result.isExisting) {
        const clientSecret =
          result.paymentState === "pending" && result.stripePaymentIntentId
            ? await getPaymentIntentClientSecret(result.stripePaymentIntentId)
            : null;

        return reply.send({
          paymentAttemptId: result.paymentAttemptId,
          clientSecret,
          priceCents: result.priceCents,
          currency: "CHF" as const,
          quote: result.quote,
        });
      }

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

      reply.send({
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

      const payment = await getPaymentForDraft(db, draftId);
      if (!payment) throw notFoundError("payment");

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
