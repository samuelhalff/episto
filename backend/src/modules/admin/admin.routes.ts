import type { FastifyInstance } from "fastify";
import { eq, desc } from "drizzle-orm";
import { getDb, schema } from "../../db/index.js";
import { env } from "../../shared/config/index.js";
import { requireAdmin } from "../../shared/middleware/require-admin.js";
import {
  recordSupportEvent,
  listSupportEventsForDraft,
  listSupportEventsForSession,
} from "./index.js";
import { adminActionRoutes } from "./admin-actions.routes.js";
import { adminHealthRoutes } from "./admin-health.routes.js";
import { adminOverviewRoutes } from "./admin-overview.routes.js";

// ---------------------------------------------------------------------------
// Admin read-only routes (timeline, session details, content access)
// ---------------------------------------------------------------------------

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAdmin);

  // GET /admin/drafts/:id/timeline — full ordered event timeline for a draft
  app.get<{ Params: { id: string } }>(
    "/admin/drafts/:id/timeline",
    async (request, reply) => {
      const db = getDb();
      const { id } = request.params;

      const [draft] = await db
        .select()
        .from(schema.draftLetters)
        .where(eq(schema.draftLetters.id, id))
        .limit(1);

      if (!draft) {
        reply.status(404).send({ error: "Draft not found" });
        return;
      }

      // Collect all event sources into a unified timeline
      interface TimelineEvent {
        id: string;
        eventType: string;
        from: string | null;
        to: string | null;
        actor: "system" | "user" | "admin" | "webhook" | "provider";
        meta: Record<string, unknown> | null;
        occurredAt: string;
      }
      const events: TimelineEvent[] = [];

      // Support events
      const supportEvents = await listSupportEventsForDraft(db, id);
      for (const se of supportEvents) {
        events.push({
          id: se.id,
          eventType: `support_${se.eventType}`,
          from: null,
          to: null,
          actor: "admin",
          meta: (se.details as Record<string, unknown>) ?? null,
          occurredAt: se.createdAt.toISOString(),
        });
      }

      // Dispatch status events
      const dispatchAttempts = await db
        .select()
        .from(schema.dispatchAttempts)
        .where(eq(schema.dispatchAttempts.draftId, id));

      for (const da of dispatchAttempts) {
        const dse = await db
          .select()
          .from(schema.dispatchStatusEvents)
          .where(eq(schema.dispatchStatusEvents.dispatchAttemptId, da.id))
          .orderBy(desc(schema.dispatchStatusEvents.createdAt));

        for (const evt of dse) {
          events.push({
            id: evt.id,
            eventType: "dispatch_state_changed",
            from: evt.previousState,
            to: evt.newState,
            actor: "system",
            meta: { dispatchAttemptId: da.id, providerName: da.providerName },
            occurredAt: evt.createdAt.toISOString(),
          });
        }
      }

      // Payment events (each payment attempt represents a state change)
      const payments = await db
        .select()
        .from(schema.paymentAttempts)
        .where(eq(schema.paymentAttempts.draftId, id))
        .orderBy(desc(schema.paymentAttempts.createdAt));

      for (const p of payments) {
        events.push({
          id: p.id,
          eventType: "payment_state_changed",
          from: null,
          to: p.state,
          actor: "system",
          meta: { amountCents: p.amountCents, stripePaymentIntentId: p.stripePaymentIntentId },
          occurredAt: (p.updatedAt ?? p.createdAt).toISOString(),
        });
      }

      // Sort all events by occurredAt ascending
      events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

      reply.send({
        draftId: id,
        events,
      });
    },
  );

  // GET /admin/sessions/:id — session details with drafts
  app.get<{ Params: { id: string } }>(
    "/admin/sessions/:id",
    async (request, reply) => {
      const db = getDb();
      const { id } = request.params;

      const [session] = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.id, id))
        .limit(1);

      if (!session) {
        reply.status(404).send({ error: "Session not found" });
        return;
      }

      const drafts = await db
        .select({
          id: schema.draftLetters.id,
          status: schema.draftLetters.status,
          createdAt: schema.draftLetters.createdAt,
        })
        .from(schema.draftLetters)
        .where(eq(schema.draftLetters.sessionId, id))
        .orderBy(desc(schema.draftLetters.createdAt));

      const supportEvents = await listSupportEventsForSession(db, id);

      // Metadata only — no content access without explicit support event
      reply.send({
        session: {
          id: session.id,
          type: session.type,
          locale: session.locale,
          email: session.email,
          ipAddress: session.ipAddress,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
        },
        drafts,
        supportEvents,
      });
    },
  );

  // POST /admin/drafts/:id/view-content — privileged content access (audited)
  app.post<{ Params: { id: string } }>(
    "/admin/drafts/:id/view-content",
    async (request, reply) => {
      const db = getDb();
      const { id } = request.params;
      const body = request.body as { reason?: string } | null;

      if (!body?.reason || typeof body.reason !== "string" || body.reason.length < 5) {
        reply.status(400).send({ error: "A reason is required for content access (min 5 chars)." });
        return;
      }

      const [draft] = await db
        .select()
        .from(schema.draftLetters)
        .where(eq(schema.draftLetters.id, id))
        .limit(1);

      if (!draft) {
        reply.status(404).send({ error: "Draft not found" });
        return;
      }

      // Emit auditable support event per docs requirement
      await recordSupportEvent(db, {
        draftId: id,
        sessionId: draft.sessionId,
        eventType: "content_access",
        actor: env().ADMIN_USERNAME,
        details: { reason: body.reason },
      });

      reply.send({
        draft: {
          id: draft.id,
          status: draft.status,
          senderProfileId: draft.senderProfileId,
          recipientProfileId: draft.recipientProfileId,
          subject: draft.subject,
          body: draft.body,
          createdAt: draft.createdAt,
          updatedAt: draft.updatedAt,
        },
      });
    },
  );

  // Register search and action routes (split for file-size compliance)
  await app.register(adminActionRoutes);

  // Register admin health status endpoint (split for file-size compliance)
  await app.register(adminHealthRoutes);

  // Register admin overview/dashboard counters endpoint
  await app.register(adminOverviewRoutes);
}
