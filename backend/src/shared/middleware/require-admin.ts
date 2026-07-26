import type { FastifyRequest, FastifyReply } from "fastify";
import { env } from "../config/index.js";
import { AppError } from "../errors/index.js";
import {
  ADMIN_SESSION_COOKIE_NAME,
  type AdminSessionClaims,
  verifyAdminSessionToken,
} from "../../modules/admin/admin-auth.js";
import { isAllowedAdmin } from "../../modules/admin/admin-authorization.js";

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

    // Re-check the identity allowlist on every request so removing an admin
    // takes effect immediately, not after the cookie TTL. When no allowlist is
    // configured (dev/test), the login boundary already governs; production env
    // validation makes the allowlist mandatory there.
    const allowedOids = (config.ADMIN_MICROSOFT_ALLOWED_OIDS ?? "").trim();
    const allowedEmails = (config.ADMIN_MICROSOFT_ALLOWED_EMAILS ?? "").trim();
    if (
      session &&
      (allowedOids || allowedEmails) &&
      !isAllowedAdmin(
        { oid: session.oid, email: session.email },
        {
          ADMIN_MICROSOFT_ALLOWED_OIDS: allowedOids,
          ADMIN_MICROSOFT_ALLOWED_EMAILS: allowedEmails,
        },
      )
    ) {
      throw new AppError({
        family: "validation_error",
        statusCode: 403,
        code: "ADMIN_NOT_AUTHORIZED",
        message: "Admin identity is not on the allowlist",
        userMessage: "You are not authorized for admin access.",
        userAction: null,
      });
    }

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

export function getRequiredAdmin(
  request: FastifyRequest,
): Omit<AdminSessionClaims, "exp"> {
  if (!request.admin) {
    throw new AppError({
      family: "validation_error",
      statusCode: 401,
      code: "ADMIN_AUTH_REQUIRED",
      message: "Admin session missing after admin middleware",
      userMessage: "Authentication required.",
      userAction: null,
    });
  }

  return request.admin;
}
