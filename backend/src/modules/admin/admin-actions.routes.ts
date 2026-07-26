import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, or, ilike } from "drizzle-orm";
import { getDb, schema } from "../../db/index.js";
import { AppError } from "../../shared/errors/index.js";
import { getRequiredAdmin } from "../../shared/middleware/require-admin.js";
import { recordSupportEvent } from "./index.js";
import { createRefund } from "../payments/adapters/stripe.adapter.js";
import { syncRefundsForCharge } from "../payments/refund-ledger.service.js";
import type { AdminSearchResponse, AdminSearchResultItem } from "@episto/shared";

const RefundBody = z.object({
  reason: z.string().min(1).max(500),
  notifyCustomer: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Admin action & search routes (split from admin.routes.ts per file-size rules)
// ---------------------------------------------------------------------------

type SearchTargetInput = Pick<
  AdminSearchResultItem,
  "kind" | "id" | "draftId" | "sessionId"
>;

export function getAdminSearchResultTarget(input: SearchTargetInput): {
  draftId: string | null;
  sessionId: string | null;
} {
  if (input.kind === "session") {
    return {
      draftId: null,
      sessionId: input.sessionId ?? input.id,
    };
  }

  return {
    draftId: input.draftId,
    sessionId: input.sessionId,
  };
}

export function canManuallyReconcileDispatch(
  state: string,
  providerReference: string | null,
): boolean {
  return ["submitted", "unknown"].includes(state) && Boolean(providerReference?.trim());
}

export async function adminActionRoutes(app: FastifyInstance): Promise<void> {
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

      const data: AdminSearchResultItem[] = [];

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
        .where(or(ilike(schema.sessions.email, pattern), eq(schema.sessions.id, q)))
        .limit(limit);

      for (const s of sessions) {
        data.push({
          kind: "session",
          id: s.id,
          label: s.email ?? `Session ${s.id.slice(0, 8)}`,
          matchedOn: s.id === q ? "id" : "email",
          createdAt: s.createdAt.toISOString(),
          draftId: null,
          sessionId: s.id,
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
          draftId: d.id,
          sessionId: d.sessionId,
        });
      }

      // Search payment attempts by stripe ID or draft ID
      const payments = await db
        .select({
          id: schema.paymentAttempts.id,
          draftId: schema.paymentAttempts.draftId,
          sessionId: schema.paymentAttempts.sessionId,
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
          draftId: p.draftId,
          sessionId: p.sessionId,
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
          draftId: d.draftId,
          sessionId: null,
        });
      }

      // Sort by createdAt descending
      data.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      // Truncate to limit
      const truncated = data.slice(0, limit);

      const response: AdminSearchResponse = {
        data: truncated,
        hasMore: data.length > limit,
      };

      reply.send(response);
    },
  );

  // POST /admin/drafts/:id/refund — initiate refund for paid draft
  app.post<{ Params: { id: string } }>(
    "/admin/drafts/:id/refund",
    async (request, reply) => {
      const db = getDb();
      const { id } = request.params;

      const body = RefundBody.parse(request.body);

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
        reply.status(404).send({ error: "No payment record found for this draft" });
        return;
      }

      await recordSupportEvent(db, {
        draftId: id,
        sessionId: draft.sessionId,
        eventType: "refund_requested",
        actor: getRequiredAdmin(request).actor,
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

      // Refuse refund if dispatch is already submitted or accepted —
      // the letter may already have been sent.
      const [dispatch] = await db
        .select({ state: schema.dispatchAttempts.state })
        .from(schema.dispatchAttempts)
        .where(eq(schema.dispatchAttempts.draftId, id))
        .limit(1);

      if (dispatch && ["submitted", "accepted"].includes(dispatch.state)) {
        throw new AppError({
          family: "policy_refusal",
          statusCode: 409,
          code: "DISPATCH_IN_PROGRESS",
          message: `Cannot refund: dispatch is in '${dispatch.state}' state. The letter may already have been sent.`,
          userMessage:
            "Cannot refund while the letter may already have been sent. Confirm the provider did NOT send it before refunding.",
          userAction:
            "Confirm with the dispatch provider that the letter was not sent, then retry.",
        });
      }

      // Stable idempotency key: two admin retries can never create two refunds.
      const refund = await createRefund(payment.stripePaymentIntentId, {
        reason: body.reason,
        idempotencyKey: `admin-full-refund:${payment.id}`,
        metadata: { paymentAttemptId: payment.id, draftId: id },
      });

      // Project into the ledger and derive state. If this fails after Stripe
      // succeeded, the charge.refunded webhook reconciles it — never re-call
      // Stripe with a new key.
      let state = "refund_pending";
      try {
        if (refund.chargeId) {
          state = (await syncRefundsForCharge(db, refund.chargeId)) ?? state;
        }
      } catch (err) {
        request.log.error(
          { err, refundId: refund.refundId, paymentId: payment.id },
          "Refund ledger projection failed after Stripe refund; webhook will reconcile",
        );
      }

      await recordSupportEvent(db, {
        draftId: id,
        sessionId: draft.sessionId,
        eventType: "refund_initiated",
        actor: getRequiredAdmin(request).actor,
        details: {
          refundId: refund.refundId,
          paymentId: payment.id,
          reason: body.reason,
        },
      });

      reply.send({
        refundId: refund.refundId,
        paymentAttemptId: payment.id,
        state,
      });
    },
  );
}
