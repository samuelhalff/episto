import { hasConcreteSignature } from "@/lib/letter-content";

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function hasCompleteAddress(input: {
  addressLine1: string;
  postalCode: string;
  city: string;
}): boolean {
  return hasText(input.addressLine1) && hasText(input.postalCode) && hasText(input.city);
}

export function getSenderStepValidation(input: {
  fullName: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  isResolvingSelection: boolean;
  requiresAddressSelection: boolean;
}) {
  return {
    canProceed:
      hasText(input.fullName) &&
      hasCompleteAddress(input) &&
      !input.isResolvingSelection &&
      !input.requiresAddressSelection,
  };
}

export function getRecipientStepValidation(input: {
  isCompany: boolean;
  showManual: boolean;
  fullName: string;
  companyName: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  hasSelectedCompany: boolean;
  isResolvingSelection: boolean;
  requiresAddressSelection: boolean;
}) {
  const hasIdentity = input.isCompany
    ? hasText(input.companyName)
    : hasText(input.fullName);
  const isCompanySearchMode = input.isCompany && !input.showManual;
  const hasVisibleAddress = !isCompanySearchMode && hasCompleteAddress(input);

  return {
    canProceed:
      hasIdentity &&
      hasVisibleAddress &&
      !isCompanySearchMode &&
      !input.isResolvingSelection &&
      !input.requiresAddressSelection &&
      (!input.isCompany || input.showManual || input.hasSelectedCompany),
  };
}

export function getLogisticsStepValidation(input: {
  hasSubject: boolean;
  hasBody: boolean;
  hasSender: boolean;
  hasRecipient: boolean;
  signatureFlowMode: string | null;
  signatureMode: "typed" | "drawn" | null;
  signatureFileId: string | null;
}) {
  const hasSignatureFlow = input.signatureFlowMode === "swisssign_ses";

  return {
    canProceed:
      input.hasSubject &&
      input.hasBody &&
      input.hasSender &&
      input.hasRecipient &&
      (hasSignatureFlow ||
        hasConcreteSignature(input.signatureMode, input.signatureFileId)),
  };
}
