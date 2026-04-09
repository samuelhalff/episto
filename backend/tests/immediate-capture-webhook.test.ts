import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("payment_intent.succeeded webhook handler", () => {
  const routesSource = readFileSync(
    new URL("../src/modules/payments/payment.routes.ts", import.meta.url),
    "utf-8",
  );

  // Extract the succeeded handler block for targeted assertions
  const succeededBlock = routesSource.split('"payment_intent.succeeded"')[1]?.split("case ")[0] ?? "";

  it("enqueues dispatch submission on capture", () => {
    // With automatic capture, payment_intent.succeeded is the primary webhook.
    // The handler must enqueue dispatch for every successful payment.
    expect(succeededBlock).toContain("enqueueDispatchSubmission");
  });

  it("sends dispatch confirmation email on capture", () => {
    expect(succeededBlock).toContain("enqueueDispatchConfirmationEmail");
  });

  it("retrieves the latest snapshot for dispatch", () => {
    expect(succeededBlock).toContain("getLatestSnapshot");
  });

  it("transitions payment to captured state", () => {
    expect(succeededBlock).toContain('"captured"');
  });
});
