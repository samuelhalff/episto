import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getDb, schema } from "../../db/index.js";
import { requireSession } from "../sessions/session.middleware.js";
import { notFoundError, validationError } from "../../shared/errors/index.js";
import {
  createPaymentAttempt,
  getPaymentForDraft,
  transitionPaymentState,
} from "./payment.service.js";
import {
  createPaymentIntent,
  constructWebhookEvent,
} from "./adapters/stripe.adapter.js";
import { calculatePrice, type DeliveryType } from "../pricing/index.js";

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

  app.post(
    "/webhooks/stripe",
    async (request: FastifyRequest, reply: FastifyReply) => {
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
        case "payment_intent.succeeded": {
          const intent = event.data.object;
          const draftId = intent.metadata?.draftId;
          if (!draftId) break;

          const db = getDb();
          const payment = await getPaymentForDraft(db, draftId);
          if (!payment || payment.draftId !== draftId) break;

          const chargeId =
            typeof intent.latest_charge === "string"
              ? intent.latest_charge
              : null;

          await transitionPaymentState(db, payment.id, "captured", {
            stripeChargeId: chargeId ?? undefined,
          });
          break;
        }

        case "payment_intent.payment_failed": {
          const intent = event.data.object;
          const draftId = intent.metadata?.draftId;
          if (!draftId) break;

          const db = getDb();
          const payment = await getPaymentForDraft(db, draftId);
          if (!payment || payment.draftId !== draftId) break;

          const failureMessage =
            intent.last_payment_error?.message ?? "Payment failed";

          await transitionPaymentState(db, payment.id, "failed", {
            failureReason: failureMessage,
          });
          break;
        }

        case "payment_intent.canceled": {
          const intent = event.data.object;
          const draftId = intent.metadata?.draftId;
          if (!draftId) break;

          const db = getDb();
          const payment = await getPaymentForDraft(db, draftId);
          if (!payment || payment.draftId !== draftId) break;

          await transitionPaymentState(db, payment.id, "cancelled");
          break;
        }

        default:
          // Unhandled event type — acknowledge receipt
          break;
      }

      reply.status(200).send({ received: true });
    },
  );
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export async function paymentRoutes(app: FastifyInstance): Promise<void> {
  // ---- POST /drafts/:draftId/checkout (session required) ----
  app.post<{ Params: { draftId: string } }>(
    "/drafts/:draftId/checkout",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const session = request.session!;
      const db = getDb();
      const { draftId } = request.params;

      const body = CheckoutBody.parse(request.body);

      // Verify draft belongs to this session and get delivery type for pricing
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

      // Calculate price from delivery type (config-driven, not hardcoded)
      const pricing = calculatePrice(draft.deliveryType as DeliveryType);
      const breakdown = {
        base: pricing.baseCents,
        pages: pricing.pageSurchargeCents,
        delivery: pricing.deliverySurchargeCents,
        attachments: pricing.attachmentSurchargeCents,
      };
      const amountCents = pricing.totalCents;

      // Use a transaction to prevent concurrent checkout race conditions.
      // Re-check for existing non-terminal payment inside the transaction.
      const result = await db.transaction(async (tx) => {
        const existing = await getPaymentForDraft(tx, draftId);
        if (existing && existing.state === "pending") {
          if (existing.stripePaymentIntentId) {
            return {
              isExisting: true as const,
              paymentAttemptId: existing.id,
              clientSecret: null as string | null,
              priceCents: existing.amountCents,
            };
          }
        }

        const payment = await createPaymentAttempt(tx, {
          draftId,
          sessionId: session.id,
          amountCents,
          breakdown,
        });

        const stripeResult = await createPaymentIntent(amountCents, {
          draftId,
          sessionId: session.id,
        });

        await transitionPaymentState(tx, payment.id, "authorized", {
          stripePaymentIntentId: stripeResult.paymentIntentId,
        });

        return {
          isExisting: false as const,
          paymentAttemptId: payment.id,
          clientSecret: stripeResult.clientSecret,
          priceCents: amountCents,
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
        return reply.send({
          paymentAttemptId: result.paymentAttemptId,
          clientSecret: result.clientSecret,
          priceCents: result.priceCents,
          currency: "CHF" as const,
          message: "A pending payment already exists for this draft.",
        });
      }

      reply.status(201).send({
        paymentAttemptId: result.paymentAttemptId,
        clientSecret: result.clientSecret,
        priceCents: result.priceCents,
        currency: "CHF" as const,
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

      reply.send({ payment });
    },
  );
}
