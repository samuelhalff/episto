import type { FastifyInstance } from "fastify";
import { calculatePrice, formatCHF } from "./index.js";

/**
 * GET /pricing — public pricing information.
 *
 * Returns the current MVP pricing for standard and registered delivery.
 * Prices are config-driven (not hardcoded) and always computed by the
 * backend pricing module.
 */
export async function pricingRoutes(app: FastifyInstance): Promise<void> {
  app.get("/pricing", async (_request, reply) => {
    const standard = calculatePrice("standard");
    const registered = calculatePrice("registered");

    reply.send({
      standard: {
        totalCents: standard.totalCents,
        displayPrice: formatCHF(standard.totalCents),
        currency: "CHF" as const,
      },
      registered: {
        totalCents: registered.totalCents,
        displayPrice: formatCHF(registered.totalCents),
        currency: "CHF" as const,
      },
    });
  });
}
