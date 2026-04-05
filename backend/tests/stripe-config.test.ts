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
  it("uses automatic_payment_methods so Stripe surfaces Twint and wallets", () => {
    expect(stripeAdapterSource).toContain("automatic_payment_methods");
    expect(stripeAdapterSource).toContain("enabled: true");
  });

  it("does not use manual capture (incompatible with Twint)", () => {
    // Stripe filters out Twint when capture_method is 'manual'.
    const createBlock = stripeAdapterSource.split("paymentIntents.create")[1]?.split(");")[0] ?? "";
    expect(createBlock).not.toContain('"manual"');
    expect(createBlock).not.toContain("'manual'");
  });
});
