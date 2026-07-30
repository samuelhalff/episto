import type { FastifyInstance } from "fastify";
import { desc, eq, or } from "drizzle-orm";
import { getDb, schema } from "../../db/index.js";

// ---------------------------------------------------------------------------
// Admin dispatch visibility endpoint
// GET /admin/dispatch/failed — count + list of dispatch attempts in terminal
// failure states (rejected, unknown)
//
// Guarded by requireAdmin preHandler on the parent adminRoutes.
// ---------------------------------------------------------------------------

export interface FailedDispatchItem {
  dispatchAttemptId: string;
  draftId: string;
  state: string;
  providerName: string;
  failureReason: string | null;
  providerReference: string | null;
  customerEmail: string | null;
  sessionId: string;
  fulfillmentStatus: string;
  paymentState: string | null;
  lastCheckedAt: string | null;
  providerDiagnostics: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface FailedDispatchesResponse {
  count: number;
  dispatches: FailedDispatchItem[];
  generatedAt: string;
}

export async function adminDispatchRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/admin/dispatch/failed",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (_request, reply) => {
      const db = getDb();

      try {
        const rows = await db
          .select({
            id: schema.dispatchAttempts.id,
            draftId: schema.dispatchAttempts.draftId,
            state: schema.dispatchAttempts.state,
            providerName: schema.dispatchAttempts.providerName,
            failureReason: schema.dispatchAttempts.failureReason,
            providerReference: schema.dispatchAttempts.providerReference,
            createdAt: schema.dispatchAttempts.createdAt,
            updatedAt: schema.dispatchAttempts.updatedAt,
            lastCheckedAt: schema.dispatchAttempts.lastCheckedAt,
            fulfillmentStatus: schema.draftLetters.fulfillmentStatus,
            sessionId: schema.draftLetters.sessionId,
            customerEmail: schema.sessions.email,
            paymentState: schema.paymentAttempts.state,
            providerDiagnostics: schema.dispatchAttempts.providerDiagnostics,
          })
          .from(schema.dispatchAttempts)
          .innerJoin(
            schema.draftLetters,
            eq(schema.draftLetters.id, schema.dispatchAttempts.draftId),
          )
          .innerJoin(
            schema.sessions,
            eq(schema.sessions.id, schema.draftLetters.sessionId),
          )
          .leftJoin(
            schema.paymentAttempts,
            eq(schema.paymentAttempts.id, schema.dispatchAttempts.paymentAttemptId),
          )
          .where(
            or(
              eq(schema.dispatchAttempts.state, "rejected"),
              eq(schema.dispatchAttempts.state, "unknown"),
            ),
          )
          .orderBy(desc(schema.dispatchAttempts.updatedAt))
          .limit(200);

        const dispatches: FailedDispatchItem[] = rows.map((row) => ({
          dispatchAttemptId: row.id,
          draftId: row.draftId,
          state: row.state,
          providerName: row.providerName,
          failureReason: row.failureReason,
          providerReference: row.providerReference,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
          lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
          providerDiagnostics: row.providerDiagnostics as Record<string, unknown> | null,
          customerEmail: row.customerEmail,
          sessionId: row.sessionId,
          fulfillmentStatus: row.fulfillmentStatus,
          paymentState: row.paymentState,
        }));

        const response: FailedDispatchesResponse = {
          count: dispatches.length,
          dispatches,
          generatedAt: new Date().toISOString(),
        };

        reply.status(200).send(response);
      } catch (err) {
        reply.status(500).send({
          error: {
            code: "DISPATCH_FAILED_QUERY_FAILED",
            message:
              err instanceof Error ? err.message : "Failed to query failed dispatches",
          },
        });
      }
    },
  );
}
