import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const paymentCheckoutRoutesSource = readFileSync(
  path.join(repoRoot, "backend/src/modules/payments/payment-checkout.routes.ts"),
  "utf8",
);

describe("checkout quote routing", () => {
  it("uses the payment quote resolver instead of the old direct dispatch helper", () => {
    expect(paymentCheckoutRoutesSource).toContain("resolvePaymentDispatchQuoteForDraft");
    expect(paymentCheckoutRoutesSource).not.toContain(
      "const quote = await getDispatchQuoteForDraft(db, draftId);",
    );
  });
});
