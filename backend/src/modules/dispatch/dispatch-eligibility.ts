import type { PaymentStateValue, SignatureFlowModeValue } from "@episto/shared";

export interface DispatchSubmissionEligibilityInput {
  signatureFlowMode: SignatureFlowModeValue;
  paymentState: PaymentStateValue | null;
  renderedPdfAssetId: string | null;
}

export function canSubmitDispatchForDraft(
  input: DispatchSubmissionEligibilityInput,
): boolean {
  if (!input.renderedPdfAssetId) {
    return false;
  }

  return input.paymentState === "captured";
}
