import { describe, expect, it } from "vitest";

describe("dispatch policy constraints", () => {
  it("rejects recipient addresses outside Switzerland", async () => {
    const { assertDispatchPolicyConstraints } = await import(
      "../src/modules/dispatch/dispatch-policy.js"
    );

    expect(() =>
      assertDispatchPolicyConstraints({
        recipientCountry: "FR",
        estimatedPages: 2,
      }),
    ).toThrowError(/Swiss recipient addresses/i);
  });

  it("rejects letters longer than 5 pages", async () => {
    const { assertDispatchPolicyConstraints } = await import(
      "../src/modules/dispatch/dispatch-policy.js"
    );

    expect(() =>
      assertDispatchPolicyConstraints({
        recipientCountry: "CH",
        estimatedPages: 6,
      }),
    ).toThrowError(/5 pages/i);
  });

  it("accepts Swiss recipients up to 5 pages", async () => {
    const { assertDispatchPolicyConstraints } = await import(
      "../src/modules/dispatch/dispatch-policy.js"
    );

    expect(() =>
      assertDispatchPolicyConstraints({
        recipientCountry: "CH",
        estimatedPages: 5,
      }),
    ).not.toThrow();
  });
});
