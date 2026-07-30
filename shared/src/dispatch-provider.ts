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
  amountCents: z.number().int().nonnegative(),
  source: z.enum(["provider", "swiss_mail"]),
});

const DispatchQuoteObjectSchema = z.object({
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

interface DispatchQuoteFeeShape {
  providerQuotedCents: number;
  swissMailMarkupCents: number;
  totalCents: number;
  lineItems: z.infer<typeof DispatchQuoteLineItemSchema>[];
}

function validateDispatchQuoteFees(
  quote: DispatchQuoteFeeShape,
  ctx: z.RefinementCtx,
): void {
  const providerLineItemTotal = quote.lineItems
    .filter((lineItem) => lineItem.source === "provider")
    .reduce((sum, lineItem) => sum + lineItem.amountCents, 0);
  const swissMailLineItemTotal = quote.lineItems
    .filter((lineItem) => lineItem.source === "swiss_mail")
    .reduce((sum, lineItem) => sum + lineItem.amountCents, 0);
  const lineItemTotal = providerLineItemTotal + swissMailLineItemTotal;

  if (providerLineItemTotal !== quote.providerQuotedCents) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["providerQuotedCents"],
      message: "Provider line items must match providerQuotedCents.",
    });
  }

  if (swissMailLineItemTotal !== quote.swissMailMarkupCents) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["swissMailMarkupCents"],
      message: "Episto line items must match swissMailMarkupCents.",
    });
  }

  if (lineItemTotal !== quote.totalCents) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["lineItems"],
      message: "Dispatch quote line items must sum to totalCents.",
    });
  }

  if (quote.providerQuotedCents + quote.swissMailMarkupCents !== quote.totalCents) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["totalCents"],
      message: "Dispatch quote totalCents must equal provider plus Episto fees.",
    });
  }
}

export function createDispatchQuoteSchema<T extends z.ZodTypeAny>(snapshotIdSchema: T) {
  return DispatchQuoteObjectSchema.extend({ snapshotId: snapshotIdSchema }).superRefine(
    validateDispatchQuoteFees,
  );
}

export const DispatchQuoteSchema = DispatchQuoteObjectSchema.superRefine(
  validateDispatchQuoteFees,
);

export const DispatchSubmitResultSchema = z.object({
  state: DispatchStateSchema,
  providerReference: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  failureReason: z.string().nullable(),
});

export const DispatchStatusLookupSchema = z.object({
  state: DispatchStateSchema,
  providerReference: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  failureReason: z.string().nullable(),
  providerErrorCode: z.string().nullable().optional(),
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
