import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getDb } from "../../db/index.js";
import { env } from "../../shared/config/index.js";
import {
  createSession,
  getSessionByResumeToken,
  updateSession,
} from "./session.service.js";
import { requireSession, COOKIE_NAME } from "./session.middleware.js";
import { notFoundError, validationError } from "../../shared/errors/index.js";
import { z } from "zod";
import {
  CreateSessionInput,
  LocaleSchema,
  type DraftStatusValue,
} from "@swiss-mail/shared";
import { eq, sql } from "drizzle-orm";
import { schema } from "../../db/index.js";
import { recordEvent } from "../analytics/index.js";

function setSessionCookie(
  reply: FastifyReply,
  request: FastifyRequest,
  token: string,
  maxAgeSeconds: number,
): void {
  const isSecure =
    env().NODE_ENV === "production" || request.headers["x-forwarded-proto"] === "https";
  reply.setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

function getResumeRedirectUrl(draftId: string, status: DraftStatusValue): string {
  switch (status) {
    case "reviewed":
    case "rendering":
    case "ready":
      return `/draft/${draftId}/review`;
    case "submitted":
    case "dispatched":
    case "closed":
      return `/draft/${draftId}/confirmation`;
    case "collecting":
    case "fields_complete":
    default:
      return `/draft/${draftId}`;
  }
}

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/v1/sessions — create new guest session
  app.post(
    "/sessions",
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 hour",
          keyGenerator: (req: FastifyRequest) => req.ip,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = CreateSessionInput.parse(request.body ?? {});
      const db = getDb();
      const config = env();

      const { session, resumeToken } = await createSession(db, {
        locale: body.locale,
        ipAddress: request.ip,
      });

      recordEvent({
        event: "session_created",
        sessionId: session.id,
        locale: session.locale,
      });

      setSessionCookie(reply, request, resumeToken, config.SESSION_TTL_HOURS * 3600);

      reply.status(200).send({
        session: {
          id: session.id,
          type: session.type,
          locale: session.locale,
          email: session.email,
          createdAt: session.createdAt.toISOString(),
          expiresAt: session.expiresAt.toISOString(),
        },
      });
    },
  );

  // GET /api/v1/sessions/current — get current session
  app.get(
    "/sessions/current",
    { preHandler: [requireSession] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = request.session!;
      const db = getDb();

      // Count drafts for this session
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.draftLetters)
        .where(eq(schema.draftLetters.sessionId, session.id));

      reply.send({
        session: {
          id: session.id,
          type: session.type,
          locale: session.locale,
          email: session.email,
          createdAt: session.createdAt.toISOString(),
          expiresAt: session.expiresAt.toISOString(),
          draftCount: result?.count ?? 0,
        },
      });
    },
  );

  // PATCH /api/v1/sessions/current — update session
  app.patch(
    "/sessions/current",
    { preHandler: [requireSession] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = request.session!;
      const db = getDb();
      const UpdateSessionBody = z
        .object({
          locale: LocaleSchema.optional(),
          email: z.string().email().max(254).optional(),
        })
        .strict();
      const parsed = UpdateSessionBody.safeParse(request.body ?? {});

      if (!parsed.success) {
        throw validationError(
          "Invalid session update",
          parsed.error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        );
      }

      const updates: { locale?: string; email?: string } = {};

      if (parsed.data.locale !== undefined) {
        updates.locale = parsed.data.locale;
      }

      if (parsed.data.email !== undefined) {
        updates.email = parsed.data.email;
      }

      const updated = await updateSession(db, session.id, updates);

      reply.send({
        session: {
          id: updated.id,
          type: updated.type,
          locale: updated.locale,
          email: updated.email,
          updatedAt: updated.updatedAt.toISOString(),
        },
      });
    },
  );

  // GET /api/v1/resume/:token — validate resume token
  app.get(
    "/resume/:token",
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 hour",
          keyGenerator: (req: FastifyRequest) => req.ip,
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { token: string } }>,
      reply: FastifyReply,
    ) => {
      const { token } = request.params;
      const db = getDb();
      const config = env();

      if (!token || token.length < 32) {
        throw notFoundError("resume token");
      }

      const session = await getSessionByResumeToken(db, token);
      if (!session) {
        throw notFoundError("resume token");
      }

      recordEvent({
        event: "resume_link_opened",
        sessionId: session.id,
        result: "success",
      });

      setSessionCookie(reply, request, token, config.SESSION_TTL_HOURS * 3600);

      // Find the most recent draft for this session to determine redirect
      const [latestDraft] = await db
        .select({ id: schema.draftLetters.id, status: schema.draftLetters.status })
        .from(schema.draftLetters)
        .where(eq(schema.draftLetters.sessionId, session.id))
        .orderBy(
          sql`${schema.draftLetters.updatedAt} DESC`,
          sql`${schema.draftLetters.createdAt} DESC`,
        )
        .limit(1);

      let redirectUrl = "/";
      if (latestDraft) {
        redirectUrl = getResumeRedirectUrl(latestDraft.id, latestDraft.status);
      }

      reply.send({
        redirectUrl,
        sessionId: session.id,
      });
    },
  );
}
