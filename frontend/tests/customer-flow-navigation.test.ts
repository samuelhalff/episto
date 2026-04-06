import { describe, expect, it } from "vitest";

import {
  CUSTOMER_FLOW_STEPS,
  getCustomerFlowBackPath,
  getCustomerFlowPath,
  getNextCustomerFlowStep,
  getPreviousCustomerFlowStep,
} from "../src/lib/customer-flow";

describe("customer flow graph", () => {
  it("keeps one ordered path from intake through checkout", () => {
    expect(CUSTOMER_FLOW_STEPS).toEqual([
      "intake",
      "sender",
      "recipient",
      "body",
      "attachments",
      "subject",
      "logistics",
      "review",
      "checkout",
    ]);
  });

  it("returns the previous and next step across workspace and page boundaries", () => {
    expect(getPreviousCustomerFlowStep("sender")).toBe("intake");
    expect(getPreviousCustomerFlowStep("review")).toBe("logistics");
    expect(getPreviousCustomerFlowStep("checkout")).toBe("review");
    expect(getNextCustomerFlowStep("logistics")).toBe("review");
    expect(getNextCustomerFlowStep("review")).toBe("checkout");
    expect(getNextCustomerFlowStep("checkout")).toBeNull();
  });

  it("builds canonical routes for every flow step", () => {
    expect(getCustomerFlowPath("draft_123", "intake")).toBe("/draft/draft_123");
    expect(getCustomerFlowPath("draft_123", "logistics")).toBe(
      "/draft/draft_123/logistics",
    );
    expect(getCustomerFlowPath("draft_123", "review")).toBe("/draft/draft_123/review");
    expect(getCustomerFlowPath("draft_123", "checkout")).toBe(
      "/draft/draft_123/checkout",
    );
    expect(getCustomerFlowBackPath("draft_123", "checkout")).toBe(
      "/draft/draft_123/review",
    );
  });
});
