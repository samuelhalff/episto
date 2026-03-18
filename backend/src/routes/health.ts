import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_req, reply) => {
    reply.send({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/readiness", async (_req, reply) => {
    // TODO: add DB + Redis connectivity checks
    reply.send({ status: "ok", timestamp: new Date().toISOString() });
  });
}
