import { AppError } from "../../shared/errors/index.js";
import { env } from "../../shared/config/index.js";
import { resolveSignatureFlowMode, isSwissSignFlowMode } from "./signature-flow.js";

export function assertSignatureFlowSupported(input: {
  signatureFlowMode?: string | null;
  signatureAssuranceLevel?: string | null;
  signatureMode?: string | null;
}): void {
  const signatureFlowMode = resolveSignatureFlowMode(input);

  if (!isSwissSignFlowMode(signatureFlowMode)) {
    return;
  }

  if (env().SIGNATURE_PROVIDER_MODE === "disabled") {
    throw new AppError({
      family: "policy_refusal",
      statusCode: 409,
      code: "SIGNATURE_ASSURANCE_UNAVAILABLE",
      message: `Signature flow '${signatureFlowMode}' is not available in this environment.`,
      userMessage: "SwissSign signature flows are not available in this environment.",
      userAction: "Select a typed or drawn signature to continue.",
    });
  }
}
