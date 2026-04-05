import type { FastifyInstance } from "fastify";
import { getPublicPricing } from "./index.js";

/**
 * GET /pricing — public pricing information.
 *
 * Returns the public reference pricing used by marketing surfaces.
 * Exact checkout pricing still comes from the live draft-specific provider quote.
 */
export async function pricingRoutes(app: FastifyInstance): Promise<void> {
  app.get("/pricing", async (_request, reply) => {
    reply.send(getPublicPricing());
  });
}
