import type { FastifyRequest, FastifyReply } from "fastify";
import { getSessionByResumeToken } from "./session.service.js";
import { getDb } from "../../db/index.js";
import { AppError } from "../../shared/errors/index.js";
import type { SessionRow } from "./session.service.js";

/**
 * __Host- prefix requires Secure flag, which browsers reject over plain HTTP.
 * Use a plain name during local development.
 */
function resolveCookieName(): string {
  // Avoid importing env() at module level — it may not be loaded yet.
  // Instead, check the env var directly (always available).
  return process.env["NODE_ENV"] === "production"
    ? "__Host-session"
    : "session";
}

const COOKIE_NAME = resolveCookieName();

declare module "fastify" {
  interface FastifyRequest {
    session?: SessionRow;
  }
}

/**
 * Session middleware — extracts and validates the session cookie.
 * Attaches `request.session` if valid.
 * Sends 401 if no valid session found.
 */
export async function requireSession(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const token = request.cookies[COOKIE_NAME];

  if (!token) {
    throw new AppError({
      family: "validation_error",
      statusCode: 401,
      code: "SESSION_REQUIRED",
      message: "No session cookie present",
      userMessage: "Your session has expired or is missing.",
      userAction: "Please start a new letter.",
    });
  }

  const db = getDb();
  const session = await getSessionByResumeToken(db, token);

  if (!session) {
    throw new AppError({
      family: "validation_error",
      statusCode: 401,
      code: "SESSION_REQUIRED",
      message: "Session not found or expired",
      userMessage: "Your session has expired.",
      userAction: "Please start a new letter or use your resume link.",
    });
  }

  request.session = session;
}

export { COOKIE_NAME };
