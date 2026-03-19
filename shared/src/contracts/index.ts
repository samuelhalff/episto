import { z } from "zod";

import {
  LocaleSchema,
  DeliveryTypeSchema,
  SwissPostalCodeSchema,
} from "../schemas/index.js";

// ---------------------------------------------------------------------------
// API input schemas (what the client sends)
// ---------------------------------------------------------------------------

export const CreateSessionInput = z.object({
  locale: LocaleSchema.optional(),
});

export const UpdateDraftInput = z.object({
  subject: z.string().max(200).optional(),
  body: z.string().max(10000).optional(),
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
  content: z.string().min(1).max(2000),
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
