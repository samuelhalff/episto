import type { FastifyRequest, FastifyReply } from "fastify";
import { timingSafeEqual } from "node:crypto";
import { env } from "../config/index.js";
import { AppError } from "../errors/index.js";
import {
  ADMIN_SESSION_COOKIE_NAME,
  type AdminSessionClaims,
  verifyAdminSessionToken,
} from "../../modules/admin/admin-auth.js";

declare module "fastify" {
  interface FastifyRequest {
    admin?: Omit<AdminSessionClaims, "exp">;
  }
}

/**
 * Fastify preHandler that validates HTTP Basic Auth credentials
 * against ADMIN_USERNAME / ADMIN_PASSWORD using constant-time comparison.
 */
export async function requireAdmin(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const auth = request.headers.authorization;
  const config = env();

  if (auth?.startsWith("Basic ")) {
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

    request.admin = {
      actor: username,
      authMethod: "basic",
    };
    request.log.info({ admin: username }, "Admin access");
    return;
  }

  const sessionToken = request.cookies[ADMIN_SESSION_COOKIE_NAME];
  if (sessionToken && config.ADMIN_SESSION_SECRET) {
    const session = verifyAdminSessionToken(
      sessionToken,
      config.ADMIN_SESSION_SECRET,
      Date.now(),
    );

    if (session) {
      request.admin = {
        actor: session.actor,
        authMethod: session.authMethod,
        ...(session.email !== undefined && { email: session.email }),
        ...(session.name !== undefined && { name: session.name }),
        ...(session.oid !== undefined && { oid: session.oid }),
        ...(session.tid !== undefined && { tid: session.tid }),
      };
      request.log.info(
        { admin: session.actor, authMethod: session.authMethod },
        "Admin access",
      );
      return;
    }
  }

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
}
