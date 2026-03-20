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

export type DraftStatusValue =
  (typeof DraftStatus)[keyof typeof DraftStatus];

export type PaymentStateValue =
  (typeof PaymentState)[keyof typeof PaymentState];

export type DispatchStateValue =
  (typeof DispatchState)[keyof typeof DispatchState];

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
