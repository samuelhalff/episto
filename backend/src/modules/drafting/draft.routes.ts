import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getDb } from "../../db/index.js";
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
  listSenderProfiles,
  createRecipientProfile,
  listRecipientProfiles,
} from "./profile.service.js";
import { notFoundError } from "../../shared/errors/index.js";
import {
  UpdateDraftInput,
  CreateSenderProfileInput,
  CreateRecipientProfileInput,
} from "@swiss-mail/shared";

export async function draftRoutes(app: FastifyInstance): Promise<void> {
  // All draft routes require an active session
  app.addHook("preHandler", requireSession);

  // POST /drafts — create a new draft
  app.post("/drafts", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = request.session!;
    const db = getDb();

    const draft = await createDraft(db, session.id, session.locale);
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

      reply.send({ draft });
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
        Body: { status: string };
      }>,
      reply: FastifyReply,
    ) => {
      const session = request.session!;
      const db = getDb();
      const { draftId } = request.params;
      const { status } = request.body as { status: string };

      const draft = await transitionDraftStatus(db, draftId, session.id, status);
      reply.send({ draft });
    },
  );

  // ---- Sender Profiles ----

  // POST /drafts/:draftId/sender — create sender profile
  app.post(
    "/sender-profiles",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = request.session!;
      const db = getDb();

      const body = CreateSenderProfileInput.parse(request.body);
      const profile = await createSenderProfile(db, session.id, body);

      reply.status(201).send({ profile });
    },
  );

  // GET /sender-profiles — list sender profiles for session
  app.get(
    "/sender-profiles",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = request.session!;
      const db = getDb();

      const profiles = await listSenderProfiles(db, session.id);
      reply.send({ profiles });
    },
  );

  // ---- Recipient Profiles ----

  // POST /recipient-profiles — create recipient profile
  app.post(
    "/recipient-profiles",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = request.session!;
      const db = getDb();

      const body = CreateRecipientProfileInput.parse(request.body);
      const profile = await createRecipientProfile(db, session.id, body);

      reply.status(201).send({ profile });
    },
  );

  // GET /recipient-profiles — list recipient profiles for session
  app.get(
    "/recipient-profiles",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = request.session!;
      const db = getDb();

      const profiles = await listRecipientProfiles(db, session.id);
      reply.send({ profiles });
    },
  );

  // ---- Review / Preview ----

  // POST /drafts/:draftId/review — create immutable snapshot and advance to reviewed
  app.post(
    "/drafts/:draftId/review",
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

      // Transition to reviewed (validates current state allows this)
      const updated = await transitionDraftStatus(
        db,
        draftId,
        session.id,
        "reviewed",
      );

      reply.send({ draft: updated });
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

      // Return the full draft content needed for preview rendering
      reply.send({
        preview: {
          id: draft.id,
          status: draft.status,
          locale: draft.locale,
          deliveryType: draft.deliveryType,
          subject: draft.subject,
          body: draft.body,
          tone: draft.tone,
          intent: draft.intent,
          enclosureNote: draft.enclosureNote,
          signatureMode: draft.signatureMode,
          senderProfileId: draft.senderProfileId,
          recipientProfileId: draft.recipientProfileId,
          signatureAssetId: draft.signatureAssetId,
          estimatedPages: draft.estimatedPages,
        },
      });
    },
  );
}
