import type { FastifyRequest, FastifyReply } from "fastify";
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

export async function requireAdmin(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const config = env();
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

  throw new AppError({
    family: "validation_error",
    statusCode: 401,
    code: "ADMIN_AUTH_REQUIRED",
    message: "Admin session required",
    userMessage: "Authentication required.",
    userAction: null,
  });
}
