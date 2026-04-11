import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyCookie from "@fastify/cookie";
import fastifyMultipart from "@fastify/multipart";
import fastifyRateLimit from "@fastify/rate-limit";
import { randomUUID } from "node:crypto";
import type { FastifyRequest, FastifyReply } from "fastify";
import type pino from "pino";
import { ZodError } from "zod";

import { env } from "./shared/config/index.js";
import { AppError } from "./shared/errors/index.js";
import { healthRoutes } from "./routes/health.js";
import { sessionRoutes } from "./modules/sessions/index.js";
import {
  addressSearchRoutes,
  dictationRoutes,
  draftRoutes,
  streamRoutes,
} from "./modules/drafting/index.js";
import { paymentRoutes } from "./modules/payments/index.js";
import { dispatchRoutes } from "./modules/dispatch/index.js";
import { messageRoutes } from "./modules/messages/index.js";
import { fileRoutes } from "./modules/files/index.js";
import { adminAuthRoutes, adminRoutes } from "./modules/admin/index.js";
import { orderRoutes } from "./modules/orders/index.js";
import { pricingRoutes } from "./modules/pricing/pricing.routes.js";

const PERMISSIONS_POLICY = "camera=(), microphone=(self), geolocation=()";

export async function buildApp(logger: pino.Logger) {
  const config = env();

  const app = Fastify({
    loggerInstance: logger,
    genReqId: () => randomUUID(),
    requestTimeout: 30_000,
    bodyLimit: 5 * 1024 * 1024, // 5 MB
    trustProxy: config.TRUST_PROXY,
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
    reply.header("Permissions-Policy", PERMISSIONS_POLICY);
    reply.header("X-XSS-Protection", "0");
    done();
  });

  const corsOrigins = config.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean);
  await app.register(fastifyCors, {
    origin: corsOrigins.length === 1 ? (corsOrigins[0] ?? config.CORS_ORIGIN) : corsOrigins,
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
    keyGenerator: (req: FastifyRequest) => req.ip,
  });

  // ---- CSRF protection ----
  // All mutating requests must include X-Requested-With: XMLHttpRequest
  // to prevent cross-origin form submissions. Webhooks are exempt.

  app.addHook("onRequest", (request, reply, done) => {
    const method = request.method;
    if (
      (method === "POST" ||
        method === "PUT" ||
        method === "PATCH" ||
        method === "DELETE") &&
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
    (
      error: Error & { statusCode?: number; validation?: unknown },
      req: FastifyRequest,
      reply: FastifyReply,
    ) => {
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

      if (error instanceof ZodError) {
        const fields = error.issues.map((issue) => ({
          field: issue.path.length > 0 ? issue.path.join(".") : "body",
          message: issue.message,
        }));
        const message = fields[0]?.message ?? "The request contains invalid data.";

        reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            family: "validation_error",
            message,
            userMessage: "The request contains invalid data.",
            userAction: "Please correct the input and try again.",
            requestId,
            fields,
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

      if (typeof error.statusCode === "number" && error.statusCode >= 400) {
        const isRateLimited = error.statusCode === 429;

        reply.status(error.statusCode).send({
          error: {
            code: isRateLimited ? "RATE_LIMITED" : "REQUEST_ERROR",
            family: isRateLimited ? "policy_refusal" : "validation_error",
            message: error.message,
            userMessage: isRateLimited
              ? "Too many attempts were made. Please wait a moment and try again."
              : "The request could not be processed.",
            userAction: isRateLimited
              ? "Wait briefly, then retry."
              : "Review the request and try again.",
            requestId,
          },
        });
        return;
      }

      // Unexpected errors
      req.log.error({ err: error }, "Unhandled error");
      reply.status(500).send({
        error: {
          code: "INTERNAL_ERROR",
          family: "rendering_failure" as const,
          message:
            config.NODE_ENV === "development" ? error.message : "Internal server error",
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
  await app.register(addressSearchRoutes, { prefix: "/api/v1" });
  await app.register(streamRoutes, { prefix: "/api/v1" });
  await app.register(dictationRoutes, { prefix: "/api/v1" });
  await app.register(paymentRoutes, { prefix: "/api/v1" });
  await app.register(fileRoutes, { prefix: "/api/v1" });
  await app.register(dispatchRoutes, { prefix: "/api/v1" });
  await app.register(orderRoutes, { prefix: "/api/v1" });
  await app.register(messageRoutes, { prefix: "/api/v1" });
  await app.register(adminAuthRoutes, { prefix: "/api/v1" });
  await app.register(adminRoutes, { prefix: "/api/v1" });
  await app.register(pricingRoutes, { prefix: "/api/v1" });

  return app;
}
