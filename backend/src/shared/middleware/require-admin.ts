import type { FastifyRequest, FastifyReply } from "fastify";
import { timingSafeEqual } from "node:crypto";
import { env } from "../config/index.js";
import { AppError } from "../errors/index.js";

/**
 * Fastify preHandler that validates HTTP Basic Auth credentials
 * against ADMIN_USERNAME / ADMIN_PASSWORD using constant-time comparison.
 */
export async function requireAdmin(
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

  // Constant-time comparison to prevent timing attacks
  const expectedUser = Buffer.from(config.ADMIN_USERNAME);
  const expectedPass = Buffer.from(config.ADMIN_PASSWORD);
  const givenUser = Buffer.from(username);
  const givenPass = Buffer.from(password);

  const userMatch =
    expectedUser.length === givenUser.length &&
    timingSafeEqual(expectedUser, givenUser);
  const passMatch =
    expectedPass.length === givenPass.length &&
    timingSafeEqual(expectedPass, givenPass);

  if (!userMatch || !passMatch) {
    throw new AppError({
      family: "validation_error",
      statusCode: 403,
      code: "ADMIN_FORBIDDEN",
      message: "Invalid admin credentials",
      userMessage: "Access denied.",
      userAction: null,
    });
  }

  request.log.info({ admin: username }, "Admin access");
}
