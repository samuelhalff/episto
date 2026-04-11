import type { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import type {
  AdminDraftCaseResponse,
  AdminSessionDetailResponse,
} from "@swiss-mail/shared";
import { getDb, schema } from "../../db/index.js";
import { notFoundError, validationError, AppError } from "../../shared/errors/index.js";
import { getRequiredAdmin } from "../../shared/middleware/require-admin.js";
import { enqueueDispatchReconciliation } from "../dispatch/dispatch.jobs.js";
import { recordSupportEvent } from "./index.js";
import { canManuallyReconcileDispatch } from "./admin-actions.routes.js";

const REDACTED_MARKER = "[REDACTED]";

export async function adminCaseRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>("/admin/drafts/:id", async (request, reply) => {
    const db = getDb();
    const { id } = request.params;

    const [draft] = await db
      .select()
      .from(schema.draftLetters)
      .where(eq(schema.draftLetters.id, id))
      .limit(1);

    if (!draft) {
      throw notFoundError("draft");
    }

    const [session, payment, dispatch] = await Promise.all([
      db
        .select({
          id: schema.sessions.id,
          email: schema.sessions.email,
          locale: schema.sessions.locale,
          createdAt: schema.sessions.createdAt,
          expiresAt: schema.sessions.expiresAt,
        })
        .from(schema.sessions)
        .where(eq(schema.sessions.id, draft.sessionId))
        .limit(1)
        .then((rows) => rows[0] ?? null),
      db
        .select({
          id: schema.paymentAttempts.id,
          state: schema.paymentAttempts.state,
          amountCents: schema.paymentAttempts.amountCents,
          currency: schema.paymentAttempts.currency,
          updatedAt: schema.paymentAttempts.updatedAt,
          stripePaymentIntentId: schema.paymentAttempts.stripePaymentIntentId,
        })
        .from(schema.paymentAttempts)
        .where(eq(schema.paymentAttempts.draftId, id))
        .orderBy(desc(schema.paymentAttempts.updatedAt))
        .limit(1)
        .then((rows) => rows[0] ?? null),
      db
        .select({
          id: schema.dispatchAttempts.id,
          state: schema.dispatchAttempts.state,
          providerName: schema.dispatchAttempts.providerName,
          providerReference: schema.dispatchAttempts.providerReference,
          trackingNumber: schema.dispatchAttempts.trackingNumber,
          submittedAt: schema.dispatchAttempts.submittedAt,
          lastCheckedAt: schema.dispatchAttempts.lastCheckedAt,
          failureReason: schema.dispatchAttempts.failureReason,
        })
        .from(schema.dispatchAttempts)
        .where(eq(schema.dispatchAttempts.draftId, id))
        .orderBy(desc(schema.dispatchAttempts.updatedAt))
        .limit(1)
        .then((rows) => rows[0] ?? null),
    ]);

    if (!session) {
      throw notFoundError("session");
    }

    const contentRetained =
      (draft.subject !== null && draft.subject !== REDACTED_MARKER) ||
      (draft.body !== null && draft.body !== REDACTED_MARKER);

    const response: AdminDraftCaseResponse = {
      draft: {
        id: draft.id,
        sessionId: draft.sessionId,
        status: draft.status,
        locale: draft.locale,
        deliveryType: draft.deliveryType,
        createdAt: draft.createdAt.toISOString(),
        updatedAt: draft.updatedAt.toISOString(),
        contentRetained,
        actions: {
          canRefund: payment?.state === "captured",
          canViewContent: contentRetained,
          canReconcile: dispatch
            ? canManuallyReconcileDispatch(
                dispatch.state,
                dispatch.providerReference,
              )
            : false,
        },
      },
      session: {
        id: session.id,
        email: session.email,
        locale: session.locale,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      },
      payment: payment
        ? {
            id: payment.id,
            state: payment.state,
            amountCents: payment.amountCents,
            currency: payment.currency,
            updatedAt: payment.updatedAt.toISOString(),
            stripePaymentIntentId: payment.stripePaymentIntentId,
          }
        : null,
      dispatch: dispatch
        ? {
            id: dispatch.id,
            state: dispatch.state,
            providerName: dispatch.providerName,
            providerReference: dispatch.providerReference,
            trackingNumber: dispatch.trackingNumber,
            submittedAt: dispatch.submittedAt?.toISOString() ?? null,
            lastCheckedAt: dispatch.lastCheckedAt?.toISOString() ?? null,
            failureReason: dispatch.failureReason,
          }
        : null,
    };

    reply.send(response);
  });

  app.get<{ Params: { id: string } }>("/admin/sessions/:id", async (request, reply) => {
    const db = getDb();
    const { id } = request.params;

    const [session] = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, id))
      .limit(1);

    if (!session) {
      throw notFoundError("session");
    }

    const draftRows = await db
      .select({
        id: schema.draftLetters.id,
        status: schema.draftLetters.status,
        createdAt: schema.draftLetters.createdAt,
      })
      .from(schema.draftLetters)
      .where(eq(schema.draftLetters.sessionId, id))
      .orderBy(desc(schema.draftLetters.createdAt));

    const drafts = await Promise.all(
      draftRows.map(async (draft) => {
        const [payment, dispatch] = await Promise.all([
          db
            .select({
              state: schema.paymentAttempts.state,
            })
            .from(schema.paymentAttempts)
            .where(eq(schema.paymentAttempts.draftId, draft.id))
            .orderBy(desc(schema.paymentAttempts.updatedAt))
            .limit(1)
            .then((rows) => rows[0] ?? null),
          db
            .select({
              state: schema.dispatchAttempts.state,
            })
            .from(schema.dispatchAttempts)
            .where(eq(schema.dispatchAttempts.draftId, draft.id))
            .orderBy(desc(schema.dispatchAttempts.updatedAt))
            .limit(1)
            .then((rows) => rows[0] ?? null),
        ]);

        return {
          id: draft.id,
          status: draft.status,
          createdAt: draft.createdAt.toISOString(),
          paymentState: payment?.state ?? null,
          dispatchState: dispatch?.state ?? null,
        };
      }),
    );

    const supportEvents = await db
      .select()
      .from(schema.supportEvents)
      .where(eq(schema.supportEvents.sessionId, id))
      .orderBy(desc(schema.supportEvents.createdAt));

    const response: AdminSessionDetailResponse = {
      session: {
        id: session.id,
        type: session.type,
        locale: session.locale,
        email: session.email,
        ipAddress: session.ipAddress,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      },
      drafts,
      supportEvents: supportEvents.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        actor: event.actor,
        details: event.details,
        createdAt: event.createdAt.toISOString(),
      })),
    };

    reply.send(response);
  });

  app.post<{ Params: { id: string } }>(
    "/admin/dispatches/:id/reconcile",
    async (request, reply) => {
      const db = getDb();
      const { id } = request.params;
      const body = request.body as { reason?: string } | null;

      if (!body?.reason || typeof body.reason !== "string" || body.reason.trim().length < 5) {
        throw validationError("A reason is required for manual reconciliation (min 5 chars).");
      }

      const [dispatch] = await db
        .select()
        .from(schema.dispatchAttempts)
        .where(eq(schema.dispatchAttempts.id, id))
        .limit(1);

      if (!dispatch) {
        throw notFoundError("dispatch attempt");
      }

      if (!canManuallyReconcileDispatch(dispatch.state, dispatch.providerReference)) {
        throw new AppError({
          family: "dispatch_ambiguity",
          statusCode: 422,
          code: "DISPATCH_NOT_RECONCILABLE",
          message: `Dispatch ${dispatch.id} is not eligible for manual reconciliation.`,
          userMessage: "This dispatch cannot be manually reconciled right now.",
          userAction: "Use reconciliation only for ambiguous provider-backed dispatches.",
        });
      }

      const [draft] = await db
        .select({
          sessionId: schema.draftLetters.sessionId,
        })
        .from(schema.draftLetters)
        .where(eq(schema.draftLetters.id, dispatch.draftId))
        .limit(1);

      await recordSupportEvent(db, {
        draftId: dispatch.draftId,
        sessionId: draft?.sessionId ?? null,
        eventType: "reconciliation_requested",
        actor: getRequiredAdmin(request).actor,
        details: {
          dispatchAttemptId: dispatch.id,
          providerReference: dispatch.providerReference,
          reason: body.reason.trim(),
        },
      });

      await enqueueDispatchReconciliation({
        dispatchAttemptId: dispatch.id,
      });

      reply.send({
        queued: true,
        dispatchAttemptId: dispatch.id,
        state: dispatch.state,
        providerReference: dispatch.providerReference,
      });
    },
  );
}
