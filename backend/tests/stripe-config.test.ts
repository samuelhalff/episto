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
  it("offers an allowlist of methods filtered by active account capabilities", () => {
    // Explicit allowlist (card / twint / link) intersected with active
    // capabilities — never automatic_payment_methods, which would surface every
    // Dashboard-enabled method (Klarna, Amazon Pay, BLIK, …).
    expect(stripeAdapterSource).toContain("payment_method_types: paymentMethodTypes");
    expect(stripeAdapterSource).toContain("twint_payments");
    expect(stripeAdapterSource).toContain("card_payments");
    expect(stripeAdapterSource).toContain("link_payments");
    expect(stripeAdapterSource).not.toContain("automatic_payment_methods");
  });

  it("uses manual capture only for signature-led authorization flows", () => {
    const createBlock =
      stripeAdapterSource.split("paymentIntents.create")[1]?.split(");")[0] ?? "";
    expect(createBlock).toContain('metadata.captureStrategy === "manual"');
    expect(createBlock).toContain('? "manual" : "automatic"');
  });
});
