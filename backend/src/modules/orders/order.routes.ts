import type { FastifyInstance, FastifyRequest } from "fastify";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "../../db/index.js";
import { notFoundError } from "../../shared/errors/index.js";
import { hashResumeToken } from "../sessions/session.service.js";
import { sendRenderedDraftPdf } from "../rendering/pdf-access.js";
import { recordEvent } from "../analytics/index.js";

/**
 * Resolve an order access token to its payment attempt.
 * Verifies the token hash and checks that it has not expired.
 * Returns null if the token is invalid or expired.
 */
async function resolveOrderToken(
  db: ReturnType<typeof getDb>,
  orderToken: string,
): Promise<typeof schema.paymentAttempts.$inferSelect | null> {
  const tokenHash = hashResumeToken(orderToken);
  const [payment] = await db
    .select()
    .from(schema.paymentAttempts)
    .where(eq(schema.paymentAttempts.orderAccessTokenHash, tokenHash))
    .limit(1);

  if (!payment) return null;
  if (!payment.orderAccessTokenExpiresAt) return null;
  if (payment.orderAccessTokenExpiresAt < new Date()) return null;

  return payment;
}

function ipKey(req: FastifyRequest): string {
  return req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ?? req.ip;
}

export async function orderRoutes(app: FastifyInstance): Promise<void> {
  // GET /orders/:orderToken — public order status (token-authenticated)
  app.get<{ Params: { orderToken: string } }>(
    "/orders/:orderToken",
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 minute",
          keyGenerator: ipKey,
        },
      },
    },
    async (request, reply) => {
      const db = getDb();
      const { orderToken } = request.params;

      const payment = await resolveOrderToken(db, orderToken);
      if (!payment) throw notFoundError("order");

      const [draft] = await db
        .select()
        .from(schema.draftLetters)
        .where(eq(schema.draftLetters.id, payment.draftId))
        .limit(1);

      if (!draft) throw notFoundError("order");

      const [dispatch] = await db
        .select()
        .from(schema.dispatchAttempts)
        .where(eq(schema.dispatchAttempts.draftId, draft.id))
        .orderBy(desc(schema.dispatchAttempts.createdAt))
        .limit(1);

      // Fetch recipient name for display
      let recipientName = "";
      if (draft.recipientProfileId) {
        const [recipient] = await db
          .select({
            firstName: schema.recipientProfiles.firstName,
            lastName: schema.recipientProfiles.lastName,
            company: schema.recipientProfiles.company,
          })
          .from(schema.recipientProfiles)
          .where(eq(schema.recipientProfiles.id, draft.recipientProfileId))
          .limit(1);
        if (recipient) {
          recipientName =
            [recipient.firstName, recipient.lastName].filter(Boolean).join(" ") ||
            recipient.company ||
            "";
        }
      }

      reply.send({
        order: {
          draftId: draft.id,
          orderRef: `SM-${draft.id.slice(0, 8).toUpperCase()}`,
          locale: draft.locale,
          payment: {
            state: payment.state,
            priceCents: payment.amountCents,
            currency: "CHF" as const,
            capturedAt:
              payment.state === "captured" ? payment.updatedAt.toISOString() : null,
            refundedAt:
              payment.state === "refunded" ? payment.updatedAt.toISOString() : null,
          },
          dispatch: {
            state: dispatch?.state ?? "queued",
            providerRef: dispatch?.providerReference ?? null,
            trackingNumber: dispatch?.trackingNumber ?? null,
            submittedAt: dispatch?.submittedAt?.toISOString() ?? null,
            acceptedAt:
              dispatch && ["accepted", "reconciled"].includes(dispatch.state)
                ? dispatch.updatedAt.toISOString()
                : null,
            rejectedAt:
              dispatch?.state === "rejected" ? dispatch.updatedAt.toISOString() : null,
            trackingAvailable: Boolean(dispatch?.trackingNumber),
            lastCheckedAt: dispatch?.lastCheckedAt?.toISOString() ?? null,
          },
          deliveryType: draft.deliveryType,
          recipientName,
          createdAt: draft.createdAt.toISOString(),
        },
      });

      recordEvent({
        event: "order_status_viewed",
        draftId: draft.id,
        dispatchState: dispatch?.state ?? "queued",
      });
    },
  );

  // GET /orders/:orderToken/pdf — download final rendered PDF
  app.get<{ Params: { orderToken: string } }>(
    "/orders/:orderToken/pdf",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 hour",
          keyGenerator: ipKey,
        },
      },
    },
    async (request, reply) => {
      const db = getDb();
      const { orderToken } = request.params;

      const payment = await resolveOrderToken(db, orderToken);
      if (!payment) throw notFoundError("order");

      const [draft] = await db
        .select()
        .from(schema.draftLetters)
        .where(eq(schema.draftLetters.id, payment.draftId))
        .limit(1);

      if (!draft) throw notFoundError("order");
      await sendRenderedDraftPdf(db, draft.id, reply);
    },
  );
}
