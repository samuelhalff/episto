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
