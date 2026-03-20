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
import {
  createSenderProfile,
  createRecipientProfile,
} from "./profile.service.js";
import { createSnapshot } from "../rendering/snapshot.service.js";
import { calculatePrice } from "../pricing/index.js";
import { notFoundError, validationError } from "../../shared/errors/index.js";
import {
  UpdateDraftInput,
  CreateSenderProfileInput,
  CreateRecipientProfileInput,
  DraftStatusSchema,
} from "@swiss-mail/shared";
import { recordEvent } from "../analytics/index.js";

import { z } from "zod";

const TransitionBody = z.object({
  status: DraftStatusSchema,
});

export async function draftRoutes(app: FastifyInstance): Promise<void> {
  // All draft routes require an active session
  app.addHook("preHandler", requireSession);

  // POST /drafts — create a new draft
  app.post("/drafts", {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: "1 day",
        keyGenerator: (req: FastifyRequest) => req.session!.id,
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const session = request.session!;
    const db = getDb();

    const draft = await createDraft(db, session.id, session.locale);

    recordEvent({ event: "draft_created", sessionId: session.id, draftId: draft.id });

    reply.status(201).send({ draft });
  });

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
          keyGenerator: (req: FastifyRequest) => req.session!.id,
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

      // Validate required fields for review
      const missingFields: { field: string; message: string }[] = [];
      if (!draft.subject) missingFields.push({ field: "subject", message: "Subject is required" });
      if (!draft.body) missingFields.push({ field: "body", message: "Body is required" });
      if (!draft.signatureMode) missingFields.push({ field: "signatureMode", message: "Signature mode is required" });
      if (!draft.senderProfileId) missingFields.push({ field: "sender", message: "Sender profile is required" });
      if (!draft.recipientProfileId) missingFields.push({ field: "recipient", message: "Recipient profile is required" });
      if (missingFields.length > 0) {
        throw validationError("Required fields missing for review", missingFields);
      }

      // Fetch sender profile
      const [sender] = await db
        .select()
        .from(schema.senderProfiles)
        .where(eq(schema.senderProfiles.id, draft.senderProfileId!))
        .limit(1);
      if (!sender) throw validationError("Sender profile not found", [{ field: "sender", message: "Sender profile not found" }]);

      // Fetch recipient profile
      const [recipient] = await db
        .select()
        .from(schema.recipientProfiles)
        .where(eq(schema.recipientProfiles.id, draft.recipientProfileId!))
        .limit(1);
      if (!recipient) throw validationError("Recipient profile not found", [{ field: "recipient", message: "Recipient profile not found" }]);

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
      const attachmentFileIds = files.filter((f) => f.kind === "attachment").map((f) => f.id);
      const signatureFile = files.find((f) => f.kind === "signature");

      // Calculate locked price
      const deliveryType = draft.deliveryType as "standard" | "registered";
      const price = calculatePrice(deliveryType);

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
        metadata: draft.metadata as Record<string, unknown> | null,
      };

      // Create immutable snapshot
      const snapshot = await createSnapshot(db, draftId, snapshotData);

      // Transition to reviewed (validates current state allows this)
      await transitionDraftStatus(db, draftId, session.id, "reviewed");

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
          priceCents: price.totalCents,
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

      // Fetch sender profile if set
      let sender = null;
      if (draft.senderProfileId) {
        const [s] = await db
          .select()
          .from(schema.senderProfiles)
          .where(eq(schema.senderProfiles.id, draft.senderProfileId))
          .limit(1);
        if (s) sender = s;
      }

      // Fetch recipient profile if set
      let recipient = null;
      if (draft.recipientProfileId) {
        const [r] = await db
          .select()
          .from(schema.recipientProfiles)
          .where(eq(schema.recipientProfiles.id, draft.recipientProfileId))
          .limit(1);
        if (r) recipient = r;
      }

      // Fetch latest snapshot ID
      const [latestSnapshot] = await db
        .select({ id: schema.draftSnapshots.id })
        .from(schema.draftSnapshots)
        .where(eq(schema.draftSnapshots.draftId, draftId))
        .orderBy(desc(schema.draftSnapshots.createdAt))
        .limit(1);

      // Count attachments
      const [attachmentCountResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.fileAssets)
        .where(
          and(
            eq(schema.fileAssets.draftId, draftId),
            eq(schema.fileAssets.kind, "attachment"),
            eq(schema.fileAssets.status, "active"),
          ),
        );

      // Calculate price if delivery type is known
      const deliveryType = draft.deliveryType as "standard" | "registered";
      const price = calculatePrice(deliveryType);

      reply.send({
        preview: {
          draftId: draft.id,
          snapshotId: latestSnapshot?.id ?? null,
          locale: draft.locale,
          deliveryType: draft.deliveryType,
          subject: draft.subject,
          body: draft.body,
          enclosureNote: draft.enclosureNote,
          sender,
          recipient,
          signatureMode: draft.signatureMode,
          signatureFileId: draft.signatureAssetId ?? null,
          attachmentCount: attachmentCountResult?.count ?? 0,
          priceCents: price.totalCents,
          updatedAt: draft.updatedAt.toISOString(),
        },
      });
    },
  );

}
