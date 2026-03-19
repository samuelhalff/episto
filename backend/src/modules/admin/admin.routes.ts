import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, desc, or, ilike, sql } from "drizzle-orm";
import { getDb, schema } from "../../db/index.js";
import { env } from "../../shared/config/index.js";
import { AppError } from "../../shared/errors/index.js";
import {
  recordSupportEvent,
  listSupportEventsForDraft,
  listSupportEventsForSession,
} from "./index.js";

// ---------------------------------------------------------------------------
// HTTP Basic Auth middleware (MVP: per docs/locked decision)
// ---------------------------------------------------------------------------

async function requireAdmin(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith("Basic ")) {
    throw new AppError({
      family: "validation_error",
      statusCode: 401,
      code: "ADMIN_AUTH_REQUIRED",
      message: "Missing or invalid Authorization header",
      userMessage: "Authentication required.",
      userAction: null,
    });
  }

  const decoded = Buffer.from(auth.slice(6), "base64").toString("utf-8");
  const colon = decoded.indexOf(":");
  if (colon === -1) {
    throw new AppError({
      family: "validation_error",
      statusCode: 401,
      code: "ADMIN_AUTH_REQUIRED",
      message: "Invalid Basic auth format",
      userMessage: "Authentication required.",
      userAction: null,
    });
  }

  const username = decoded.slice(0, colon);
  const password = decoded.slice(colon + 1);
  const config = env();

  if (
    username !== config.ADMIN_USERNAME ||
    password !== config.ADMIN_PASSWORD
  ) {
    throw new AppError({
      family: "validation_error",
      statusCode: 403,
      code: "ADMIN_FORBIDDEN",
      message: "Invalid admin credentials",
      userMessage: "Access denied.",
      userAction: null,
    });
  }

  // Record admin access
  request.log.info({ admin: username }, "Admin access");
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAdmin);

  // GET /admin/drafts/:id/timeline — full event timeline for a draft
  app.get<{ Params: { id: string } }>(
    "/admin/drafts/:id/timeline",
    async (request, reply) => {
      const db = getDb();
      const { id } = request.params;

      const [draft] = await db
        .select()
        .from(schema.draftLetters)
        .where(eq(schema.draftLetters.id, id))
        .limit(1);

      if (!draft) {
        reply.status(404).send({ error: "Draft not found" });
        return;
      }

      const supportEvents = await listSupportEventsForDraft(db, id);

      const dispatchEvents = await db
        .select()
        .from(schema.dispatchStatusEvents)
        .where(eq(schema.dispatchStatusEvents.dispatchAttemptId, id))
        .orderBy(desc(schema.dispatchStatusEvents.createdAt));

      const payments = await db
        .select()
        .from(schema.paymentAttempts)
        .where(eq(schema.paymentAttempts.draftId, id))
        .orderBy(desc(schema.paymentAttempts.createdAt));

      reply.send({
        draft: {
          id: draft.id,
          status: draft.status,
          sessionId: draft.sessionId,
          createdAt: draft.createdAt,
          updatedAt: draft.updatedAt,
        },
        payments,
        dispatchEvents,
        supportEvents,
      });
    },
  );

  // GET /admin/sessions/:id — session details with drafts
  app.get<{ Params: { id: string } }>(
    "/admin/sessions/:id",
    async (request, reply) => {
      const db = getDb();
      const { id } = request.params;

      const [session] = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.id, id))
        .limit(1);

      if (!session) {
        reply.status(404).send({ error: "Session not found" });
        return;
      }

      const drafts = await db
        .select({
          id: schema.draftLetters.id,
          status: schema.draftLetters.status,
          createdAt: schema.draftLetters.createdAt,
        })
        .from(schema.draftLetters)
        .where(eq(schema.draftLetters.sessionId, id))
        .orderBy(desc(schema.draftLetters.createdAt));

      const supportEvents = await listSupportEventsForSession(db, id);

      // Metadata only — no content access without explicit support event
      reply.send({
        session: {
          id: session.id,
          type: session.type,
          locale: session.locale,
          email: session.email,
          ipAddress: session.ipAddress,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
        },
        drafts,
        supportEvents,
      });
    },
  );

  // POST /admin/drafts/:id/view-content — privileged content access (audited)
  app.post<{ Params: { id: string } }>(
    "/admin/drafts/:id/view-content",
    async (request, reply) => {
      const db = getDb();
      const { id } = request.params;
      const body = request.body as { reason?: string } | null;

      if (!body?.reason || typeof body.reason !== "string" || body.reason.length < 5) {
        reply.status(400).send({ error: "A reason is required for content access (min 5 chars)." });
        return;
      }

      const [draft] = await db
        .select()
        .from(schema.draftLetters)
        .where(eq(schema.draftLetters.id, id))
        .limit(1);

      if (!draft) {
        reply.status(404).send({ error: "Draft not found" });
        return;
      }

      // Emit auditable support event per docs requirement
      await recordSupportEvent(db, {
        draftId: id,
        sessionId: draft.sessionId,
        eventType: "content_access",
        actor: env().ADMIN_USERNAME,
        details: { reason: body.reason },
      });

      reply.send({
        draft: {
          id: draft.id,
          status: draft.status,
          senderProfileId: draft.senderProfileId,
          recipientProfileId: draft.recipientProfileId,
          subject: draft.subject,
          body: draft.body,
          createdAt: draft.createdAt,
          updatedAt: draft.updatedAt,
        },
      });
    },
  );

  // GET /admin/search?q=... — search sessions/drafts by email or ID
  app.get<{ Querystring: { q?: string } }>(
    "/admin/search",
    async (request, reply) => {
      const db = getDb();
      const q = (request.query as { q?: string }).q?.trim();

      if (!q || q.length < 3) {
        reply.status(400).send({ error: "Query must be at least 3 characters." });
        return;
      }

      const pattern = `%${q}%`;

      const sessions = await db
        .select({
          id: schema.sessions.id,
          email: schema.sessions.email,
          locale: schema.sessions.locale,
          createdAt: schema.sessions.createdAt,
        })
        .from(schema.sessions)
        .where(
          or(
            ilike(schema.sessions.email, pattern),
            eq(schema.sessions.id, q),
          ),
        )
        .limit(20);

      const drafts = await db
        .select({
          id: schema.draftLetters.id,
          status: schema.draftLetters.status,
          sessionId: schema.draftLetters.sessionId,
          createdAt: schema.draftLetters.createdAt,
        })
        .from(schema.draftLetters)
        .where(eq(schema.draftLetters.id, q))
        .limit(5);

      reply.send({ sessions, drafts });
    },
  );
}
