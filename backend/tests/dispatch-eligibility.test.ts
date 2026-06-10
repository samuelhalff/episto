import { describe, expect, it } from "vitest";
import { canSubmitDispatchForDraft } from "../src/modules/dispatch/dispatch-eligibility.js";

describe("dispatch eligibility", () => {
  it("allows standard visual orders only after payment capture", () => {
    expect(
      canSubmitDispatchForDraft({
        signatureFlowMode: "visual",
        paymentState: "captured",
        renderedPdfAssetId: "pdf-rendered-1",
      }),
    ).toBe(true);

    expect(
      canSubmitDispatchForDraft({
        signatureFlowMode: "visual",
        paymentState: "authorized",
        renderedPdfAssetId: "pdf-rendered-1",
      }),
    ).toBe(false);
  });

  it("blocks every order when no rendered source document exists", () => {
    expect(
      canSubmitDispatchForDraft({
        signatureFlowMode: "visual",
        paymentState: "captured",
        renderedPdfAssetId: null,
      }),
    ).toBe(false);
  });
});
