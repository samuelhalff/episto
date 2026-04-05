import { z } from "zod";

import {
  DeliveryTypeSchema,
  DispatchStateSchema,
  LocaleSchema,
} from "./schemas/index.ts";

export const PostalPostageSchema = z.enum([
  "A_POST",
  "B_POST",
  "B_POST_LARGEVOLUME",
  "A_PLUS",
  "REGISTERED",
]);

export const DispatchPartySchema = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  company: z.string().nullable(),
  department: z.string().nullable().optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().nullable().optional(),
  postalCode: z.string().min(1),
  city: z.string().min(1),
  country: z.string().length(2),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
});

export const DispatchFileAssetSchema = z.object({
  fileAssetId: z.string().uuid(),
  filename: z.string().min(1),
  storageKey: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
});

export const DispatchAttachmentPolicySchema = z.object({
  maxAttachmentsPerDraft: z.number().int().positive(),
  allowedMimeTypes: z.array(z.string().min(1)).nonempty(),
});

export const DispatchProviderCapabilitiesSchema = z.object({
  providerName: z.string().min(1),
  attachmentPolicy: DispatchAttachmentPolicySchema,
});

export const DispatchPackageSchema = z.object({
  draftId: z.string().uuid(),
  snapshotId: z.string().uuid(),
  locale: LocaleSchema,
  deliveryType: DeliveryTypeSchema,
  estimatedPages: z.number().int().positive().nullable(),
  sender: DispatchPartySchema,
  recipient: DispatchPartySchema,
  renderedPdf: DispatchFileAssetSchema,
  attachments: z.array(DispatchFileAssetSchema),
});

export const DispatchQuoteLineItemSchema = z.object({
  label: z.string().min(1),
  amountCents: z.number().int(),
  source: z.enum(["provider", "swiss_mail"]),
});

export const DispatchQuoteSchema = z.object({
  draftId: z.string().uuid(),
  snapshotId: z.string().uuid(),
  deliveryType: DeliveryTypeSchema,
  providerQuotedCents: z.number().int().nonnegative(),
  swissMailMarkupCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
  currency: z.literal("CHF"),
  lineItems: z.array(DispatchQuoteLineItemSchema),
  providerQuoteReference: z.string().nullable(),
  attachmentHandling: z.enum(["excluded", "single_hint", "unverified"]),
});

export const DispatchSubmitResultSchema = z.object({
  state: DispatchStateSchema,
  providerReference: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  providerPayload: z.unknown().nullable(),
  failureReason: z.string().nullable(),
});

export const DispatchStatusLookupSchema = z.object({
  state: DispatchStateSchema,
  providerReference: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  providerPayload: z.unknown().nullable(),
  failureReason: z.string().nullable(),
  checkedAt: z.coerce.date(),
});

export type PostalPostage = z.infer<typeof PostalPostageSchema>;
export type DispatchParty = z.infer<typeof DispatchPartySchema>;
export type DispatchFileAsset = z.infer<typeof DispatchFileAssetSchema>;
export type DispatchAttachmentPolicy = z.infer<typeof DispatchAttachmentPolicySchema>;
export type DispatchProviderCapabilities = z.infer<
  typeof DispatchProviderCapabilitiesSchema
>;
export type DispatchPackage = z.infer<typeof DispatchPackageSchema>;
export type DispatchQuoteLineItem = z.infer<typeof DispatchQuoteLineItemSchema>;
export type DispatchQuote = z.infer<typeof DispatchQuoteSchema>;
export type DispatchSubmitResult = z.infer<typeof DispatchSubmitResultSchema>;
export type DispatchStatusLookup = z.infer<typeof DispatchStatusLookupSchema>;
