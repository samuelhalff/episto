import { z } from "zod";

import {
  SessionType,
  Locale,
  DraftStatus,
  type DraftStatusValue,
  DeliveryType,
  SignatureFlowMode,
  OrderFulfillmentStatus,
  PaymentState,
  DispatchState,
  FileAssetKind,
  FileStatus,
  MessageRole,
} from "../enums.ts";
import { DRAFT_CONTENT_LIMITS } from "../limits.ts";

// ---------------------------------------------------------------------------
// Enum Zod schemas
// ---------------------------------------------------------------------------

const sessionTypeValues = Object.values(SessionType) as [string, ...string[]];
export const SessionTypeSchema = z.enum(sessionTypeValues);

const localeValues = Object.values(Locale) as [string, ...string[]];
export const LocaleSchema = z.enum(localeValues);

const draftStatusValues = Object.values(DraftStatus) as [
  DraftStatusValue,
  ...DraftStatusValue[],
];
export const DraftStatusSchema = z.enum(draftStatusValues);

const deliveryTypeValues = Object.values(DeliveryType) as [string, ...string[]];
export const DeliveryTypeSchema = z.enum(deliveryTypeValues);

const signatureFlowModeValues = Object.values(SignatureFlowMode) as [string, ...string[]];
export const SignatureFlowModeSchema = z.enum(signatureFlowModeValues);

const orderFulfillmentStatusValues = Object.values(OrderFulfillmentStatus) as [
  string,
  ...string[],
];
export const OrderFulfillmentStatusSchema = z.enum(orderFulfillmentStatusValues);

const paymentStateValues = Object.values(PaymentState) as [string, ...string[]];
export const PaymentStateSchema = z.enum(paymentStateValues);

const dispatchStateValues = Object.values(DispatchState) as [string, ...string[]];
export const DispatchStateSchema = z.enum(dispatchStateValues);

const fileAssetKindValues = Object.values(FileAssetKind) as [string, ...string[]];
export const FileAssetKindSchema = z.enum(fileAssetKindValues);

const fileStatusValues = Object.values(FileStatus) as [string, ...string[]];
export const FileStatusSchema = z.enum(fileStatusValues);

const messageRoleValues = Object.values(MessageRole) as [string, ...string[]];
export const MessageRoleSchema = z.enum(messageRoleValues);

// ---------------------------------------------------------------------------
// Swiss postal code
// ---------------------------------------------------------------------------

export const SwissPostalCodeSchema = z
  .string()
  .regex(/^[0-9]{4}$/, "Swiss postal codes are 4 digits");

function addNameOrCompanyIssue(
  value: {
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
  },
  ctx: z.RefinementCtx,
): void {
  const hasIdentity = [value.company, value.firstName, value.lastName].some(
    (part) => typeof part === "string" && part.trim().length > 0,
  );

  if (!hasIdentity) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["company"],
      message: "Provide a recipient name or company.",
    });
  }
}

// ---------------------------------------------------------------------------
// Address schemas
// ---------------------------------------------------------------------------

export const SenderProfileSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().nullable(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().nullable(),
  postalCode: SwissPostalCodeSchema,
  city: z.string().min(1),
  country: z.string().length(2).default("CH"),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const RecipientProfileSchema = z
  .object({
    id: z.string().uuid(),
    sessionId: z.string().uuid(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    company: z.string().nullable(),
    department: z.string().nullable(),
    addressLine1: z.string().min(1),
    addressLine2: z.string().nullable(),
    postalCode: SwissPostalCodeSchema,
    city: z.string().min(1),
    country: z.string().length(2).default("CH"),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  })
  .superRefine(addNameOrCompanyIssue);

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export const SessionSchema = z.object({
  id: z.string().uuid(),
  type: SessionTypeSchema,
  email: z.string().email().nullable(),
  locale: LocaleSchema,
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// ---------------------------------------------------------------------------
// Draft Letter
// ---------------------------------------------------------------------------

export const DraftLetterSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  status: DraftStatusSchema,
  locale: LocaleSchema,
  deliveryType: DeliveryTypeSchema,
  signatureFlowMode: SignatureFlowModeSchema.default("visual"),
  fulfillmentStatus: OrderFulfillmentStatusSchema.default("draft_created"),
  subject: z.string().max(DRAFT_CONTENT_LIMITS.subjectChars).nullable(),
  body: z.string().max(DRAFT_CONTENT_LIMITS.bodyChars).nullable(),
  tone: z.string().nullable(),
  intent: z.string().nullable(),
  enclosureNote: z.string().nullable(),
  signatureMode: z.enum(["typed", "drawn"]).nullable(),
  schemaVersion: z.number().int().default(1),
  senderProfileId: z.string().uuid().nullable(),
  recipientProfileId: z.string().uuid().nullable(),
  signatureAssetId: z.string().uuid().nullable(),
  estimatedPages: z.number().int().nullable(),
  reviewedAt: z.coerce.date().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// ---------------------------------------------------------------------------
// Snapshot data shape (JSONB)
// ---------------------------------------------------------------------------

export const SnapshotSenderSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  company: z.string().nullable(),
  addressLine1: z.string(),
  addressLine2: z.string().nullable(),
  postalCode: z.string(),
  city: z.string(),
  country: z.string(),
});

export const SnapshotRecipientSchema = z
  .object({
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    company: z.string().nullable(),
    department: z.string().nullable(),
    addressLine1: z.string(),
    addressLine2: z.string().nullable(),
    postalCode: z.string(),
    city: z.string(),
    country: z.string(),
  })
  .superRefine(addNameOrCompanyIssue);

export const SnapshotDataSchema = z.object({
  schemaVersion: z.number().int(),
  locale: LocaleSchema,
  deliveryType: DeliveryTypeSchema,
  signatureFlowMode: SignatureFlowModeSchema.default("visual"),
  subject: z.string().max(DRAFT_CONTENT_LIMITS.subjectChars).nullable(),
  body: z.string().max(DRAFT_CONTENT_LIMITS.bodyChars).nullable(),
  enclosureNote: z.string().nullable(),
  signatureMode: z.enum(["typed", "drawn"]).nullable(),
  tone: z.string().nullable(),
  intent: z.string().nullable(),
  sender: SnapshotSenderSchema,
  recipient: SnapshotRecipientSchema,
  attachmentAssetIds: z.array(z.string().uuid()),
  signatureAssetId: z.string().uuid().nullable(),
  estimatedPages: z.number().int().nullable().optional().default(null),
  metadata: z.record(z.unknown()).nullable(),
});

// ---------------------------------------------------------------------------
// Draft Snapshot
// ---------------------------------------------------------------------------

export const DraftSnapshotSchema = z.object({
  id: z.string().uuid(),
  draftId: z.string().uuid(),
  version: z.number().int(),
  schemaVersion: z.number().int().default(1),
  snapshotData: SnapshotDataSchema,
  renderedPdfAssetId: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
});

// ---------------------------------------------------------------------------
// File Asset
// ---------------------------------------------------------------------------

export const FileAssetSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  draftId: z.string().uuid().nullable(),
  kind: FileAssetKindSchema,
  storageKey: z.string(),
  originalFilename: z.string().nullable(),
  mimeType: z.string(),
  sizeBytes: z.number().int(),
  sortOrder: z.number().int().nullable(),
  status: FileStatusSchema,
  extractionStatus: z
    .enum([
      "pending",
      "ocr_running",
      "extracted",
      "empty",
      "unsupported",
      "no_ocr",
      "too_long",
      "budget",
      "failed",
    ])
    .nullable()
    .optional(),
  deletedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});

// ---------------------------------------------------------------------------
// Conversation Message
// ---------------------------------------------------------------------------

export const ConversationMessageSchema = z.object({
  id: z.string().uuid(),
  draftId: z.string().uuid(),
  role: MessageRoleSchema,
  content: z.string(),
  toolCalls: z.unknown().nullable(),
  createdAt: z.coerce.date(),
});

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------

export const PaymentBreakdownSchema = z.object({
  deliveryType: DeliveryTypeSchema,
  providerQuotedCents: z.number().int().nonnegative(),
  swissMailMarkupCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
  providerQuoteReference: z.string().nullable(),
  attachmentHandling: z.enum(["excluded", "single_hint", "unverified"]),
  lineItems: z.array(
    z.object({
      label: z.string().min(1),
      amountCents: z.number().int().nonnegative(),
      source: z.enum(["provider", "swiss_mail"]),
    }),
  ),
  // Present when a promo code reduced the price (audit trail).
  promo: z
    .object({
      code: z.string().min(1),
      kind: z.enum(["free", "percent", "fixed"]),
      discountCents: z.number().int().nonnegative(),
    })
    .nullish(),
});

export const PaymentAttemptSchema = z.object({
  id: z.string().uuid(),
  draftId: z.string().uuid(),
  sessionId: z.string().uuid(),
  state: PaymentStateSchema,
  stripePaymentIntentId: z.string().nullable(),
  stripeChargeId: z.string().nullable(),
  amountCents: z.number().int().nonnegative(),
  currency: z.literal("CHF"),
  breakdown: PaymentBreakdownSchema,
  failureReason: z.string().nullable(),
  refundReason: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

export const DispatchAttemptSchema = z.object({
  id: z.string().uuid(),
  draftId: z.string().uuid(),
  snapshotId: z.string().uuid(),
  paymentAttemptId: z.string().uuid().nullable(),
  state: DispatchStateSchema,
  providerName: z.string(),
  providerReference: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  submittedAt: z.coerce.date().nullable(),
  lastCheckedAt: z.coerce.date().nullable(),
  failureReason: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const DispatchStatusEventSchema = z.object({
  id: z.string().uuid(),
  dispatchAttemptId: z.string().uuid(),
  previousState: DispatchStateSchema.nullable(),
  newState: DispatchStateSchema,
  source: z.enum(["webhook", "polling", "manual", "system"]),
  createdAt: z.coerce.date(),
});

// ---------------------------------------------------------------------------
// Support Event
// ---------------------------------------------------------------------------

export const SupportEventSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid().nullable(),
  draftId: z.string().uuid().nullable(),
  eventType: z.string(),
  actor: z.string(),
  details: z.unknown().nullable(),
  createdAt: z.coerce.date(),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type Session = z.infer<typeof SessionSchema>;
export type DraftLetter = z.infer<typeof DraftLetterSchema>;
export type DraftSnapshot = z.infer<typeof DraftSnapshotSchema>;
export type SnapshotData = z.infer<typeof SnapshotDataSchema>;
export type SnapshotSender = z.infer<typeof SnapshotSenderSchema>;
export type SnapshotRecipient = z.infer<typeof SnapshotRecipientSchema>;
export type SenderProfile = z.infer<typeof SenderProfileSchema>;
export type RecipientProfile = z.infer<typeof RecipientProfileSchema>;
export type FileAsset = z.infer<typeof FileAssetSchema>;
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;
export type PaymentAttempt = z.infer<typeof PaymentAttemptSchema>;
export type PaymentBreakdown = z.infer<typeof PaymentBreakdownSchema>;
export type DispatchAttempt = z.infer<typeof DispatchAttemptSchema>;
export type DispatchStatusEvent = z.infer<typeof DispatchStatusEventSchema>;
export type SupportEvent = z.infer<typeof SupportEventSchema>;
