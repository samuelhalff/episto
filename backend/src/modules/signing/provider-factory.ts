import { env } from "../../shared/config/index.js";
import { AppError } from "../../shared/errors/index.js";
import type { SwissSignSignatureProvider } from "./providers/swisssign.provider.js";
import { SwissSignMockProvider } from "./providers/swisssign.mock-provider.js";
import { SwissSignPlaceholderProvider } from "./providers/swisssign.placeholder-provider.js";

let swissSignProvider: SwissSignSignatureProvider | null = null;

export function getSwissSignProvider(): SwissSignSignatureProvider {
  if (swissSignProvider) {
    return swissSignProvider;
  }

  const mode = env().SIGNATURE_PROVIDER_MODE;

  if (mode === "swisssign_mock") {
    const provider = new SwissSignMockProvider();
    swissSignProvider = provider;
    return provider;
  }

  if (mode === "swisssign") {
    const provider = new SwissSignPlaceholderProvider();
    swissSignProvider = provider;
    return provider;
  }

  throw new AppError({
    family: "policy_refusal",
    statusCode: 409,
    code: "SIGNATURE_PROVIDER_DISABLED",
    message: "Signature provider mode is disabled.",
    userMessage: "Provider-backed signature flows are not available in this environment.",
    userAction: "Select a typed or drawn signature to continue.",
  });
}
