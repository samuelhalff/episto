import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { getDb } from "../../db/index.js";
import { requireSession } from "../sessions/session.middleware.js";
import { notFoundError, validationError } from "../../shared/errors/index.js";
import {
  createPaymentAttempt,
  getPaymentAttempt,
  getPaymentForDraft,
  transitionPaymentState,
} from "./payment.service.js";
import {
  createPaymentIntent,
  constructWebhookEvent,
} from "./adapters/stripe.adapter.js";

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const CreateIntentBody = z.object({
  draftId: z.string().uuid(),
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
      (req as any).rawBodyBuffer = body;
      try {
        done(null, JSON.parse((body as Buffer).toString("utf-8")));
      } catch {
        done(new Error("Invalid JSON"), undefined);
      }
    },
  );

  app.post(
    "/payments/webhook",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const signature = request.headers["stripe-signature"];
      if (typeof signature !== "string") {
        throw validationError("Missing stripe-signature header");
      }

      // Raw body preserved by our custom content type parser
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
  // ---- POST /payments/create-intent (session required) ----
  app.post(
    "/payments/create-intent",
    { preHandler: [requireSession] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = request.session!;
      const db = getDb();

      const body = CreateIntentBody.parse(request.body);

      // Check for existing non-terminal payment to ensure idempotency
      const existing = await getPaymentForDraft(db, body.draftId);
      if (existing && existing.state === "pending") {
        if (existing.stripePaymentIntentId) {
          return reply.send({
            paymentId: existing.id,
            clientSecret: null,
            message: "A pending payment already exists for this draft.",
          });
        }
      }

      // TODO: Calculate real pricing from draft content.
      // For now, the breakdown is hardcoded — pricing service will replace this.
      const breakdown = { base: 195, pages: 0, delivery: 0, attachments: 0 };
      const amountCents = breakdown.base + breakdown.pages + breakdown.delivery + breakdown.attachments;

      const payment = await createPaymentAttempt(db, {
        draftId: body.draftId,
        sessionId: session.id,
        amountCents,
        breakdown,
      });

      const result = await createPaymentIntent(
        amountCents,
        { draftId: body.draftId, sessionId: session.id },
      );

      await transitionPaymentState(db, payment.id, "authorized", {
        stripePaymentIntentId: result.paymentIntentId,
      });

      reply.status(201).send({
        paymentId: payment.id,
        clientSecret: result.clientSecret,
      });
    },
  );

  // Webhook routes live in an encapsulated sub-plugin with raw body parsing
  await app.register(webhookRoutes);

  // ---- GET /payments/:paymentId (session required) ----
  app.get<{ Params: { paymentId: string } }>(
    "/payments/:paymentId",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const session = request.session!;
      const db = getDb();
      const { paymentId } = request.params;

      const payment = await getPaymentAttempt(db, paymentId, session.id);
      if (!payment) throw notFoundError("payment");

      reply.send({ payment });
    },
  );
}
