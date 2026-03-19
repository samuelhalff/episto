import type { FastifyInstance, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../../db/index.js";
import { notFoundError } from "../../shared/errors/index.js";
import { AppError } from "../../shared/errors/index.js";
import { hashResumeToken } from "../sessions/session.service.js";
import { getLatestSnapshot } from "../rendering/snapshot.service.js";
import { getPresignedDownloadUrl } from "../files/adapters/s3.adapter.js";

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
            company: schema.recipientProfiles.company,
          })
          .from(schema.recipientProfiles)
          .where(eq(schema.recipientProfiles.id, draft.recipientProfileId))
          .limit(1);
        if (recipient) {
          recipientName = [recipient.firstName, recipient.lastName]
            .filter(Boolean)
            .join(" ") || recipient.company || "";
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

      // Find the latest snapshot with a rendered PDF
      const snapshot = await getLatestSnapshot(db, draft.id);
      if (!snapshot?.renderedPdfAssetId) {
        throw new AppError({
          family: "rendering_failure",
          statusCode: 404,
          code: "PDF_NOT_READY",
          message: "No rendered PDF is available for this order yet.",
          userMessage: "Your letter PDF is not ready yet.",
          userAction: "Please try again in a few moments.",
        });
      }

      // Look up the file asset to get the storage key
      const [pdfAsset] = await db
        .select({
          storageKey: schema.fileAssets.storageKey,
          status: schema.fileAssets.status,
        })
        .from(schema.fileAssets)
        .where(eq(schema.fileAssets.id, snapshot.renderedPdfAssetId))
        .limit(1);

      if (!pdfAsset || pdfAsset.status !== "active") {
        throw new AppError({
          family: "rendering_failure",
          statusCode: 410,
          code: "PDF_EXPIRED",
          message: "The rendered PDF has been deleted per retention policy.",
          userMessage: "This PDF is no longer available.",
          userAction: "PDFs are retained for a limited time after dispatch.",
        });
      }

      const downloadUrl = await getPresignedDownloadUrl(
        pdfAsset.storageKey,
        300,
      );

      reply.redirect(downloadUrl);
    },
  );
}
