import { z } from "zod";

import {
  LocaleSchema,
  DeliveryTypeSchema,
  SwissPostalCodeSchema,
} from "../schemas/index.ts";
import { DRAFT_CONTENT_LIMITS } from "../limits.ts";

// ---------------------------------------------------------------------------
// API input schemas (what the client sends)
// ---------------------------------------------------------------------------

export const CreateSessionInput = z.object({
  locale: LocaleSchema.optional(),
});

export const UpdateDraftInput = z.object({
  subject: z.string().max(DRAFT_CONTENT_LIMITS.subjectChars).optional(),
  body: z.string().max(DRAFT_CONTENT_LIMITS.bodyChars).optional(),
  tone: z.string().optional(),
  intent: z.string().optional(),
  deliveryType: DeliveryTypeSchema.optional(),
  enclosureNote: z.string().optional(),
  signatureMode: z.enum(["typed", "image"]).nullable().optional(),
  senderProfileId: z.string().uuid().nullable().optional(),
  recipientProfileId: z.string().uuid().nullable().optional(),
  signatureAssetId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const CreateSenderProfileInput = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().nullable().optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().nullable().optional(),
  postalCode: SwissPostalCodeSchema,
  city: z.string().min(1),
  country: z.string().length(2).default("CH"),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
});

export const CreateRecipientProfileInput = z.object({
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().nullable().optional(),
  postalCode: SwissPostalCodeSchema,
  city: z.string().min(1),
  country: z.string().length(2).default("CH"),
});

export const SendMessageInput = z.object({
  content: z.string().min(1).max(DRAFT_CONTENT_LIMITS.messageChars),
});

export const RecipientCompanySearchQueryInput = z.object({
  query: z.string().trim().min(2).max(120),
});

export const RecipientCompanyDetailsQueryInput = z.object({
  id: z.string().trim().min(1).max(160),
});

export const RecipientCompanySearchResult = z.object({
  id: z.string(),
  name: z.string().min(1),
  registryUid: z.string().nullable(),
  registryChid: z.string().nullable(),
  registryId: z.string().nullable(),
  registryStatus: z.string().nullable(),
  legalSeat: z.string().nullable(),
  source: z.literal("zefix"),
});

export const RecipientCompanySearchResponse = z.object({
  results: z.array(RecipientCompanySearchResult),
});

export const RecipientCompanyDetails = z.object({
  id: z.string(),
  name: z.string().min(1),
  addressLine1: z.string().nullable(),
  postalCode: z.string().nullable(),
  city: z.string().nullable(),
  source: z.literal("zefix"),
});

export const RecipientCompanyDetailsResponse = z.object({
  company: RecipientCompanyDetails,
});

// ---------------------------------------------------------------------------
// API response types (what the server sends back)
// ---------------------------------------------------------------------------

export interface OrderStatusPayment {
  state: string;
  priceCents: number;
  currency: string;
  capturedAt: string | null;
  refundedAt: string | null;
}

export interface OrderStatusDispatch {
  state: string;
  providerRef: string | null;
  submittedAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  trackingAvailable: boolean;
  lastCheckedAt: string | null;
}

/** Response shape for GET /api/v1/orders/:orderToken */
export interface OrderStatusResponse {
  order: {
    draftId: string;
    orderRef: string;
    locale: string;
    payment: OrderStatusPayment;
    dispatch: OrderStatusDispatch;
    deliveryType: string;
    recipientName: string;
    createdAt: string;
  };
}

// ---------------------------------------------------------------------------
// Inferred input types
// ---------------------------------------------------------------------------

export type CreateSessionInputType = z.infer<typeof CreateSessionInput>;
export type UpdateDraftInputType = z.infer<typeof UpdateDraftInput>;
export type CreateSenderProfileInputType = z.infer<typeof CreateSenderProfileInput>;
export type CreateRecipientProfileInputType = z.infer<typeof CreateRecipientProfileInput>;
export type SendMessageInputType = z.infer<typeof SendMessageInput>;
export type RecipientCompanySearchQueryInputType = z.infer<typeof RecipientCompanySearchQueryInput>;
export type RecipientCompanyDetailsQueryInputType = z.infer<typeof RecipientCompanyDetailsQueryInput>;
export type RecipientCompanySearchResultType = z.infer<typeof RecipientCompanySearchResult>;
export type RecipientCompanySearchResponseType = z.infer<typeof RecipientCompanySearchResponse>;
export type RecipientCompanyDetailsType = z.infer<typeof RecipientCompanyDetails>;
export type RecipientCompanyDetailsResponseType = z.infer<typeof RecipientCompanyDetailsResponse>;
