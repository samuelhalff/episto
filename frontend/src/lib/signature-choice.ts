export type SignatureMode = "typed" | "drawn" | null;
export type PublicSignatureChoice = "typed" | "drawn";

export function getPublicSignatureChoice(
  signatureMode: SignatureMode,
): PublicSignatureChoice | null {
  if (signatureMode === "typed" || signatureMode === "drawn") {
    return signatureMode;
  }

  return null;
}
