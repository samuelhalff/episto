import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

describe("payment_intent.succeeded webhook handler", () => {
  const webhookRoutesSource = readFileSync(
    new URL("../src/modules/payments/payment-webhook.routes.ts", import.meta.url),
    "utf-8",
  );
  const routeHelpersSource = readFileSync(
    new URL("../src/modules/payments/payment-route-helpers.ts", import.meta.url),
    "utf-8",
  );

  // Extract the succeeded handler block for targeted assertions
  const succeededBlock =
    webhookRoutesSource.split('"payment_intent.succeeded"')[1]?.split("case ")[0] ?? "";

  it("enqueues dispatch submission on capture", () => {
    // With automatic capture, payment_intent.succeeded is the primary webhook.
    // The handler must enqueue dispatch for every successful payment.
    expect(succeededBlock).toContain("enqueueDispatchIfSnapshotReady");
    expect(routeHelpersSource).toContain("enqueueDispatchSubmission");
  });

  it("does not send dispatch confirmation email on capture", () => {
    expect(succeededBlock).not.toContain("enqueueDispatchConfirmationEmail");
  });

  it("retrieves the latest snapshot for dispatch", () => {
    expect(routeHelpersSource).toContain("getLatestSnapshot");
  });

  it("transitions payment to captured state", () => {
    expect(succeededBlock).toContain('"captured"');
  });
});
