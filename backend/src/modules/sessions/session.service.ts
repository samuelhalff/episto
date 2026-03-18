import { randomBytes, createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { env } from "../../shared/config/index.js";
import { notFoundError } from "../../shared/errors/index.js";

export interface SessionRow {
  id: string;
  type: string;
  email: string | null;
  locale: string;
  resumeTokenExpiresAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generate a cryptographically random resume token (256-bit, base64url-encoded).
 */
export function generateResumeToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Hash a resume token with SHA-256 for storage.
 */
export function hashResumeToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Create a new guest session.
 * Returns the raw resume token (to set as cookie) and the created session row.
 */
export async function createSession(
  db: Db,
  opts: { locale?: string | undefined; ipAddress?: string | undefined },
): Promise<{ session: SessionRow; resumeToken: string }> {
  const config = env();
  const resumeToken = generateResumeToken();
  const resumeTokenHash = hashResumeToken(resumeToken);

  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + config.SESSION_TTL_HOURS * 60 * 60 * 1000,
  );
  const resumeTokenExpiresAt = new Date(expiresAt.getTime());

  const [row] = await db
    .insert(schema.sessions)
    .values({
      type: "guest",
      locale: (opts.locale as "de-CH" | "fr-CH" | "it-CH" | "en-CH") ?? "de-CH",
      resumeTokenHash,
      resumeTokenExpiresAt,
      expiresAt,
      ipAddress: opts.ipAddress ?? null,
    })
    .returning();

  if (!row) throw new Error("Failed to create session");

  return {
    session: {
      id: row.id,
      type: row.type,
      email: row.email,
      locale: row.locale,
      resumeTokenExpiresAt: row.resumeTokenExpiresAt,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    resumeToken,
  };
}

/**
 * Look up a session by hashing the provided resume token.
 * Returns null if not found or expired.
 */
export async function getSessionByResumeToken(
  db: Db,
  token: string,
): Promise<SessionRow | null> {
  const hash = hashResumeToken(token);
  const now = new Date();

  const [row] = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.resumeTokenHash, hash))
    .limit(1);

  if (!row) return null;
  if (row.resumeTokenExpiresAt < now || row.expiresAt < now) return null;

  return {
    id: row.id,
    type: row.type,
    email: row.email,
    locale: row.locale,
    resumeTokenExpiresAt: row.resumeTokenExpiresAt,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Get a session by ID. Returns null if not found or expired.
 */
export async function getSessionById(
  db: Db,
  sessionId: string,
): Promise<SessionRow | null> {
  const now = new Date();

  const [row] = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, sessionId))
    .limit(1);

  if (!row) return null;
  if (row.expiresAt < now) return null;

  return {
    id: row.id,
    type: row.type,
    email: row.email,
    locale: row.locale,
    resumeTokenExpiresAt: row.resumeTokenExpiresAt,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Update mutable session fields (locale, email).
 */
export async function updateSession(
  db: Db,
  sessionId: string,
  updates: { locale?: string; email?: string },
): Promise<SessionRow> {
  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (updates.locale !== undefined) values.locale = updates.locale;
  if (updates.email !== undefined) values.email = updates.email;

  const [row] = await db
    .update(schema.sessions)
    .set(values)
    .where(eq(schema.sessions.id, sessionId))
    .returning();

  if (!row) throw notFoundError("session");

  return {
    id: row.id,
    type: row.type,
    email: row.email,
    locale: row.locale,
    resumeTokenExpiresAt: row.resumeTokenExpiresAt,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
