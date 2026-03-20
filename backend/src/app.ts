import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyCookie from "@fastify/cookie";
import fastifyMultipart from "@fastify/multipart";
import fastifyRateLimit from "@fastify/rate-limit";
import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type pino from "pino";

import { env } from "./shared/config/index.js";
import { AppError } from "./shared/errors/index.js";
import { healthRoutes } from "./routes/health.js";
import { sessionRoutes } from "./modules/sessions/index.js";
import { draftRoutes, streamRoutes } from "./modules/drafting/index.js";
import { paymentRoutes } from "./modules/payments/index.js";
import { dispatchRoutes } from "./modules/dispatch/index.js";
import { messageRoutes } from "./modules/messages/index.js";
import { fileRoutes } from "./modules/files/index.js";
import { adminRoutes } from "./modules/admin/index.js";
import { orderRoutes } from "./modules/orders/index.js";
import { pricingRoutes } from "./modules/pricing/pricing.routes.js";

export async function buildApp(logger: pino.Logger): Promise<FastifyInstance> {
  const config = env();

  const app = Fastify({
    logger: logger as unknown as boolean,
    genReqId: () => randomUUID(),
    requestTimeout: 30_000,
    bodyLimit: 5 * 1024 * 1024, // 5 MB
  });

  // ---- Plugins ----

  // Security headers — values locked in docs/07-operations/security-and-privacy.md §Security headers
  await app.register(fastifyHelmet, {
    // API server — no HTML served, so CSP is omitted.
    contentSecurityPolicy: false,
    // Override Helmet defaults with canonical values from security-and-privacy.md.
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: "deny" },
    xContentTypeOptions: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    // Permissions-Policy is not yet part of Helmet's default set; add it manually.
    // permissionsPolicy is not part of this Helmet version — set via onSend hook below.
  });

  // Permissions-Policy and X-XSS-Protection=0 not set by Helmet — add manually.
  app.addHook("onSend", (_req, reply, _payload, done) => {
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    reply.header("X-XSS-Protection", "0");
    done();
  });

  await app.register(fastifyCors, {
    origin: config.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "X-Requested-With"],
  });

  await app.register(fastifyCookie);

  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5 MB
      files: 1, // One file per request
    },
  });

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

  // ---- CSRF protection ----
  // All mutating requests must include X-Requested-With: XMLHttpRequest
  // to prevent cross-origin form submissions. Webhooks are exempt.

  app.addHook("onRequest", (request, reply, done) => {
    const method = request.method;
    if (
      (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE") &&
      !request.url.includes("/webhooks/")
    ) {
      const xrw = request.headers["x-requested-with"];
      if (xrw !== "XMLHttpRequest") {
        reply.status(403).send({
          error: {
            code: "CSRF_VALIDATION_FAILED",
            family: "policy_refusal",
            message: "Missing or invalid X-Requested-With header",
            userMessage: "This request was blocked for security reasons.",
            userAction: null,
          },
        });
        return;
      }
    }
    done();
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

  // ---- Request/Response logging ----

  app.addHook("onResponse", (request, reply, done) => {
    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        durationMs: Math.round(reply.elapsedTime),
      },
      "request completed",
    );
    done();
  });

  // ---- Routes ----

  await app.register(healthRoutes, { prefix: "/api" });
  await app.register(sessionRoutes, { prefix: "/api/v1" });
  await app.register(draftRoutes, { prefix: "/api/v1" });
  await app.register(streamRoutes, { prefix: "/api/v1" });
  await app.register(paymentRoutes, { prefix: "/api/v1" });
  await app.register(fileRoutes, { prefix: "/api/v1" });
  await app.register(dispatchRoutes, { prefix: "/api/v1" });
  await app.register(orderRoutes, { prefix: "/api/v1" });
  await app.register(messageRoutes, { prefix: "/api/v1" });
  await app.register(adminRoutes, { prefix: "/api/v1" });
  await app.register(pricingRoutes, { prefix: "/api/v1" });

  return app;
}
