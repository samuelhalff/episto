import { z } from "zod";
import {
  LocaleSchema,
  DeliveryTypeSchema,
  DispatchStateSchema,
  SignatureAssuranceLevelSchema,
  SwissPostalCodeSchema,
  FileAssetSchema,
  PaymentStateSchema,
} from "../schemas/index.ts";
import {
  DispatchAttachmentPolicySchema,
  DispatchQuoteSchema,
  PostalPostageSchema,
} from "../dispatch-provider.ts";
import { DICTATION_LIMITS, DRAFT_CONTENT_LIMITS } from "../limits.ts";

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
  signatureAssuranceLevel: SignatureAssuranceLevelSchema.optional(),
  enclosureNote: z.string().optional(),
  signatureMode: z.enum(["typed", "drawn"]).nullable().optional(),
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

export const CreateRecipientProfileInput = z
  .object({
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    department: z.string().nullable().optional(),
    addressLine1: z.string().min(1),
    addressLine2: z.string().nullable().optional(),
    postalCode: SwissPostalCodeSchema,
    city: z.string().min(1),
    country: z.string().length(2).default("CH"),
  })
  .superRefine((value, ctx) => {
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
  });

export const SendMessageInput = z.object({
  content: z.string().min(1).max(DRAFT_CONTENT_LIMITS.messageChars),
});

export const DictationFieldContextSchema = z.enum(["entry", "intake", "refinement"]);

export const DictationSessionQuerySchema = z
  .object({
    locale: LocaleSchema,
    fieldContext: DictationFieldContextSchema,
    draftId: z.string().uuid().optional(),
  })
  .strict();

export const DictationLiveClientEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("stop") }).strict(),
]);

export const DictationLiveServerEventSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("ready"),
      sampleRateHz: z.literal(DICTATION_LIMITS.sampleRateHz),
      maxCaptureSeconds: z.literal(DICTATION_LIMITS.maxCaptureSeconds),
    })
    .strict(),
  z
    .object({
      type: z.literal("partial"),
      text: z.string(),
    })
    .strict(),
  z
    .object({
      type: z.literal("final"),
      text: z.string(),
    })
    .strict(),
  z
    .object({
      type: z.literal("error"),
      code: z.string().min(1),
      userMessage: z.string().min(1),
    })
    .strict(),
  z.object({ type: z.literal("stopped") }).strict(),
]);

export const DictationTranscriptionResponseSchema = z
  .object({
    transcript: z.string(),
  })
  .strict();

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

export const AddressSearchQueryInput = z.object({
  query: z.string().trim().min(3).max(160),
});

export const AddressDetailsQueryInput = z.object({
  id: z.string().trim().min(1).max(200),
});

export const AddressSearchResult = z.object({
  id: z.string(),
  label: z.string().min(1),
  primaryText: z.string().min(1),
  secondaryText: z.string().nullable(),
});

export const AddressSearchResponse = z.object({
  results: z.array(AddressSearchResult),
});

export const AddressDetails = z.object({
  id: z.string(),
  label: z.string().min(1),
  addressLine1: z.string().nullable(),
  postalCode: z.string().nullable(),
  city: z.string().nullable(),
});

export const AddressDetailsResponse = z.object({
  address: AddressDetails,
});

// ---------------------------------------------------------------------------
// API response types (what the server sends back)
// ---------------------------------------------------------------------------

export const OrderStatusPaymentSchema = z
  .object({
    state: PaymentStateSchema,
    priceCents: z.number().int().nonnegative(),
    currency: z.literal("CHF"),
    capturedAt: z.string().datetime().nullable(),
    refundedAt: z.string().datetime().nullable(),
  })
  .strict();

export type OrderStatusPayment = z.infer<typeof OrderStatusPaymentSchema>;

export const OrderStatusDispatchSchema = z
  .object({
    state: DispatchStateSchema,
    providerRef: z.string().nullable(),
    providerMode: z.enum(["mock", "live"]).nullable(),
    trackingNumber: z.string().nullable(),
    submittedAt: z.string().datetime().nullable(),
    acceptedAt: z.string().datetime().nullable(),
    rejectedAt: z.string().datetime().nullable(),
    trackingAvailable: z.boolean(),
    lastCheckedAt: z.string().datetime().nullable(),
  })
  .strict();

export type OrderStatusDispatch = z.infer<typeof OrderStatusDispatchSchema>;

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

export const PublicPricingTierSchema = z
  .object({
    totalCents: z.number().int().nonnegative(),
    displayPrice: z.string().min(1),
    currency: z.literal("CHF"),
    providerQuotedCents: z.number().int().nonnegative(),
    providerQuotedDisplayPrice: z.string().min(1),
    swissMailMarkupCents: z.number().int().nonnegative(),
    swissMailMarkupDisplayPrice: z.string().min(1),
  })
  .strict();

export const PublicPricingReferenceScenarioSchema = z
  .object({
    shippingCountry: z.literal("CH"),
    envelopeSize: z.literal("C5"),
    windowLocation: z.literal("RIGHT"),
    duplex: z.literal(false),
    attachmentMode: z.enum(["none", "single_hint"]),
    standardPostage: PostalPostageSchema,
    registeredPostage: PostalPostageSchema,
  })
  .strict();

export const PublicPricingPageCountExampleSchema = z
  .object({
    pageCount: z.number().int().positive(),
    providerQuotedCents: z.number().int().nonnegative(),
    providerQuotedDisplayPrice: z.string().min(1),
    totalCents: z.number().int().nonnegative(),
    displayPrice: z.string().min(1),
    currency: z.literal("CHF"),
  })
  .strict();

export const PublicPricingPageCountExamplesSchema = z
  .object({
    standard: z.array(PublicPricingPageCountExampleSchema).nonempty(),
    registered: z.array(PublicPricingPageCountExampleSchema).nonempty(),
  })
  .strict();

export const PublicPricingSyncSchema = z
  .object({
    sourceLabel: z.string().min(1),
    lastSyncedAt: z.string().datetime(),
    freshness: z.enum(["fresh", "stale"]),
  })
  .strict();

export const PublicPricingResponseSchema = z
  .object({
    standard: PublicPricingTierSchema,
    registered: PublicPricingTierSchema,
    registeredSurchargeCents: z.number().int().nonnegative(),
    registeredSurchargeDisplayPrice: z.string().min(1),
    sync: PublicPricingSyncSchema,
    providerBreakdown: z
      .object({
        providerName: z.string().min(1),
        note: z.string().min(1),
        sourceUrl: z.string().url(),
        verifiedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        referenceScenario: PublicPricingReferenceScenarioSchema,
        pageCountExamples: PublicPricingPageCountExamplesSchema,
        pricesExcludeVat: z.boolean(),
        currency: z.literal("CHF"),
      })
      .strict(),
  })
  .strict();

/** Response shape for GET /api/v1/orders/:orderToken */
export const OrderStatusResponseSchema = z
  .object({
    order: z
      .object({
        draftId: z.string().uuid(),
        orderRef: z.string().min(1),
        locale: LocaleSchema,
        payment: OrderStatusPaymentSchema,
        dispatch: OrderStatusDispatchSchema,
        deliveryType: DeliveryTypeSchema,
        recipientName: z.string(),
        createdAt: z.string().datetime(),
      })
      .strict(),
  })
  .strict();

export type OrderStatusResponse = z.infer<typeof OrderStatusResponseSchema>;

// ---------------------------------------------------------------------------
// Inferred input types
// ---------------------------------------------------------------------------

export type CreateSessionInputType = z.infer<typeof CreateSessionInput>;
export type UpdateDraftInputType = z.infer<typeof UpdateDraftInput>;
export type CreateSenderProfileInputType = z.infer<typeof CreateSenderProfileInput>;
export type CreateRecipientProfileInputType = z.infer<typeof CreateRecipientProfileInput>;
export type SendMessageInputType = z.infer<typeof SendMessageInput>;
export type DictationFieldContext = z.infer<typeof DictationFieldContextSchema>;
export type DictationSessionQuery = z.infer<typeof DictationSessionQuerySchema>;
export type DictationLiveClientEvent = z.infer<typeof DictationLiveClientEventSchema>;
export type DictationLiveServerEvent = z.infer<typeof DictationLiveServerEventSchema>;
export type DictationTranscriptionResponse = z.infer<
  typeof DictationTranscriptionResponseSchema
>;
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
export type AddressSearchQueryInputType = z.infer<typeof AddressSearchQueryInput>;
export type AddressDetailsQueryInputType = z.infer<typeof AddressDetailsQueryInput>;
export type AddressSearchResultType = z.infer<typeof AddressSearchResult>;
export type AddressSearchResponseType = z.infer<typeof AddressSearchResponse>;
export type AddressDetailsType = z.infer<typeof AddressDetails>;
export type AddressDetailsResponseType = z.infer<typeof AddressDetailsResponse>;
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

export interface AdminSearchResultItem {
  kind: "draft" | "session" | "payment_attempt" | "dispatch_attempt";
  id: string;
  label: string;
  matchedOn: string;
  createdAt: string;
  draftId: string | null;
  sessionId: string | null;
}

export interface AdminSearchResponse {
  data: AdminSearchResultItem[];
  hasMore: boolean;
}

export interface AdminSupportEventRecord {
  id: string;
  eventType: string;
  actor: string;
  details: unknown;
  createdAt: string;
}

export interface AdminSessionDetailDraft {
  id: string;
  status: string;
  createdAt: string;
  paymentState: string | null;
  dispatchState: string | null;
}

export interface AdminSessionDetailResponse {
  session: {
    id: string;
    type: string;
    locale: string;
    email: string | null;
    ipAddress: string | null;
    createdAt: string;
    expiresAt: string;
  };
  drafts: AdminSessionDetailDraft[];
  supportEvents: AdminSupportEventRecord[];
}

export interface AdminTimelineEvent {
  id: string;
  eventType: string;
  from: string | null;
  to: string | null;
  actor: "system" | "user" | "admin" | "webhook" | "provider";
  meta: Record<string, unknown> | null;
  occurredAt: string;
}

export interface AdminDraftTimelineResponse {
  draftId: string;
  events: AdminTimelineEvent[];
}

export interface AdminDraftCaseResponse {
  draft: {
    id: string;
    sessionId: string;
    status: string;
    locale: string;
    deliveryType: string;
    createdAt: string;
    updatedAt: string;
    contentRetained: boolean;
    actions: {
      canRefund: boolean;
      canViewContent: boolean;
      canReconcile: boolean;
    };
  };
  session: {
    id: string;
    email: string | null;
    locale: string;
    createdAt: string;
    expiresAt: string;
  };
  payment: {
    id: string;
    state: string;
    amountCents: number;
    currency: string;
    updatedAt: string;
    stripePaymentIntentId: string | null;
  } | null;
  dispatch: {
    id: string;
    state: string;
    providerName: string;
    providerReference: string | null;
    trackingNumber: string | null;
    submittedAt: string | null;
    lastCheckedAt: string | null;
    failureReason: string | null;
  } | null;
}

export type AdminEscalationLevel = "observe" | "review" | "manual_review" | "incident";

export interface AdminSuspiciousCase {
  sessionId: string;
  draftId: string | null;
  email: string | null;
  locale: string;
  latestDraftStatus: string | null;
  categories: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  escalationLevel: AdminEscalationLevel;
  escalationNote: string | null;
  escalationUpdatedAt: string | null;
  signals: {
    failedPayments: number;
    refunds: number;
    rejectedDispatches: number;
    ambiguousDispatches: number;
  };
}

export interface AdminSuspiciousQueueResponse {
  cases: AdminSuspiciousCase[];
  total: number;
  generatedAt: string;
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
