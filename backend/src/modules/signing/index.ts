// Phase 0 seam: taxonomy and adapter contract only. No routes, no services.
// See docs/04-product/qualified-signatures.md for the phased rollout.

export { getSigningAdapter, setSigningAdapter } from "./adapters/signing.adapter.js";
export type {
  SigningAdapter,
  SigningAdapterCapabilities,
  SignerIdentity,
  IdentVerificationRequest,
  IdentVerificationSession,
  IdentVerificationResult,
  SigningRequest,
  SigningSessionHandle,
  SignedArtifact,
} from "./adapters/signing.adapter.js";
