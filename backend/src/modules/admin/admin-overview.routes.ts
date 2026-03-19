import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { getDb, schema } from "../../db/index.js";

// ---------------------------------------------------------------------------
// Admin overview/dashboard endpoint
// GET /admin/overview — operational counters for the admin dashboard
//
// See docs/06-build-packs/admin-build-pack.md §Overview widgets for the full spec.
// All counts are computed from canonical application state — no raw provider data.
// ---------------------------------------------------------------------------

interface DispatchStateCounts {
  queued: number;
  submitted: number;
  accepted: number;
  rejected: number;
  unknown: number;
  reconciled: number;
}

interface PaymentStateCounts {
  pending: number;
  captured: number;
  failed: number;
  refund_pending: number;
  refunded: number;
}

interface OverviewResponse {
  dispatch: DispatchStateCounts;
  payments: PaymentStateCounts;
  ambiguousDispatchQueue: number;
  recentRefunds: number;
  generatedAt: string;
}

export async function adminOverviewRoutes(app: FastifyInstance): Promise<void> {
  app.get("/admin/overview", async (_request, reply) => {
    const db = getDb();

    try {
      // Dispatch state counts
      const dispatchCountRows = await db.execute<{ state: string; count: string }>(sql`
        SELECT state::text, COUNT(*)::int AS count
        FROM dispatch_attempts
        GROUP BY state
      `);

      const dispatch: DispatchStateCounts = {
        queued: 0,
        submitted: 0,
        accepted: 0,
        rejected: 0,
        unknown: 0,
        reconciled: 0,
      };

      for (const row of dispatchCountRows.rows) {
        const state = row.state as keyof DispatchStateCounts;
        if (state in dispatch) {
          dispatch[state] = Number(row.count);
        }
      }

      // Payment state counts (last 30 days)
      const paymentCountRows = await db.execute<{ state: string; count: string }>(sql`
        SELECT state::text, COUNT(*)::int AS count
        FROM payment_attempts
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY state
      `);

      const payments: PaymentStateCounts = {
        pending: 0,
        captured: 0,
        failed: 0,
        refund_pending: 0,
        refunded: 0,
      };

      for (const row of paymentCountRows.rows) {
        const state = row.state as keyof PaymentStateCounts;
        if (state in payments) {
          payments[state] = Number(row.count);
        }
      }

      // Ambiguous dispatch queue: dispatch attempts stuck in 'unknown' state
      const ambiguousResult = await db.execute<{ count: string }>(sql`
        SELECT COUNT(*)::int AS count
        FROM dispatch_attempts
        WHERE state = 'unknown'
      `);
      const ambiguousDispatchQueue = Number(ambiguousResult.rows[0]?.count ?? 0);

      // Recent refunds: payment attempts in refund states in last 7 days
      const refundResult = await db.execute<{ count: string }>(sql`
        SELECT COUNT(*)::int AS count
        FROM payment_attempts
        WHERE state IN ('refund_pending', 'refunded')
          AND updated_at > NOW() - INTERVAL '7 days'
      `);
      const recentRefunds = Number(refundResult.rows[0]?.count ?? 0);

      const overview: OverviewResponse = {
        dispatch,
        payments,
        ambiguousDispatchQueue,
        recentRefunds,
        generatedAt: new Date().toISOString(),
      };

      reply.status(200).send(overview);
    } catch (err) {
      reply.status(500).send({
        error: {
          code: "OVERVIEW_QUERY_FAILED",
          message: err instanceof Error ? err.message : "Failed to generate overview",
        },
      });
    }
  });
}
