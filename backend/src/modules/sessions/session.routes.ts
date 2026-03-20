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
import { CreateSessionInput, LocaleSchema } from "@swiss-mail/shared";
import { eq, sql } from "drizzle-orm";
import { schema } from "../../db/index.js";
import { recordEvent } from "../analytics/index.js";

function setSessionCookie(
  reply: FastifyReply,
  token: string,
  maxAgeSeconds: number,
): void {
  reply.setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/v1/sessions — create new guest session
  app.post(
    "/sessions",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 hour",
          keyGenerator: (req: FastifyRequest) =>
            req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ??
            req.ip,
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

      recordEvent({ event: "session_created", sessionId: session.id, locale: session.locale });

      setSessionCookie(reply, resumeToken, config.SESSION_TTL_HOURS * 3600);

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
      const body = request.body as Record<string, unknown> | null;

      const updates: { locale?: string; email?: string } = {};

      if (body?.locale !== undefined) {
        const parsed = LocaleSchema.safeParse(body.locale);
        if (!parsed.success) {
          throw validationError("Invalid locale", [
            { field: "locale", message: "Must be one of: de-CH, fr-CH, it-CH, en-CH" },
          ]);
        }
        updates.locale = parsed.data;
      }

      if (body?.email !== undefined) {
        const emailResult = z.string().email().max(254).safeParse(body.email);
        if (!emailResult.success) {
          throw validationError("Invalid email", [
            { field: "email", message: "Must be a valid email address" },
          ]);
        }
        updates.email = emailResult.data;
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
          keyGenerator: (req: FastifyRequest) =>
            req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ??
            req.ip,
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

      recordEvent({ event: "resume_link_opened", sessionId: session.id, result: "success" });

      setSessionCookie(reply, token, config.SESSION_TTL_HOURS * 3600);

      // Find the most recent draft for this session to determine redirect
      const [latestDraft] = await db
        .select({ id: schema.draftLetters.id, status: schema.draftLetters.status })
        .from(schema.draftLetters)
        .where(eq(schema.draftLetters.sessionId, session.id))
        .orderBy(sql`${schema.draftLetters.createdAt} DESC`)
        .limit(1);

      let redirectUrl = "/";
      if (latestDraft) {
        redirectUrl = `/draft/${latestDraft.id}`;
      }

      reply.send({
        redirectUrl,
        sessionId: session.id,
      });
    },
  );
}
