export const SessionType = {
  guest: "guest",
} as const;

export const Locale = {
  de_CH: "de-CH",
  fr_CH: "fr-CH",
  it_CH: "it-CH",
  en_CH: "en-CH",
} as const;

export const DraftStatus = {
  collecting: "collecting",
  fields_complete: "fields_complete",
  reviewed: "reviewed",
  rendering: "rendering",
  ready: "ready",
  ready_to_sign: "ready_to_sign",
  submitted: "submitted",
  dispatched: "dispatched",
  closed: "closed",
} as const;

export type DraftStatusValue = (typeof DraftStatus)[keyof typeof DraftStatus];

export type PaymentStateValue = (typeof PaymentState)[keyof typeof PaymentState];

export type DispatchStateValue = (typeof DispatchState)[keyof typeof DispatchState];

export const DeliveryType = {
  standard: "standard",
  registered: "registered",
} as const;

export const PaymentState = {
  pending: "pending",
  authorized: "authorized",
  captured: "captured",
  failed: "failed",
  cancelled: "cancelled",
  refund_pending: "refund_pending",
  refunded: "refunded",
  partially_refunded: "partially_refunded",
} as const;

export const DispatchState = {
  queued: "queued",
  submitted: "submitted",
  accepted: "accepted",
  rejected: "rejected",
  unknown: "unknown",
  reconciled: "reconciled",
} as const;

export const FileAssetKind = {
  attachment: "attachment",
  signature: "signature",
  rendered_pdf: "rendered_pdf",
  signed_pdf: "signed_pdf",
} as const;

export const FileStatus = {
  active: "active",
  pending_deletion: "pending_deletion",
  deleted: "deleted",
} as const;

export const MessageRole = {
  user: "user",
  assistant: "assistant",
  system: "system",
} as const;

// ---------------------------------------------------------------------------
// Signature assurance (see docs/04-product/qualified-signatures.md)
// ---------------------------------------------------------------------------

export const SignatureAssuranceLevel = {
  visual: "visual",
  advanced: "advanced",
  qualified: "qualified",
} as const;

export type SignatureAssuranceLevelValue =
  (typeof SignatureAssuranceLevel)[keyof typeof SignatureAssuranceLevel];

export const SigningProvider = {
  none: "none",
  mock: "mock",
  swisssign: "swisssign",
  swisssign_mock: "swisssign_mock",
  platform_aes: "platform_aes",
  skribble: "skribble",
  swisscom_ais: "swisscom_ais",
} as const;

export type SigningProviderValue = (typeof SigningProvider)[keyof typeof SigningProvider];

export const IdentVerificationMethod = {
  none: "none",
  email_sms_otp: "email_sms_otp",
  video_ident: "video_ident",
  bank_ident: "bank_ident",
  in_person: "in_person",
} as const;

export type IdentVerificationMethodValue =
  (typeof IdentVerificationMethod)[keyof typeof IdentVerificationMethod];

export const SigningState = {
  not_required: "not_required",
  pending_ident: "pending_ident",
  ident_in_progress: "ident_in_progress",
  ident_verified: "ident_verified",
  awaiting_signature: "awaiting_signature",
  signed: "signed",
  failed: "failed",
  expired: "expired",
  cancelled: "cancelled",
} as const;

export type SigningStateValue = (typeof SigningState)[keyof typeof SigningState];

export const SignatureJurisdiction = {
  zertes_ch: "zertes_ch",
  eidas_eu: "eidas_eu",
} as const;

export type SignatureJurisdictionValue =
  (typeof SignatureJurisdiction)[keyof typeof SignatureJurisdiction];

// ---------------------------------------------------------------------------
// Signature orchestration
// ---------------------------------------------------------------------------

export const SignatureFlowMode = {
  none: "none",
  visual: "visual",
  swisssign_ses: "swisssign_ses",
  swisssign_qes: "swisssign_qes",
} as const;

export type SignatureFlowModeValue =
  (typeof SignatureFlowMode)[keyof typeof SignatureFlowMode];

export const SignatureEligibilityStatus = {
  not_started: "not_started",
  checking: "checking",
  eligible: "eligible",
  conditionally_eligible: "conditionally_eligible",
  blocked: "blocked",
} as const;

export type SignatureEligibilityStatusValue =
  (typeof SignatureEligibilityStatus)[keyof typeof SignatureEligibilityStatus];

export const SignatureEligibilityReason = {
  swissid_required: "swissid_required",
  signing_stepup_required: "signing_stepup_required",
  swisssign_wallet_required: "swisssign_wallet_required",
  biometric_device_required: "biometric_device_required",
  identity_verification_required: "identity_verification_required",
  provider_unavailable: "provider_unavailable",
  unsupported_device: "unsupported_device",
} as const;

export type SignatureEligibilityReasonValue =
  (typeof SignatureEligibilityReason)[keyof typeof SignatureEligibilityReason];

export const SignatureSessionStatus = {
  not_required: "not_required",
  eligibility_pending: "eligibility_pending",
  eligibility_confirmed: "eligibility_confirmed",
  payment_authorized: "payment_authorized",
  identity_stepup_started: "identity_stepup_started",
  signature_session_created: "signature_session_created",
  signature_in_progress: "signature_in_progress",
  signature_completed: "signature_completed",
  signed_document_attached: "signed_document_attached",
  failed: "failed",
  expired: "expired",
  cancelled: "cancelled",
} as const;

export type SignatureSessionStatusValue =
  (typeof SignatureSessionStatus)[keyof typeof SignatureSessionStatus];

export const OrderFulfillmentStatus = {
  draft_created: "draft_created",
  draft_completed: "draft_completed",
  preview_ready: "preview_ready",
  signature_not_required: "signature_not_required",
  signature_selected: "signature_selected",
  signature_eligibility_confirmed: "signature_eligibility_confirmed",
  payment_authorized: "payment_authorized",
  identity_stepup_started: "identity_stepup_started",
  signature_session_created: "signature_session_created",
  signature_in_progress: "signature_in_progress",
  signature_completed: "signature_completed",
  signed_document_attached: "signed_document_attached",
  dispatch_submitted: "dispatch_submitted",
  payment_captured: "payment_captured",
  dispatch_confirmed: "dispatch_confirmed",
  completed: "completed",
  failed: "failed",
  expired: "expired",
} as const;

export type OrderFulfillmentStatusValue =
  (typeof OrderFulfillmentStatus)[keyof typeof OrderFulfillmentStatus];
