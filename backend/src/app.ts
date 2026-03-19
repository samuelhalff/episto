import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyCookie from "@fastify/cookie";
import fastifyRateLimit from "@fastify/rate-limit";
import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type pino from "pino";

import { env } from "./shared/config/index.js";
import { AppError } from "./shared/errors/index.js";
import { healthRoutes } from "./routes/health.js";
import { sessionRoutes } from "./modules/sessions/index.js";
import { draftRoutes } from "./modules/drafting/index.js";
import { paymentRoutes } from "./modules/payments/index.js";
import { dispatchRoutes } from "./modules/dispatch/index.js";
import { messageRoutes } from "./modules/messages/index.js";
import { fileRoutes } from "./modules/files/index.js";
import { adminRoutes } from "./modules/admin/index.js";
import { orderRoutes } from "./modules/orders/index.js";

export async function buildApp(logger: pino.Logger): Promise<FastifyInstance> {
  const config = env();

  const app = Fastify({
    logger: logger as unknown as boolean,
    genReqId: () => randomUUID(),
    requestTimeout: 30_000,
    bodyLimit: 5 * 1024 * 1024, // 5 MB
  });

  // ---- Plugins ----

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false, // API server, not serving HTML
  });

  await app.register(fastifyCors, {
    origin: config.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  });

  await app.register(fastifyCookie);

  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: "1 minute",
    keyGenerator: (req: FastifyRequest) => {
      const forwarded = req.headers["x-forwarded-for"]
        ?.toString()
        .split(",")[0]
        ?.trim();
      return forwarded && forwarded.length > 0 ? forwarded : req.ip;
    },
  });

  // ---- Error handler ----

  app.setErrorHandler(
    (error: Error & { statusCode?: number; validation?: unknown }, req: FastifyRequest, reply: FastifyReply) => {
      const requestId = req.id as string;

      // Zod / Fastify validation errors
      if ("validation" in error && error.validation) {
        reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            family: "validation_error",
            message: error.message,
            userMessage: "The request contains invalid data.",
            userAction: "Please correct the input and try again.",
            requestId,
          },
        });
        return;
      }

      // Application errors
      if (error instanceof AppError) {
        req.log.warn(
          { err: error, family: error.family, code: error.code },
          error.message,
        );
        reply.status(error.statusCode).send(error.toResponse(requestId));
        return;
      }

      // Unexpected errors
      req.log.error({ err: error }, "Unhandled error");
      reply.status(500).send({
        error: {
          code: "INTERNAL_ERROR",
          family: "rendering_failure" as const,
          message:
            config.NODE_ENV === "development"
              ? error.message
              : "Internal server error",
          userMessage: "Something went wrong. Please try again.",
          userAction: "If the problem persists, contact support.",
          requestId,
        },
      });
    },
  );

  // ---- Routes ----

  await app.register(healthRoutes, { prefix: "/api" });
  await app.register(sessionRoutes, { prefix: "/api/v1" });
  await app.register(draftRoutes, { prefix: "/api/v1" });
  await app.register(paymentRoutes, { prefix: "/api/v1" });
  await app.register(fileRoutes, { prefix: "/api/v1" });
  await app.register(dispatchRoutes, { prefix: "/api/v1" });
  await app.register(orderRoutes, { prefix: "/api/v1" });
  await app.register(messageRoutes, { prefix: "/api/v1" });
  await app.register(adminRoutes, { prefix: "/api/v1" });

  return app;
}
