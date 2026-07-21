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
          })
          .from(schema.dispatchAttempts)
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
