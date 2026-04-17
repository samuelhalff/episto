import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { getDb, schema } from "../db/index.js";
import { checkBucketAccess } from "../modules/files/adapters/s3.adapter.js";
import { getQueue, QUEUE_NAMES } from "../queue/index.js";
import { checkEmailReadiness } from "../modules/email/email-readiness.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_req, reply) => {
    reply.send({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/readiness", async (_req, reply) => {
    const checks: Record<string, "ok" | "fail"> = {};
    let allOk = true;
    const db = getDb();

    // Database connectivity
    try {
      await db.execute(sql`SELECT 1`);
      checks.database = "ok";
    } catch {
      checks.database = "fail";
      allOk = false;
    }

    try {
      await db
        .select({
          paymentAttemptId: schema.dispatchAttempts.paymentAttemptId,
          trackingNumber: schema.dispatchAttempts.trackingNumber,
        })
        .from(schema.dispatchAttempts)
        .limit(0);
      checks.schema = "ok";
    } catch {
      checks.schema = "fail";
      allOk = false;
    }

    // Redis connectivity (via BullMQ queue ping)
    try {
      const q = getQueue(QUEUE_NAMES.SEND_EMAIL);
      await q.getJobCounts("waiting");
      checks.redis = "ok";
    } catch {
      checks.redis = "fail";
      allOk = false;
    }

    try {
      await checkBucketAccess();
      checks.objectStorage = "ok";
    } catch {
      checks.objectStorage = "fail";
      allOk = false;
    }

    const emailReadiness = checkEmailReadiness();
    // Surface transactional email readiness without turning it into a hard
    // infrastructure outage. Otherwise Compose health gating can block the
    // worker and escalate an email misconfiguration into a payment outage.
    checks.email = emailReadiness.ok ? "ok" : "fail";

    const status = allOk ? "ok" : "degraded";
    const statusCode = allOk ? 200 : 503;
    reply.status(statusCode).send({
      status,
      timestamp: new Date().toISOString(),
      checks,
    });
  });
}
