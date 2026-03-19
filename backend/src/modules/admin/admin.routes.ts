import type { FastifyInstance } from "fastify";
import { eq, desc, or, ilike } from "drizzle-orm";
import { getDb, schema } from "../../db/index.js";
import { env } from "../../shared/config/index.js";
import { AppError } from "../../shared/errors/index.js";
import { requireAdmin } from "../../shared/middleware/require-admin.js";
import {
  recordSupportEvent,
  listSupportEventsForDraft,
  listSupportEventsForSession,
} from "./index.js";
import { createRefund } from "../payments/adapters/stripe.adapter.js";
import { transitionPaymentState } from "../payments/payment.service.js";

// ---------------------------------------------------------------------------
// Routes
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

  // GET /admin/search?q=... — search sessions/drafts by email or ID
  app.get<{ Querystring: { q?: string; limit?: string; cursor?: string } }>(
    "/admin/search",
    async (request, reply) => {
      const db = getDb();
      const query = request.query as { q?: string; limit?: string; cursor?: string };
      const q = query.q?.trim();
      const limit = Math.min(Math.max(parseInt(query.limit ?? "20", 10) || 20, 1), 50);

      if (!q || q.length < 1) {
        reply.status(400).send({ error: "Query must be at least 1 character." });
        return;
      }

      interface SearchResultItem {
        kind: "draft" | "session" | "payment_attempt" | "dispatch_attempt";
        id: string;
        label: string;
        matchedOn: string;
        createdAt: string;
      }
      const data: SearchResultItem[] = [];

      const pattern = `%${q}%`;

      // Search sessions by email or ID
      const sessions = await db
        .select({
          id: schema.sessions.id,
          email: schema.sessions.email,
          locale: schema.sessions.locale,
          createdAt: schema.sessions.createdAt,
        })
        .from(schema.sessions)
        .where(
          or(
            ilike(schema.sessions.email, pattern),
            eq(schema.sessions.id, q),
          ),
        )
        .limit(limit);

      for (const s of sessions) {
        data.push({
          kind: "session",
          id: s.id,
          label: s.email ?? `Session ${s.id.slice(0, 8)}`,
          matchedOn: s.id === q ? "id" : "email",
          createdAt: s.createdAt.toISOString(),
        });
      }

      // Search drafts by ID
      const drafts = await db
        .select({
          id: schema.draftLetters.id,
          status: schema.draftLetters.status,
          sessionId: schema.draftLetters.sessionId,
          createdAt: schema.draftLetters.createdAt,
        })
        .from(schema.draftLetters)
        .where(eq(schema.draftLetters.id, q))
        .limit(limit);

      for (const d of drafts) {
        data.push({
          kind: "draft",
          id: d.id,
          label: `Draft ${d.id.slice(0, 8)} (${d.status})`,
          matchedOn: "id",
          createdAt: d.createdAt.toISOString(),
        });
      }

      // Search payment attempts by stripe ID or draft ID
      const payments = await db
        .select({
          id: schema.paymentAttempts.id,
          draftId: schema.paymentAttempts.draftId,
          state: schema.paymentAttempts.state,
          stripePaymentIntentId: schema.paymentAttempts.stripePaymentIntentId,
          createdAt: schema.paymentAttempts.createdAt,
        })
        .from(schema.paymentAttempts)
        .where(
          or(
            eq(schema.paymentAttempts.id, q),
            eq(schema.paymentAttempts.stripePaymentIntentId, q),
          ),
        )
        .limit(limit);

      for (const p of payments) {
        data.push({
          kind: "payment_attempt",
          id: p.id,
          label: `Payment ${p.id.slice(0, 8)} (${p.state})`,
          matchedOn: p.id === q ? "id" : "stripePaymentIntentId",
          createdAt: p.createdAt.toISOString(),
        });
      }

      // Search dispatch attempts by provider reference
      const dispatches = await db
        .select({
          id: schema.dispatchAttempts.id,
          draftId: schema.dispatchAttempts.draftId,
          state: schema.dispatchAttempts.state,
          providerReference: schema.dispatchAttempts.providerReference,
          createdAt: schema.dispatchAttempts.createdAt,
        })
        .from(schema.dispatchAttempts)
        .where(
          or(
            eq(schema.dispatchAttempts.id, q),
            eq(schema.dispatchAttempts.providerReference, q),
          ),
        )
        .limit(limit);

      for (const d of dispatches) {
        data.push({
          kind: "dispatch_attempt",
          id: d.id,
          label: `Dispatch ${d.id.slice(0, 8)} (${d.state})`,
          matchedOn: d.id === q ? "id" : "providerReference",
          createdAt: d.createdAt.toISOString(),
        });
      }

      // Sort by createdAt descending
      data.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      // Truncate to limit
      const truncated = data.slice(0, limit);

      reply.send({
        data: truncated,
        hasMore: data.length > limit,
      });
    },
  );

  // POST /admin/drafts/:id/refund — initiate refund for paid draft
  app.post<{ Params: { id: string } }>(
    "/admin/drafts/:id/refund",
    async (request, reply) => {
      const db = getDb();
      const { id } = request.params;

      const body = request.body as
        | { reason?: string | undefined; notifyCustomer?: boolean | undefined }
        | null
        | undefined;
      if (
        !body?.reason ||
        typeof body.reason !== "string" ||
        body.reason.length < 1 ||
        body.reason.length > 500
      ) {
        reply
          .status(400)
          .send({ error: "reason is required (1-500 chars)" });
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

      const [payment] = await db
        .select()
        .from(schema.paymentAttempts)
        .where(eq(schema.paymentAttempts.draftId, id))
        .limit(1);

      if (!payment) {
        reply
          .status(404)
          .send({ error: "No payment record found for this draft" });
        return;
      }

      await recordSupportEvent(db, {
        draftId: id,
        sessionId: draft.sessionId,
        eventType: "refund_requested",
        actor: env().ADMIN_USERNAME,
        details: { reason: body.reason, paymentId: payment.id },
      });

      if (!payment.stripePaymentIntentId) {
        throw new AppError({
          family: "payment_failure",
          statusCode: 422,
          code: "NO_STRIPE_INTENT",
          message: "Payment has no Stripe PaymentIntent to refund.",
          userMessage: "This payment cannot be refunded automatically.",
          userAction: "Verify payment was actually processed.",
        });
      }

      const refundableStates = ["captured"];
      if (!refundableStates.includes(payment.state)) {
        throw new AppError({
          family: "payment_failure",
          statusCode: 422,
          code: "PAYMENT_NOT_REFUNDABLE",
          message: `Payment is in '${payment.state}' state and cannot be refunded.`,
          userMessage: "This payment is not in a refundable state.",
          userAction: "Only captured payments can be refunded.",
        });
      }

      const { refundId } = await createRefund(
        payment.stripePaymentIntentId,
        body.reason,
      );

      await transitionPaymentState(db, payment.id, "refund_pending", {
        refundReason: body.reason,
      });

      await recordSupportEvent(db, {
        draftId: id,
        sessionId: draft.sessionId,
        eventType: "refund_initiated",
        actor: env().ADMIN_USERNAME,
        details: { refundId, paymentId: payment.id, reason: body.reason },
      });

      reply.send({
        refundId,
        paymentAttemptId: payment.id,
        state: "refund_pending",
      });
    },
  );

  // POST /admin/drafts/:id/reconcile — manual dispatch reconciliation
  app.post<{ Params: { id: string } }>(
    "/admin/drafts/:id/reconcile",
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

      const [dispatch] = await db
        .select()
        .from(schema.dispatchAttempts)
        .where(eq(schema.dispatchAttempts.draftId, id))
        .limit(1);

      if (!dispatch) {
        reply
          .status(404)
          .send({ error: "No dispatch attempt found for this draft" });
        return;
      }

      await recordSupportEvent(db, {
        draftId: id,
        sessionId: draft.sessionId,
        eventType: "reconciliation_requested",
        actor: env().ADMIN_USERNAME,
        details: { dispatchId: dispatch.id, currentState: dispatch.state },
      });

      // Manual reconciliation requires provider verification — stub for now
      throw new AppError({
        family: "dispatch_ambiguity",
        statusCode: 501,
        code: "RECONCILE_NOT_IMPLEMENTED",
        message:
          "Manual dispatch reconciliation requires provider API integration.",
        userMessage: "Reconciliation is not available yet.",
        userAction: "Check dispatch status manually with postal provider.",
      });
    },
  );
}
