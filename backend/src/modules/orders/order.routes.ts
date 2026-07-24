import type { FastifyInstance, FastifyRequest } from "fastify";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { buildOrderReference, OrderStatusResponseSchema } from "@episto/shared";
import { getDb, schema } from "../../db/index.js";
import { AppError, notFoundError } from "../../shared/errors/index.js";
import { createLogger } from "../../shared/logging/index.js";
import { sendRenderedDraftPdf } from "../rendering/pdf-access.js";
import { recordEvent } from "../analytics/index.js";
import { isMockEpostProviderName } from "../dispatch/adapters/epost-submission-mode.js";
import { enqueuePaymentReceiptEmailSafe } from "../payments/receipt-notifications.js";
import { isStatementWithinRetentionWindow } from "./order-access-window.js";
import { resolveOrderAccessPayment } from "./order-token-resolver.js";

const logger = createLogger("order-routes");

// Cap the number of recent orders re-sent per request — prevents a single call
// from fanning out into an unbounded number of emails.
const RESEND_LINK_MAX_ORDERS = 10;

/**
 * Resolve an order access token to its payment attempt.
 * Verifies the token hash and checks that it has not expired.
 * Returns null if the token is invalid or expired.
 */
async function resolveOrderToken(
  db: ReturnType<typeof getDb>,
  orderToken: string,
): Promise<typeof schema.paymentAttempts.$inferSelect | null> {
  return resolveOrderAccessPayment(db, orderToken);
}

function ipKey(req: FastifyRequest): string {
  return req.ip;
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
      if (!isStatementWithinRetentionWindow(payment.orderAccessTokenExpiresAt)) {
        throw new AppError({
          family: "validation_error",
          statusCode: 410,
          code: "ORDER_STATEMENT_EXPIRED",
          message: `Statement download expired for order token ${orderToken}`,
          userMessage: "This statement is no longer available for download.",
          userAction: "Contact support if you need a copy.",
        });
      }

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

      const response = OrderStatusResponseSchema.parse({
        order: {
          draftId: draft.id,
          orderRef: buildOrderReference(draft.id),
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
            providerMode: dispatch
              ? isMockEpostProviderName(dispatch.providerName)
                ? "mock"
                : "live"
              : null,
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

      reply.send(response);

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

      if (!isStatementWithinRetentionWindow(payment.orderAccessTokenExpiresAt)) {
        throw new AppError({
          family: "validation_error",
          statusCode: 410,
          code: "ORDER_STATEMENT_EXPIRED",
          message: `Statement download expired for order token ${orderToken}`,
          userMessage: "This statement is no longer available for download.",
          userAction: "Contact support if you need a copy.",
        });
      }

      const [draft] = await db
        .select()
        .from(schema.draftLetters)
        .where(eq(schema.draftLetters.id, payment.draftId))
        .limit(1);

      if (!draft) throw notFoundError("order");
      await sendRenderedDraftPdf(db, draft.id, reply);
    },
  );

  // POST /orders/resend-link — re-send secure links + receipts for recent orders
  // matching an email. Always returns a generic 200 to avoid enumeration.
  app.post<{ Body: { email?: unknown } }>(
    "/orders/resend-link",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 hour",
          keyGenerator: ipKey,
        },
      },
    },
    async (request, reply) => {
      // Generic response — NEVER reveals whether the email exists or how many
      // orders it has. Returned identically for every code path below.
      const genericResponse = {
        message: "If that email has recent orders, we've sent the links.",
      } as const;

      const rawEmail = (request.body as { email?: unknown } | undefined)?.email;
      const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
      if (!email) {
        reply.send(genericResponse);
        return;
      }

      try {
        const db = getDb();
        const now = new Date();

        const rows = await db
          .select({ paymentAttemptId: schema.paymentAttempts.id })
          .from(schema.paymentAttempts)
          .innerJoin(
            schema.sessions,
            eq(schema.paymentAttempts.sessionId, schema.sessions.id),
          )
          .where(
            and(
              // Case-insensitive: session emails are stored as the user typed
              // them, while the lookup email is normalized to lowercase.
              eq(sql`lower(${schema.sessions.email})`, email),
              eq(schema.paymentAttempts.state, "captured"),
              gt(schema.paymentAttempts.orderAccessTokenExpiresAt, now),
            ),
          )
          .orderBy(desc(schema.paymentAttempts.createdAt))
          .limit(RESEND_LINK_MAX_ORDERS);

        for (const row of rows) {
          enqueuePaymentReceiptEmailSafe(db, row.paymentAttemptId);
        }
      } catch (err) {
        // Swallow: an internal failure must not leak via a differing response.
        logger.error({ err }, "resend-link enqueue failed");
      }

      reply.send(genericResponse);
    },
  );
}
