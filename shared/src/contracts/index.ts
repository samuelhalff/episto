import { z } from "zod";

import {
  LocaleSchema,
  DeliveryTypeSchema,
  SwissPostalCodeSchema,
  FileAssetSchema,
} from "../schemas/index.ts";
import {
  DispatchAttachmentPolicySchema,
  DispatchQuoteSchema,
  PostalPostageSchema,
} from "../dispatch-provider.ts";
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
  trackingNumber: string | null;
  submittedAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  trackingAvailable: boolean;
  lastCheckedAt: string | null;
}

export interface DraftDispatchQuoteLineItem {
  label: string;
  amountCents: number;
  source: "provider" | "swiss_mail";
}

export interface DraftDispatchQuote {
  draftId: string;
  snapshotId: string;
  deliveryType: string;
  providerQuotedCents: number;
  swissMailMarkupCents: number;
  totalCents: number;
  currency: "CHF";
  providerQuoteReference: string | null;
  attachmentHandling: "excluded" | "single_hint" | "unverified";
  lineItems: DraftDispatchQuoteLineItem[];
}

export const DraftDispatchQuoteMetaSchema = z.object({
  source: z.enum(["matrix", "live"]),
  quotedAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable(),
});

export const DraftDispatchQuoteResponseSchema = z.object({
  quote: DispatchQuoteSchema,
  meta: DraftDispatchQuoteMetaSchema,
});

export type DraftDispatchQuoteResponse = z.infer<typeof DraftDispatchQuoteResponseSchema>;

export const DraftAttachmentConstraintsSchema = DispatchAttachmentPolicySchema.extend({
  maxFileBytes: z.number().int().positive(),
  maxTotalBytes: z.number().int().positive(),
});

export const DraftFilesResponseSchema = z.object({
  files: z.array(FileAssetSchema),
  attachmentConstraints: DraftAttachmentConstraintsSchema,
});

export const PublicPricingTierSchema = z.object({
  totalCents: z.number().int().nonnegative(),
  displayPrice: z.string().min(1),
  currency: z.literal("CHF"),
  providerQuotedCents: z.number().int().nonnegative(),
  providerQuotedDisplayPrice: z.string().min(1),
  swissMailMarkupCents: z.number().int().nonnegative(),
  swissMailMarkupDisplayPrice: z.string().min(1),
});

export const PublicPricingReferenceScenarioSchema = z.object({
  shippingCountry: z.literal("CH"),
  envelopeSize: z.literal("C5"),
  windowLocation: z.literal("LEFT"),
  duplex: z.literal(false),
  attachmentMode: z.enum(["none", "single_hint"]),
  standardPostage: PostalPostageSchema,
  registeredPostage: PostalPostageSchema,
});

export const PublicPricingPageCountExampleSchema = z.object({
  pageCount: z.number().int().positive(),
  providerQuotedCents: z.number().int().nonnegative(),
  providerQuotedDisplayPrice: z.string().min(1),
  totalCents: z.number().int().nonnegative(),
  displayPrice: z.string().min(1),
  currency: z.literal("CHF"),
});

export const PublicPricingPageCountExamplesSchema = z.object({
  standard: z.array(PublicPricingPageCountExampleSchema).nonempty(),
  registered: z.array(PublicPricingPageCountExampleSchema).nonempty(),
});

export const PublicPricingSyncSchema = z.object({
  sourceLabel: z.string().min(1),
  lastSyncedAt: z.string().datetime(),
  freshness: z.enum(["fresh", "stale"]),
});

export const PublicPricingResponseSchema = z.object({
  standard: PublicPricingTierSchema,
  registered: PublicPricingTierSchema,
  registeredSurchargeCents: z.number().int().nonnegative(),
  registeredSurchargeDisplayPrice: z.string().min(1),
  sync: PublicPricingSyncSchema,
  providerBreakdown: z.object({
    providerName: z.string().min(1),
    note: z.string().min(1),
    sourceUrl: z.string().url(),
    verifiedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    referenceScenario: PublicPricingReferenceScenarioSchema,
    pageCountExamples: PublicPricingPageCountExamplesSchema,
    pricesExcludeVat: z.boolean(),
    currency: z.literal("CHF"),
  }),
});

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
export type RecipientCompanySearchQueryInputType = z.infer<
  typeof RecipientCompanySearchQueryInput
>;
export type RecipientCompanyDetailsQueryInputType = z.infer<
  typeof RecipientCompanyDetailsQueryInput
>;
export type RecipientCompanySearchResultType = z.infer<
  typeof RecipientCompanySearchResult
>;
export type RecipientCompanySearchResponseType = z.infer<
  typeof RecipientCompanySearchResponse
>;
export type RecipientCompanyDetailsType = z.infer<typeof RecipientCompanyDetails>;
export type RecipientCompanyDetailsResponseType = z.infer<
  typeof RecipientCompanyDetailsResponse
>;
export type DraftAttachmentConstraints = z.infer<typeof DraftAttachmentConstraintsSchema>;
export type DraftFilesResponse = z.infer<typeof DraftFilesResponseSchema>;
export type PublicPricingTier = z.infer<typeof PublicPricingTierSchema>;
export type PublicPricingReferenceScenario = z.infer<
  typeof PublicPricingReferenceScenarioSchema
>;
export type PublicPricingPageCountExample = z.infer<
  typeof PublicPricingPageCountExampleSchema
>;
export type PublicPricingPageCountExamples = z.infer<
  typeof PublicPricingPageCountExamplesSchema
>;
export type PublicPricingSync = z.infer<typeof PublicPricingSyncSchema>;
export type PublicPricingResponse = z.infer<typeof PublicPricingResponseSchema>;

// ---------------------------------------------------------------------------
// Admin dashboard contracts
// ---------------------------------------------------------------------------

export interface AdminSummaryResponse {
  activeSessions: number;
  lettersSent: number;
  revenueCents: number;
  errorRate: number;
  periodLabel: string;
  generatedAt: string;
}

export interface AdminActiveResponse {
  total: number;
  byStage: {
    browsing: number;
    drafting: number;
    review: number;
    checkout: number;
    confirmation: number;
  };
  generatedAt: string;
}

export interface AdminFunnelStep {
  stage: string;
  count: number;
  dropOffPercent: number | null;
}

export interface AdminFunnelResponse {
  steps: AdminFunnelStep[];
  overallConversionPercent: number;
  byLocale: Record<string, number>;
  periodLabel: string;
  generatedAt: string;
}

export interface AdminErrorEntry {
  errorFamily: string;
  count: number;
  affectedSessions: number;
}

export interface AdminErrorsResponse {
  entries: AdminErrorEntry[];
  totalErrors: number;
  periodLabel: string;
  generatedAt: string;
}

export interface AdminLocaleEntry {
  locale: string;
  count: number;
  percent: number;
}

export interface AdminLocaleResponse {
  entries: AdminLocaleEntry[];
  generatedAt: string;
}

export interface AdminAiResponse {
  avgLatencyMs: number;
  refusalRate: number;
  regenerationRate: number;
  totalRequests: number;
  periodLabel: string;
  generatedAt: string;
}

export interface AdminSessionListItem {
  id: string;
  locale: string | null;
  email: string | null;
  createdAt: string;
  lastActivityAt: string | null;
  draftCount: number;
  latestDraftStatus: string | null;
  paymentState: string | null;
}

export interface AdminSessionListResponse {
  sessions: AdminSessionListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminRetentionInfo {
  contentRetentionDays: number;
  sessionTtlHours: number;
  pdfRetentionHours: number;
  auditRetentionDays: number;
  recentCleanups: Array<{
    type: string;
    count: number;
    ranAt: string;
  }>;
  pendingExpirations: {
    expiredSessions: number;
    expiredContent: number;
    expiredPdfs: number;
  };
  generatedAt: string;
}
