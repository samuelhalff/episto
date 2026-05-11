import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { recordEvent } from "../analytics/index.js";
import { getOptionalSession } from "../sessions/session.middleware.js";

const STEP_EVENT_NAMES = [
  "step_entered",
  "step_completed",
  "step_idle",
  "step_abandoned",
  "step_error",
] as const;

const ClientEventInput = z.object({
  event: z.enum(STEP_EVENT_NAMES),
  step: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/i, "step must be a short identifier"),
  draftId: z.string().uuid().optional().nullable(),
  durationMs: z.number().int().nonnegative().optional(),
  errorFamily: z.string().min(1).max(64).optional(),
  locale: z.string().min(2).max(8).optional(),
});

export async function telemetryRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/v1/events — client step instrumentation
  app.post(
    "/events",
    {
      config: {
        rateLimit: {
          max: 600,
          timeWindow: "1 minute",
          keyGenerator: (req: FastifyRequest) => req.ip,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const input = ClientEventInput.parse(request.body ?? {});
      const session = await getOptionalSession(request);
      const sessionId = session?.id;

      const optionalIds: {
        draftId?: string;
        sessionId?: string;
        locale?: string;
      } = {};
      if (input.draftId) optionalIds.draftId = input.draftId;
      if (sessionId) optionalIds.sessionId = sessionId;
      if (input.locale) optionalIds.locale = input.locale;

      switch (input.event) {
        case "step_entered":
          recordEvent({
            event: "step_entered",
            step: input.step,
            ...optionalIds,
          });
          break;
        case "step_completed":
          recordEvent({
            event: "step_completed",
            step: input.step,
            durationMs: input.durationMs ?? 0,
            ...optionalIds,
          });
          break;
        case "step_idle":
          recordEvent({
            event: "step_idle",
            step: input.step,
            durationMs: input.durationMs ?? 0,
            ...optionalIds,
          });
          break;
        case "step_abandoned":
          recordEvent({
            event: "step_abandoned",
            step: input.step,
            durationMs: input.durationMs ?? 0,
            ...optionalIds,
          });
          break;
        case "step_error":
          recordEvent({
            event: "step_error",
            step: input.step,
            errorFamily: input.errorFamily ?? "unknown",
            ...optionalIds,
          });
          break;
      }
      reply.status(200).send({ ok: true });
    },
  );
}
