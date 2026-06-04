import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { getDb, schema } from "../../db/index.js";
import { notFoundError } from "../../shared/errors/index.js";
import { requireSession, getRequiredSession } from "../sessions/session.middleware.js";
import {
  confirmPhoneVerification,
  getPhoneVerificationStatus,
  startPhoneVerification,
} from "./phone-verification.service.js";

const StartPhoneVerificationBody = z.object({
  phone: z.string().min(6).max(32),
});

const ConfirmPhoneVerificationBody = z.object({
  code: z.string().regex(/^\d{6}$/),
});

async function assertDraftBelongsToSession(
  db: ReturnType<typeof getDb>,
  input: { draftId: string; sessionId: string },
) {
  const [draft] = await db
    .select({ id: schema.draftLetters.id })
    .from(schema.draftLetters)
    .where(
      and(
        eq(schema.draftLetters.id, input.draftId),
        eq(schema.draftLetters.sessionId, input.sessionId),
      ),
    )
    .limit(1);

  if (!draft) {
    throw notFoundError("draft");
  }
}

export async function phoneVerificationRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { draftId: string } }>(
    "/drafts/:draftId/phone-verification",
    { preHandler: [requireSession] },
    async (request) => {
      const session = getRequiredSession(request);
      const db = getDb();
      const { draftId } = request.params;

      await assertDraftBelongsToSession(db, { draftId, sessionId: session.id });

      return getPhoneVerificationStatus(db, { sessionId: session.id });
    },
  );

  app.post<{ Params: { draftId: string } }>(
    "/drafts/:draftId/phone-verification/start",
    {
      preHandler: [requireSession],
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 hour",
          keyGenerator: (req: FastifyRequest) => req.session?.id ?? req.ip,
        },
      },
    },
    async (request) => {
      const session = getRequiredSession(request);
      const db = getDb();
      const { draftId } = request.params;
      const body = StartPhoneVerificationBody.parse(request.body);

      await assertDraftBelongsToSession(db, { draftId, sessionId: session.id });

      return startPhoneVerification(db, {
        sessionId: session.id,
        draftId,
        phone: body.phone,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });
    },
  );

  app.post<{ Params: { draftId: string } }>(
    "/drafts/:draftId/phone-verification/confirm",
    {
      preHandler: [requireSession],
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 hour",
          keyGenerator: (req: FastifyRequest) => req.session?.id ?? req.ip,
        },
      },
    },
    async (request) => {
      const session = getRequiredSession(request);
      const db = getDb();
      const { draftId } = request.params;
      const body = ConfirmPhoneVerificationBody.parse(request.body);

      await assertDraftBelongsToSession(db, { draftId, sessionId: session.id });

      return confirmPhoneVerification(db, {
        sessionId: session.id,
        draftId,
        code: body.code,
      });
    },
  );
}
