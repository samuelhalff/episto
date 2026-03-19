import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
import { getDb, schema } from "../../db/index.js";
import { env } from "../../shared/config/index.js";
import { getQueue, QUEUE_NAMES } from "../../queue/index.js";

// ---------------------------------------------------------------------------
// Admin health endpoint
// GET /admin/health — internal status dashboard (admin-gated)
//
// See docs/07-operations/deployment-and-ci.md §9 for the full spec.
// Each check is attempted independently so a single failure does not prevent
// the response from returning — the status of each service is surfaced.
// ---------------------------------------------------------------------------

interface ServiceStatus {
  ok: boolean;
  detail?: string;
}

interface HealthResponse {
  api: ServiceStatus;
  database: ServiceStatus;
  redis: ServiceStatus;
  objectStorage: ServiceStatus;
  queues: Record<string, { waiting: number; active: number; failed: number }>;
  lastPaymentAt: string | null;
  lastDispatchAt: string | null;
}

async function checkDatabase(): Promise<ServiceStatus> {
  try {
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    return { ok: true };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "unknown" };
  }
}

async function checkObjectStorage(): Promise<ServiceStatus> {
  try {
    const config = env();
    const client = new S3Client({
      endpoint: config.S3_ENDPOINT,
      region: config.S3_REGION,
      credentials: {
        accessKeyId: config.S3_ACCESS_KEY,
        secretAccessKey: config.S3_SECRET_KEY,
      },
      forcePathStyle: true,
    });
    await client.send(new HeadBucketCommand({ Bucket: config.S3_BUCKET }));
    return { ok: true };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "unknown" };
  }
}

async function checkQueues(): Promise<{
  redis: ServiceStatus;
  queues: HealthResponse["queues"];
}> {
  const queues: HealthResponse["queues"] = {};
  try {
    for (const name of Object.values(QUEUE_NAMES)) {
      const q = getQueue(name);
      const counts = await q.getJobCounts("waiting", "active", "failed");
      queues[name] = {
        waiting: counts.waiting ?? 0,
        active: counts.active ?? 0,
        failed: counts.failed ?? 0,
      };
    }
    return { redis: { ok: true }, queues };
  } catch (err) {
    return {
      redis: { ok: false, detail: err instanceof Error ? err.message : "unknown" },
      queues,
    };
  }
}

async function getLastPaymentAt(): Promise<string | null> {
  try {
    const db = getDb();
    const [row] = await db
      .select({ createdAt: schema.paymentAttempts.createdAt })
      .from(schema.paymentAttempts)
      .orderBy(sql`${schema.paymentAttempts.createdAt} DESC`)
      .limit(1);
    return row?.createdAt?.toISOString() ?? null;
  } catch {
    return null;
  }
}

async function getLastDispatchAt(): Promise<string | null> {
  try {
    const db = getDb();
    const [row] = await db
      .select({ submittedAt: schema.dispatchAttempts.submittedAt })
      .from(schema.dispatchAttempts)
      .orderBy(sql`${schema.dispatchAttempts.submittedAt} DESC`)
      .limit(1);
    return row?.submittedAt?.toISOString() ?? null;
  } catch {
    return null;
  }
}

export async function adminHealthRoutes(app: FastifyInstance): Promise<void> {
  // GET /admin/health — internal status dashboard
  // Requires HTTP Basic Auth (enforced by the parent adminRoutes preHandler).
  app.get("/admin/health", async (_request, reply) => {
    const [database, objectStorage, queueResult, lastPaymentAt, lastDispatchAt] =
      await Promise.all([
        checkDatabase(),
        checkObjectStorage(),
        checkQueues(),
        getLastPaymentAt(),
        getLastDispatchAt(),
      ]);

    const body: HealthResponse = {
      api: { ok: true },
      database,
      redis: queueResult.redis,
      objectStorage,
      queues: queueResult.queues,
      lastPaymentAt,
      lastDispatchAt,
    };

    // Return 200 even when some checks fail — callers must inspect each field.
    // A 503 would prevent monitoring tools from reading the partial status.
    reply.status(200).send(body);
  });
}
