import type { SignatureAssuranceLevelValue } from "@episto/shared";

export type SignatureMode = "typed" | "drawn" | null;
export type PublicSignatureChoice = "typed" | "drawn";

export function getPublicSignatureChoice(
  _assuranceLevel: SignatureAssuranceLevelValue | null | undefined,
  signatureMode: SignatureMode,
): PublicSignatureChoice | null {
  if (signatureMode === "typed" || signatureMode === "drawn") {
    return signatureMode;
  }

  return null;
}
