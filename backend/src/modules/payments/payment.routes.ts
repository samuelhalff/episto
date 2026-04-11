import type { FastifyInstance } from "fastify";
import { registerPaymentCheckoutRoutes } from "./payment-checkout.routes.js";
import { registerPaymentStatusRoutes } from "./payment-status.routes.js";
import { registerPaymentWebhookRoutes } from "./payment-webhook.routes.js";

export async function paymentRoutes(app: FastifyInstance): Promise<void> {
  await registerPaymentStatusRoutes(app);
  await registerPaymentCheckoutRoutes(app);
  await app.register(registerPaymentWebhookRoutes);
}
