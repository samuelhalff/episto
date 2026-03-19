import { eq, sql } from "drizzle-orm";
import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";

/**
 * Admin module — support events and audit trail.
 *
 * Admin auth MVP: HTTP Basic Auth over TLS (locked decision).
 * Support posture: metadata-first. Privileged content access
 * must emit a support_event.
 */

// ---------------------------------------------------------------------------
// Support event recording
// ---------------------------------------------------------------------------

export interface SupportEventInput {
  sessionId?: string | null | undefined;
  draftId?: string | null | undefined;
  eventType: string;
  actor: string;
  details?: unknown;
}

export async function recordSupportEvent(
  db: Db,
  input: SupportEventInput,
): Promise<{ id: string }> {
  const [row] = await db
    .insert(schema.supportEvents)
    .values({
      sessionId: input.sessionId ?? null,
      draftId: input.draftId ?? null,
      eventType: input.eventType,
      actor: input.actor,
      details: input.details ?? null,
    })
    .returning({ id: schema.supportEvents.id });

  if (!row) throw new Error("Failed to record support event");
  return { id: row.id };
}

// ---------------------------------------------------------------------------
// Support event queries
// ---------------------------------------------------------------------------

export async function listSupportEventsForSession(
  db: Db,
  sessionId: string,
): Promise<Array<typeof schema.supportEvents.$inferSelect>> {
  return db
    .select()
    .from(schema.supportEvents)
    .where(eq(schema.supportEvents.sessionId, sessionId))
    .orderBy(sql`${schema.supportEvents.createdAt} DESC`);
}

export async function listSupportEventsForDraft(
  db: Db,
  draftId: string,
): Promise<Array<typeof schema.supportEvents.$inferSelect>> {
  return db
    .select()
    .from(schema.supportEvents)
    .where(eq(schema.supportEvents.draftId, draftId))
    .orderBy(sql`${schema.supportEvents.createdAt} DESC`);
}

export { adminRoutes } from "./admin.routes.js";
