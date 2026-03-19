import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../../db/index.js";
import { notFoundError } from "../../shared/errors/index.js";
import { AppError } from "../../shared/errors/index.js";
import { hashResumeToken } from "../sessions/session.service.js";

export async function orderRoutes(app: FastifyInstance): Promise<void> {
  // GET /orders/:orderToken — public order status (token-authenticated)
  app.get<{ Params: { orderToken: string } }>(
    "/orders/:orderToken",
    async (request, reply) => {
      const db = getDb();
      const { orderToken } = request.params;

      // Look up session via hashed token (resume token serves as order
      // access token until a dedicated orderAccessToken column is added).
      const tokenHash = hashResumeToken(orderToken);
      const [session] = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.resumeTokenHash, tokenHash))
        .limit(1);

      if (!session) throw notFoundError("order");

      const [draft] = await db
        .select()
        .from(schema.draftLetters)
        .where(eq(schema.draftLetters.sessionId, session.id))
        .limit(1);

      if (!draft) throw notFoundError("order");

      const [payment] = await db
        .select()
        .from(schema.paymentAttempts)
        .where(eq(schema.paymentAttempts.draftId, draft.id))
        .limit(1);

      const [dispatch] = await db
        .select()
        .from(schema.dispatchAttempts)
        .where(eq(schema.dispatchAttempts.draftId, draft.id))
        .limit(1);

      // Fetch recipient name for display
      let recipientName = "";
      if (draft.recipientProfileId) {
        const [recipient] = await db
          .select({
            firstName: schema.recipientProfiles.firstName,
            lastName: schema.recipientProfiles.lastName,
            companyName: schema.recipientProfiles.companyName,
          })
          .from(schema.recipientProfiles)
          .where(eq(schema.recipientProfiles.id, draft.recipientProfileId))
          .limit(1);
        if (recipient) {
          recipientName = [recipient.firstName, recipient.lastName]
            .filter(Boolean)
            .join(" ") || recipient.companyName || "";
        }
      }

      reply.send({
        order: {
          draftId: draft.id,
          orderRef: `SM-${draft.id.slice(0, 8).toUpperCase()}`,
          locale: draft.locale,
          payment: {
            state: payment?.state ?? "pending",
            priceCents: payment?.amountCents ?? 0,
            currency: "CHF" as const,
            capturedAt: payment?.updatedAt?.toISOString() ?? null,
            refundedAt: null,
          },
          dispatch: {
            state: dispatch?.state ?? "queued",
            providerRef: dispatch?.providerReference ?? null,
            submittedAt: dispatch?.submittedAt?.toISOString() ?? null,
            acceptedAt: null,
            rejectedAt: null,
            trackingAvailable: false,
            lastCheckedAt: dispatch?.lastCheckedAt?.toISOString() ?? null,
          },
          deliveryType: draft.deliveryType,
          recipientName,
          createdAt: draft.createdAt.toISOString(),
        },
      });
    },
  );

  // GET /orders/:orderToken/pdf — download final rendered PDF
  app.get<{ Params: { orderToken: string } }>(
    "/orders/:orderToken/pdf",
    async (request, _reply) => {
      const db = getDb();
      const { orderToken } = request.params;

      const tokenHash = hashResumeToken(orderToken);
      const [session] = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.resumeTokenHash, tokenHash))
        .limit(1);

      if (!session) throw notFoundError("order");

      // PDF download requires rendered file in object storage — not yet implemented
      throw new AppError({
        family: "rendering_failure",
        statusCode: 501,
        code: "PDF_DOWNLOAD_NOT_IMPLEMENTED",
        message:
          "PDF download is not yet implemented. Rendering pipeline pending.",
        userMessage: "PDF download is not available yet.",
        userAction: "This feature is coming soon.",
      });
    },
  );
}
