import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, and, sql, desc } from "drizzle-orm";
import { getDb, schema } from "../../db/index.js";
import { requireSession } from "../sessions/session.middleware.js";
import {
  createDraft,
  getDraftById,
  listDraftsBySession,
  updateDraft,
  transitionDraftStatus,
} from "./draft.service.js";
import { createSenderProfile, createRecipientProfile } from "./profile.service.js";
import { createSnapshot } from "../rendering/snapshot.service.js";
import { sendRenderedDraftPdf } from "../rendering/pdf-access.js";
import { renderSnapshotToPdf } from "../rendering/render.service.js";
import { resolveDisplayDispatchQuoteForDraft } from "../dispatch/dispatch-quote.service.js";
import { cancelPendingDraftPayment } from "../payments/payment-cancellation.service.js";
import { AppError, notFoundError, validationError } from "../../shared/errors/index.js";
import {
  UpdateDraftInput,
  CreateSenderProfileInput,
  CreateRecipientProfileInput,
  DraftStatusSchema,
  SnapshotDataSchema,
} from "@swiss-mail/shared";
import { recordEvent } from "../analytics/index.js";
import { getQueue, QUEUE_NAMES, type RenderPdfJob } from "../../queue/index.js";
import { handleComposeFromContext } from "../ai/index.js";
import { createLogger } from "../../shared/logging/index.js";
import { getReviewMissingFields } from "./review-validation.js";

import { z } from "zod";

const logger = createLogger("draft-routes");
const TERMINAL_DRAFT_STATES = new Set(["submitted", "dispatched", "closed"]);
const SNAPSHOT_PREVIEW_DRAFT_STATES = new Set([
  "reviewed",
  "rendering",
  "ready",
  "submitted",
  "dispatched",
  "closed",
]);

const TransitionBody = z.object({
  status: DraftStatusSchema,
});

export async function draftRoutes(app: FastifyInstance): Promise<void> {
  // All draft routes require an active session
  app.addHook("preHandler", requireSession);

  // POST /drafts — create a new draft
  app.post(
    "/drafts",
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 day",
          keyGenerator: (req: FastifyRequest) => req.session?.id ?? req.ip,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = request.session!;
      const db = getDb();

      const draft = await createDraft(db, session.id, session.locale);

      recordEvent({ event: "draft_created", sessionId: session.id, draftId: draft.id });

      reply.status(201).send({ draft });
    },
  );

  // GET /drafts — list drafts for current session
  app.get("/drafts", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = request.session!;
    const db = getDb();

    const drafts = await listDraftsBySession(db, session.id);
    reply.send({ drafts });
  });

  // GET /drafts/:draftId — get a single draft
  app.get(
    "/drafts/:draftId",
    async (
      request: FastifyRequest<{ Params: { draftId: string } }>,
      reply: FastifyReply,
    ) => {
      const session = request.session!;
      const db = getDb();
      const { draftId } = request.params;

      const draft = await getDraftById(db, draftId, session.id);
      if (!draft) throw notFoundError("draft");

      // Fetch conversationMessageCount
      const [msgCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.conversationMessages)
        .where(eq(schema.conversationMessages.draftId, draftId));

      // Fetch latestSnapshotId
      const [latestSnapshot] = await db
        .select({ id: schema.draftSnapshots.id })
        .from(schema.draftSnapshots)
        .where(eq(schema.draftSnapshots.draftId, draftId))
        .orderBy(desc(schema.draftSnapshots.createdAt))
        .limit(1);

      reply.send({
        draft: {
          ...draft,
          conversationMessageCount: msgCount?.count ?? 0,
          latestSnapshotId: latestSnapshot?.id ?? null,
        },
      });
    },
  );

  // GET /drafts/:draftId/pdf — download the latest rendered PDF for the session-owned draft
  app.get(
    "/drafts/:draftId/pdf",
    async (
      request: FastifyRequest<{ Params: { draftId: string } }>,
      reply: FastifyReply,
    ) => {
      const session = request.session!;
      const db = getDb();
      const { draftId } = request.params;

      const draft = await getDraftById(db, draftId, session.id);
      if (!draft) throw notFoundError("draft");

      await sendRenderedDraftPdf(db, draft.id, reply);
    },
  );

  // PATCH /drafts/:draftId — update draft fields
  app.patch(
    "/drafts/:draftId",
    async (
      request: FastifyRequest<{ Params: { draftId: string } }>,
      reply: FastifyReply,
    ) => {
      const session = request.session!;
      const db = getDb();
      const { draftId } = request.params;

      const body = UpdateDraftInput.parse(request.body);
      const draft = await updateDraft(db, draftId, session.id, body);

      reply.send({ draft });
    },
  );

  app.post(
    "/drafts/:draftId/compose",
    async (
      request: FastifyRequest<{ Params: { draftId: string } }>,
      reply: FastifyReply,
    ) => {
      const session = request.session!;
      const db = getDb();
      const { draftId } = request.params;

      const draft = await getDraftById(db, draftId, session.id);
      if (!draft) throw notFoundError("draft");

      if (TERMINAL_DRAFT_STATES.has(draft.status)) {
        throw new AppError({
          family: "policy_refusal",
          statusCode: 409,
          code: "DRAFT_TERMINAL",
          message: `Draft is in terminal state: ${draft.status}`,
          userMessage: "This letter can no longer be edited.",
          userAction: null,
        });
      }

      handleComposeFromContext({
        draftId,
        sessionId: session.id,
      }).catch((err) => {
        logger.error({ err, draftId }, "Context composition handler failed");
      });

      reply.status(202).send({
        status: "queued",
        streamUrl: `/api/v1/drafts/${draftId}/stream`,
      });
    },
  );

  // POST /drafts/:draftId/transition — transition draft status
  app.post(
    "/drafts/:draftId/transition",
    async (
      request: FastifyRequest<{
        Params: { draftId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const session = request.session!;
      const db = getDb();
      const { draftId } = request.params;
      const { status } = TransitionBody.parse(request.body);

      const draft = await transitionDraftStatus(db, draftId, session.id, status);

      // When returning to editable state, cancel any pending payment so
      // checkout will create a fresh PaymentIntent with the updated quote.
      if (status === "fields_complete" || status === "collecting") {
        try {
          await cancelPendingDraftPayment(db, draftId);
        } catch (err) {
          logger.warn(
            { draftId, err },
            "Failed to cancel stale payment intent on back-to-edit; checkout will create a new one",
          );
        }
      }

      reply.send({ draft });
    },
  );

  // ---- Sender Profile (draft-scoped) ----

  // PUT /drafts/:draftId/sender — set or replace sender profile for a draft
  app.put<{ Params: { draftId: string } }>(
    "/drafts/:draftId/sender",
    async (request, reply) => {
      const session = request.session!;
      const db = getDb();
      const { draftId } = request.params;

      const draft = await getDraftById(db, draftId, session.id);
      if (!draft) throw notFoundError("draft");

      const body = CreateSenderProfileInput.parse(request.body);
      const profile = await createSenderProfile(db, session.id, body);

      await db
        .update(schema.draftLetters)
        .set({ senderProfileId: profile.id, updatedAt: new Date() })
        .where(
          and(
            eq(schema.draftLetters.id, draftId),
            eq(schema.draftLetters.sessionId, session.id),
          ),
        );

      reply.send({ sender: profile });
    },
  );

  // ---- Recipient Profile (draft-scoped) ----

  // PUT /drafts/:draftId/recipient — set or replace recipient profile for a draft
  app.put<{ Params: { draftId: string } }>(
    "/drafts/:draftId/recipient",
    async (request, reply) => {
      const session = request.session!;
      const db = getDb();
      const { draftId } = request.params;

      const draft = await getDraftById(db, draftId, session.id);
      if (!draft) throw notFoundError("draft");

      const body = CreateRecipientProfileInput.parse(request.body);
      const profile = await createRecipientProfile(db, session.id, body);

      await db
        .update(schema.draftLetters)
        .set({ recipientProfileId: profile.id, updatedAt: new Date() })
        .where(
          and(
            eq(schema.draftLetters.id, draftId),
            eq(schema.draftLetters.sessionId, session.id),
          ),
        );

      reply.send({ recipient: profile });
    },
  );

  // ---- Review / Preview ----

  // POST /drafts/:draftId/review — create immutable snapshot and advance to reviewed
  app.post(
    "/drafts/:draftId/review",
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 hour",
          keyGenerator: (req: FastifyRequest) => req.session?.id ?? req.ip,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { draftId: string } }>,
      reply: FastifyReply,
    ) => {
      const session = request.session!;
      const db = getDb();
      const { draftId } = request.params;

      // Verify ownership
      const draft = await getDraftById(db, draftId, session.id);
      if (!draft) throw notFoundError("draft");

      // Signature is a soft warning at review; keep only the documented required fields blocking.
      const missingFields = getReviewMissingFields(draft);
      if (missingFields.length > 0) {
        throw validationError("Required fields missing for review", missingFields);
      }

      // Fetch sender profile
      const [sender] = await db
        .select()
        .from(schema.senderProfiles)
        .where(eq(schema.senderProfiles.id, draft.senderProfileId!))
        .limit(1);
      if (!sender)
        throw validationError("Sender profile not found", [
          { field: "sender", message: "Sender profile not found" },
        ]);

      // Fetch recipient profile
      const [recipient] = await db
        .select()
        .from(schema.recipientProfiles)
        .where(eq(schema.recipientProfiles.id, draft.recipientProfileId!))
        .limit(1);
      if (!recipient)
        throw validationError("Recipient profile not found", [
          { field: "recipient", message: "Recipient profile not found" },
        ]);

      // Fetch file assets (attachments + signature)
      const files = await db
        .select()
        .from(schema.fileAssets)
        .where(
          and(
            eq(schema.fileAssets.draftId, draftId),
            eq(schema.fileAssets.sessionId, session.id),
            eq(schema.fileAssets.status, "active"),
          ),
        );
      const attachmentFileIds = files
        .filter((f) => f.kind === "attachment")
        .map((f) => f.id);
      const signatureFile = files.find((f) => f.kind === "signature");

      // Fetch resolved display quote
      const resolvedDisplayQuoteForReview = await resolveDisplayDispatchQuoteForDraft(db, draftId);

      // Build snapshot data
      const snapshotData = {
        schemaVersion: draft.schemaVersion,
        locale: draft.locale,
        deliveryType: draft.deliveryType,
        subject: draft.subject,
        body: draft.body,
        enclosureNote: draft.enclosureNote,
        signatureMode: draft.signatureMode,
        tone: draft.tone,
        intent: draft.intent,
        sender: {
          firstName: sender.firstName,
          lastName: sender.lastName,
          company: sender.company ?? null,
          addressLine1: sender.addressLine1,
          addressLine2: sender.addressLine2 ?? null,
          postalCode: sender.postalCode,
          city: sender.city,
          country: sender.country,
        },
        recipient: {
          firstName: recipient.firstName ?? null,
          lastName: recipient.lastName ?? null,
          company: recipient.company ?? null,
          department: recipient.department ?? null,
          addressLine1: recipient.addressLine1,
          addressLine2: recipient.addressLine2 ?? null,
          postalCode: recipient.postalCode,
          city: recipient.city,
          country: recipient.country,
        },
        attachmentAssetIds: attachmentFileIds,
        signatureAssetId: signatureFile?.id ?? null,
        estimatedPages: draft.estimatedPages ?? null,
        metadata: draft.metadata as Record<string, unknown> | null,
      };

      // Review is only valid from `fields_complete`; promote directly when
      // the required fields now satisfy that state.
      if (draft.status === "collecting") {
        await transitionDraftStatus(db, draftId, session.id, "fields_complete");
      }

      // Create immutable snapshot
      const snapshot = await createSnapshot(db, draftId, snapshotData);

      // Transition to reviewed, then rendering while the final PDF is validated.
      await transitionDraftStatus(db, draftId, session.id, "reviewed");
      await transitionDraftStatus(db, draftId, session.id, "rendering");

      const renderJob = {
        snapshotId: snapshot.id,
        draftId,
      } satisfies RenderPdfJob;

      let renderedPageCount: number | null = null;

      try {
        const renderResult = await renderSnapshotToPdf(snapshot.id);
        renderedPageCount = renderResult.pageCount;

        await db
          .update(schema.draftLetters)
          .set({
            estimatedPages: renderResult.pageCount,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.draftLetters.id, draftId),
              eq(schema.draftLetters.sessionId, session.id),
            ),
          );
      } catch (err) {
        logger.warn(
          { draftId, snapshotId: snapshot.id, err },
          "Synchronous review render failed; falling back to queued render",
        );

        await getQueue(QUEUE_NAMES.RENDER_PDF).add("render-pdf", renderJob, {
          jobId: `snapshot-${snapshot.id}`,
        });

        recordEvent({
          event: "review_reached",
          draftId,
          pageCountEstimate: draft.estimatedPages ?? 1,
          attachmentCount: attachmentFileIds.length,
        });

        reply.status(201).send({
          snapshot: {
            id: snapshot.id,
            draftId: snapshot.draftId,
            schemaVersion: snapshotData.schemaVersion,
            locale: snapshotData.locale,
            deliveryType: snapshotData.deliveryType,
            subject: snapshotData.subject,
            body: snapshotData.body,
            enclosureNote: snapshotData.enclosureNote,
            signatureMode: snapshotData.signatureMode,
            sender: snapshotData.sender,
            recipient: snapshotData.recipient,
            attachmentFileIds,
            signatureFileId: signatureFile?.id ?? null,
            priceCents: resolvedDisplayQuoteForReview.quote.totalCents,
            createdAt: snapshot.createdAt.toISOString(),
          },
        });
        return;
      }

      if (renderedPageCount > 5) {
        await transitionDraftStatus(db, draftId, session.id, "fields_complete");

        throw validationError("Letters are limited to 5 pages.", [
          {
            field: "estimatedPages",
            message: "Shorten the letter to 5 pages or fewer before continuing.",
          },
        ]);
      }

      await transitionDraftStatus(db, draftId, session.id, "ready");

      recordEvent({
        event: "review_reached",
        draftId,
        pageCountEstimate: renderedPageCount ?? draft.estimatedPages ?? 1,
        attachmentCount: attachmentFileIds.length,
      });

      reply.status(201).send({
        snapshot: {
          id: snapshot.id,
          draftId: snapshot.draftId,
          schemaVersion: snapshotData.schemaVersion,
          locale: snapshotData.locale,
          deliveryType: snapshotData.deliveryType,
          subject: snapshotData.subject,
          body: snapshotData.body,
          enclosureNote: snapshotData.enclosureNote,
          signatureMode: snapshotData.signatureMode,
          sender: snapshotData.sender,
          recipient: snapshotData.recipient,
          attachmentFileIds,
          signatureFileId: signatureFile?.id ?? null,
          priceCents: resolvedDisplayQuoteForReview.quote.totalCents,
          createdAt: snapshot.createdAt.toISOString(),
        },
      });
    },
  );

  // GET /drafts/:draftId/preview — get letter content for preview rendering
  app.get(
    "/drafts/:draftId/preview",
    async (
      request: FastifyRequest<{ Params: { draftId: string } }>,
      reply: FastifyReply,
    ) => {
      const session = request.session!;
      const db = getDb();
      const { draftId } = request.params;

      const draft = await getDraftById(db, draftId, session.id);
      if (!draft) throw notFoundError("draft");

      // Fetch latest snapshot data when present so already-prepared drafts render
      // the immutable version that will actually be sent.
      const [latestSnapshot] = await db
        .select({
          id: schema.draftSnapshots.id,
          snapshotData: schema.draftSnapshots.snapshotData,
          createdAt: schema.draftSnapshots.createdAt,
        })
        .from(schema.draftSnapshots)
        .where(eq(schema.draftSnapshots.draftId, draftId))
        .orderBy(desc(schema.draftSnapshots.createdAt))
        .limit(1);

      const snapshotParse =
        latestSnapshot && SNAPSHOT_PREVIEW_DRAFT_STATES.has(draft.status)
          ? SnapshotDataSchema.safeParse(latestSnapshot.snapshotData)
          : null;
      if (snapshotParse && !snapshotParse.success) {
        logger.warn(
          {
            draftId,
            snapshotId: latestSnapshot?.id,
            issues: snapshotParse.error.issues,
          },
          "Latest snapshot data was invalid for preview; falling back to live draft data",
        );
      }
      const snapshotData = snapshotParse?.success ? snapshotParse.data : null;

      let sender = null;
      let recipient = null;
      let attachmentCount = snapshotData?.attachmentAssetIds.length ?? 0;
      let signatureFileId = snapshotData?.signatureAssetId ?? null;

      if (!snapshotData) {
        if (draft.senderProfileId) {
          const [s] = await db
            .select()
            .from(schema.senderProfiles)
            .where(eq(schema.senderProfiles.id, draft.senderProfileId))
            .limit(1);
          if (s) sender = s;
        }

        if (draft.recipientProfileId) {
          const [r] = await db
            .select()
            .from(schema.recipientProfiles)
            .where(eq(schema.recipientProfiles.id, draft.recipientProfileId))
            .limit(1);
          if (r) recipient = r;
        }

        const activeFiles = await db
          .select({
            id: schema.fileAssets.id,
            kind: schema.fileAssets.kind,
          })
          .from(schema.fileAssets)
          .where(
            and(
              eq(schema.fileAssets.draftId, draftId),
              eq(schema.fileAssets.sessionId, session.id),
              eq(schema.fileAssets.status, "active"),
            ),
          );

        attachmentCount = activeFiles.filter((file) => file.kind === "attachment").length;
        signatureFileId =
          draft.signatureAssetId ??
          activeFiles.find((file) => file.kind === "signature")?.id ??
          null;
      }

      const deliveryType = (snapshotData?.deliveryType ?? draft.deliveryType) as
        | "standard"
        | "registered";
      const resolvedDisplayQuote = await resolveDisplayDispatchQuoteForDraft(db, draftId);

      reply.send({
        preview: {
          draftId: draft.id,
          snapshotId: latestSnapshot?.id ?? null,
          locale: snapshotData?.locale ?? draft.locale,
          deliveryType,
          subject: snapshotData?.subject ?? draft.subject,
          body: snapshotData?.body ?? draft.body,
          enclosureNote: snapshotData?.enclosureNote ?? draft.enclosureNote,
          sender: snapshotData?.sender ?? sender,
          recipient: snapshotData?.recipient ?? recipient,
          signatureMode: snapshotData?.signatureMode ?? draft.signatureMode,
          signatureFileId,
          attachmentCount,
          priceCents: resolvedDisplayQuote.quote.totalCents,
          updatedAt: snapshotData
            ? latestSnapshot!.createdAt.toISOString()
            : draft.updatedAt.toISOString(),
        },
      });
    },
  );
}
