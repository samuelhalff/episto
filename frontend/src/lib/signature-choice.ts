import { SignatureAssuranceLevel } from "@episto/shared";
import type { SignatureAssuranceLevelValue } from "@episto/shared";

export type SignatureMode = "typed" | "drawn" | null;
export type PublicSignatureChoice = "typed" | "drawn" | "qualified";

export function getPublicSignatureChoice(
  assuranceLevel: SignatureAssuranceLevelValue | null | undefined,
  signatureMode: SignatureMode,
): PublicSignatureChoice | null {
  if (assuranceLevel === SignatureAssuranceLevel.qualified) {
    return "qualified";
  }

  if (signatureMode === "typed" || signatureMode === "drawn") {
    return signatureMode;
  }

  return null;
}
