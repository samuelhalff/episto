import { SignatureAssuranceLevel, SignatureFlowMode } from "@episto/shared";

export function resolveSignatureFlowMode(input: {
  signatureFlowMode?: string | null | undefined;
  signatureAssuranceLevel?: string | null | undefined;
  signatureMode?: string | null | undefined;
}): (typeof SignatureFlowMode)[keyof typeof SignatureFlowMode] {
  if (
    input.signatureFlowMode === SignatureFlowMode.none ||
    input.signatureFlowMode === SignatureFlowMode.visual ||
    input.signatureFlowMode === SignatureFlowMode.swisssign_ses ||
    input.signatureFlowMode === SignatureFlowMode.swisssign_qes
  ) {
    return input.signatureFlowMode;
  }

  if (input.signatureAssuranceLevel === SignatureAssuranceLevel.qualified) {
    return SignatureFlowMode.swisssign_qes;
  }

  if (input.signatureAssuranceLevel === SignatureAssuranceLevel.advanced) {
    return SignatureFlowMode.swisssign_ses;
  }

  if (input.signatureMode === "typed" || input.signatureMode === "drawn") {
    return SignatureFlowMode.visual;
  }

  return SignatureFlowMode.none;
}

export function isSwissSignFlowMode(
  signatureFlowMode: string | null | undefined,
): boolean {
  return (
    signatureFlowMode === SignatureFlowMode.swisssign_ses ||
    signatureFlowMode === SignatureFlowMode.swisssign_qes
  );
}

export function requiresSignedDocument(
  signatureFlowMode: string | null | undefined,
): boolean {
  return isSwissSignFlowMode(signatureFlowMode);
}
