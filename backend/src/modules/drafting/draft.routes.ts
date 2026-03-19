import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, and } from "drizzle-orm";
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
import { notFoundError } from "../../shared/errors/index.js";
import {
  UpdateDraftInput,
  CreateSenderProfileInput,
  CreateRecipientProfileInput,
  DraftStatus,
} from "@swiss-mail/shared";

import { z } from "zod";

const TransitionBody = z.object({
  status: z.enum([
    DraftStatus.collecting,
    DraftStatus.fields_complete,
    DraftStatus.reviewed,
    DraftStatus.rendering,
    DraftStatus.ready,
    DraftStatus.submitted,
    DraftStatus.dispatched,
    DraftStatus.closed,
  ]),
});

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

  // ---- SSE Stream ----

  // GET /drafts/:draftId/stream — SSE event stream for real-time updates
  app.get<{ Params: { draftId: string } }>(
    "/drafts/:draftId/stream",
    async (request, reply) => {
      const session = request.session!;
      const db = getDb();
      const { draftId } = request.params;

      const draft = await getDraftById(db, draftId, session.id);
      if (!draft) throw notFoundError("draft");

      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });

      reply.raw.write(
        `event: connected\ndata: ${JSON.stringify({ draftId })}\n\n`,
      );

      const keepalive = setInterval(() => {
        reply.raw.write(": keepalive\n\n");
      }, 30_000);

      request.raw.on("close", () => {
        clearInterval(keepalive);
      });

      // NOTE: AI token streaming, field updates, and status events will be
      // published to this stream via Redis pub/sub when the queue worker
      // and AI integration are wired. This is the connection shell.
    },
  );
}
