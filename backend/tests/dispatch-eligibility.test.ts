import { describe, expect, it } from "vitest";
import { canSubmitDispatchForDraft } from "../src/modules/dispatch/dispatch-eligibility.js";

describe("dispatch eligibility", () => {
  it("allows standard visual orders only after payment capture", () => {
    expect(
      canSubmitDispatchForDraft({
        signatureFlowMode: "visual",
        paymentState: "captured",
        signatureSessionStatus: null,
        signedFileAssetId: null,
        renderedPdfAssetId: "pdf-rendered-1",
      }),
    ).toBe(true);

    expect(
      canSubmitDispatchForDraft({
        signatureFlowMode: "visual",
        paymentState: "authorized",
        signatureSessionStatus: null,
        signedFileAssetId: null,
        renderedPdfAssetId: "pdf-rendered-1",
      }),
    ).toBe(false);
  });

  it("allows SwissSign orders once payment is captured and the signed document is attached", () => {
    expect(
      canSubmitDispatchForDraft({
        signatureFlowMode: "swisssign_ses",
        paymentState: "captured",
        signatureSessionStatus: "signed_document_attached",
        signedFileAssetId: "signed-pdf-1",
        renderedPdfAssetId: "pdf-rendered-1",
      }),
    ).toBe(true);
  });

  it("blocks SwissSign orders when signing is still in progress", () => {
    expect(
      canSubmitDispatchForDraft({
        signatureFlowMode: "swisssign_ses",
        paymentState: "captured",
        signatureSessionStatus: "signature_in_progress",
        signedFileAssetId: null,
        renderedPdfAssetId: "pdf-rendered-1",
      }),
    ).toBe(false);
  });

  it("blocks SwissSign orders while payment is only authorized", () => {
    expect(
      canSubmitDispatchForDraft({
        signatureFlowMode: "swisssign_ses",
        paymentState: "authorized",
        signatureSessionStatus: "signed_document_attached",
        signedFileAssetId: "signed-pdf-1",
        renderedPdfAssetId: "pdf-rendered-1",
      }),
    ).toBe(false);
  });

  it("blocks SwissSign orders when the signed document is missing", () => {
    expect(
      canSubmitDispatchForDraft({
        signatureFlowMode: "swisssign_ses",
        paymentState: "captured",
        signatureSessionStatus: "signature_completed",
        signedFileAssetId: null,
        renderedPdfAssetId: "pdf-rendered-1",
      }),
    ).toBe(false);
  });

  it("blocks every order when no rendered source document exists", () => {
    expect(
      canSubmitDispatchForDraft({
        signatureFlowMode: "visual",
        paymentState: "captured",
        signatureSessionStatus: null,
        signedFileAssetId: null,
        renderedPdfAssetId: null,
      }),
    ).toBe(false);
  });
});
