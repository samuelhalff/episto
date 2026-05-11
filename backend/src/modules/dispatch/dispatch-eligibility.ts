import type {
  PaymentStateValue,
  SignatureFlowModeValue,
  SignatureSessionStatusValue,
} from "@episto/shared";

function isSwissSignFlow(signatureFlowMode: SignatureFlowModeValue): boolean {
  return signatureFlowMode === "swisssign_ses";
}

export interface DispatchSubmissionEligibilityInput {
  signatureFlowMode: SignatureFlowModeValue;
  paymentState: PaymentStateValue | null;
  signatureSessionStatus: SignatureSessionStatusValue | null;
  signedFileAssetId: string | null;
  renderedPdfAssetId: string | null;
}

export function canSubmitDispatchForDraft(
  input: DispatchSubmissionEligibilityInput,
): boolean {
  if (!input.renderedPdfAssetId) {
    return false;
  }

  if (!isSwissSignFlow(input.signatureFlowMode)) {
    return input.paymentState === "captured";
  }

  return (
    input.paymentState === "captured" &&
    input.signatureSessionStatus === "signed_document_attached" &&
    Boolean(input.signedFileAssetId)
  );
}
