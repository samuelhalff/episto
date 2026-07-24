import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const stripeAdapterSource = readFileSync(
  path.join(repoRoot, "backend/src/modules/payments/adapters/stripe.adapter.ts"),
  "utf8",
);

describe("stripe configuration guards", () => {
  it("treats placeholder credentials as a configuration error", () => {
    expect(stripeAdapterSource).toContain("replace_me|placeholder");
    expect(stripeAdapterSource).toContain('code: "STRIPE_NOT_CONFIGURED"');
    expect(stripeAdapterSource).toContain(
      "Stripe secret key is still using a placeholder value.",
    );
  });

  it("maps Stripe authentication failures to the same configuration error code", () => {
    expect(stripeAdapterSource).toContain('case "StripeAuthenticationError"');
    expect(stripeAdapterSource).toContain(
      "createStripeNotConfiguredError(err.message, err)",
    );
  });

  it("does not wrap Stripe configuration errors back into a generic provider outage", () => {
    expect(stripeAdapterSource).toContain("if (err instanceof AppError) {");
    expect(stripeAdapterSource).toContain("throw err;");
  });
});

describe("createPaymentIntent configuration", () => {
  it("delegates payment methods to the Stripe account via automatic_payment_methods", () => {
    // The account's Dashboard config decides which methods appear, so an
    // inactive method (e.g. TWINT pending review) can't reject the whole intent.
    expect(stripeAdapterSource).toContain("automatic_payment_methods: { enabled: true }");
    expect(stripeAdapterSource).not.toContain("payment_method_types:");
  });

  it("uses manual capture only for signature-led authorization flows", () => {
    const createBlock =
      stripeAdapterSource.split("paymentIntents.create")[1]?.split(");")[0] ?? "";
    expect(createBlock).toContain('metadata.captureStrategy === "manual"');
    expect(createBlock).toContain('? "manual" : "automatic"');
  });
});
