import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { getDb } from "../db/index.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_req, reply) => {
    reply.send({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/readiness", async (_req, reply) => {
    const checks: Record<string, "ok" | "fail"> = {};
    let allOk = true;

    // Database connectivity
    try {
      const db = getDb();
      await db.execute(sql`SELECT 1`);
      checks.database = "ok";
    } catch {
      checks.database = "fail";
      allOk = false;
    }

    const status = allOk ? "ok" : "degraded";
    const statusCode = allOk ? 200 : 503;
    reply.status(statusCode).send({
      status,
      timestamp: new Date().toISOString(),
      checks,
    });
  });
}
