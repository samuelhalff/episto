# API Contracts

**Status:** Authoritative reference  
**Resolves:** GAP-6 (API contract specification)
**Scope:** Public app endpoints, admin endpoints, webhook boundaries, SSE streams, and canonical
request/response shapes. Internal provider payloads and adapter internals are out of scope here.
**See also:** [`../08-guardrails/swiss-post-api-reference-map.md`](../08-guardrails/swiss-post-api-reference-map.md), [`../08-guardrails/provider-certainties.md`](../08-guardrails/provider-certainties.md)

---

## 1. API Conventions

### Base URL
```
/api/v1
```

### Content-Type
All requests and responses use `application/json` unless noted otherwise (file upload uses `multipart/form-data`, Stripe webhook uses raw body, SSE streams `text/event-stream`).

### Authentication
Session cookie: `HttpOnly`, `Secure`, `SameSite=Lax`. Guest sessions are created automatically on first visit. No bearer token or API key is used for client-facing endpoints.

### CSRF Protection
All mutating requests (`POST`, `PATCH`, `PUT`, `DELETE`) must include:
```
X-Requested-With: XMLHttpRequest
```

### Error Envelope

Canonical source: [`error-taxonomy.md`](error-taxonomy.md). All backend error responses use this
single shape — do not define a second error format:

```ts
// shared/errors.ts — canonical definition
type ErrorResponse = {
  error: {
    code: string;               // machine-readable, snake_case (e.g. 'validation_error')
    family: ErrorFamily;        // one of the canonical families from error-taxonomy.md
    message: string;            // human-readable; safe for dev logs
    userMessage: string;        // localized, safe to display to end users
    userAction: string | null;  // what the user can do next; null if no action available
    fields?: Array<{            // present only for validation_error
      field: string;
      message: string;
    }>;
    requestId?: string;         // trace ID for support
  };
};
```

### Pagination (cursor-based)
```ts
type PaginatedResponse<T> = {
  data: T[];
  cursor?: string;   // opaque cursor; omit on first page
  hasMore: boolean;
};
```

### Timestamps
ISO 8601 UTC. Example: `"2025-06-01T14:30:00.000Z"`

### IDs
UUID v7 strings.

### Body content
The `body` field on drafts contains **HTML content** (controlled subset — no arbitrary tags). It is
stored as `body text` in the database and serialized as `body: string` in API responses. It is NOT
called `bodyHtml` — the field name is `body` everywhere (DB, entity, API). The HTML is rendered to
PDF by Puppeteer using the shared letter template.

### Monetary Amounts
Integer cents (CHF). Example: `4900` = CHF 49.00. Display formatting is the frontend's responsibility.

---

## 2. Zod Schema Conventions

```ts
import { z } from "zod";

// Shared primitives
const UuidSchema = z.string().uuid();
const TimestampSchema = z.string().datetime();
const LocaleSchema = z.enum(["de-CH", "fr-CH", "it-CH", "en-CH"]);
const DeliveryTypeSchema = z.enum(["standard", "registered"]);
const PaymentStateSchema = z.enum([
  "pending", "authorized", "captured", "failed",
  "cancelled", "refund_pending", "refunded", "partially_refunded",
]);
const DispatchStateSchema = z.enum([
  "queued", "submitted", "accepted",
  "rejected", "unknown", "reconciled",
]);
const FileAssetKindSchema = z.enum(["attachment", "signature", "rendered_pdf"]);
const SessionTypeSchema = z.enum(["guest"]);
```

---

## 3. Endpoints

### 3.1 Sessions

#### `POST /api/v1/sessions`
Create a new guest session. Sets the session cookie. No body required. Safe to call on cold start before any user action.

**Request body:** none

**Response `200 OK`:**
```ts
const CreateSessionResponse = z.object({
  session: z.object({
    id: UuidSchema,
    type: SessionTypeSchema,
    locale: LocaleSchema.nullable(),
    email: z.string().email().nullable(),
    createdAt: TimestampSchema,
    expiresAt: TimestampSchema,
  }),
});
```

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `RATE_LIMITED` | 429 | Too many session creations from this IP |

**Rate limit:** 10 req/IP/hour

---

#### `GET /api/v1/sessions/current`
Return the current session for the attached cookie.

**Request body:** none

**Response `200 OK`:**
```ts
const GetSessionResponse = z.object({
  session: z.object({
    id: UuidSchema,
    type: SessionTypeSchema,
    locale: LocaleSchema.nullable(),
    email: z.string().email().nullable(),
    createdAt: TimestampSchema,
    expiresAt: TimestampSchema,
    draftCount: z.number().int().nonnegative(),
  }),
});
```

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `SESSION_REQUIRED` | 401 | No cookie or session expired |

**Rate limit:** 60 req/session/min

---

#### `PATCH /api/v1/sessions/current`
Update mutable session fields (locale, email). Partial update; omit fields to leave them unchanged.

**Request body:**
```ts
const PatchSessionBody = z.object({
  locale: LocaleSchema.optional(),
  email: z.string().email().max(254).optional(),
});
```

**Response `200 OK`:**
```ts
const PatchSessionResponse = z.object({
  session: z.object({
    id: UuidSchema,
    type: SessionTypeSchema,
    locale: LocaleSchema.nullable(),
    email: z.string().email().nullable(),
    updatedAt: TimestampSchema,
  }),
});
```

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `SESSION_REQUIRED` | 401 | No valid session |
| `VALIDATION_ERROR` | 400 | Invalid locale or malformed email |

**Rate limit:** 20 req/session/min

---

#### `GET /api/v1/resume/:token`
Validate a resume token (from email link), set session cookie, return redirect URL.

**Path params:** `token` — opaque resume token (min 32 chars)

**Request body:** none

**Response `200 OK`:**
```ts
const ResumeTokenResponse = z.object({
  redirectUrl: z.string(), // e.g. "/draft/:id" or "/status/:orderToken"
  sessionId: UuidSchema,
});
```
Sets session cookie on success. If the resumed draft has already been paid and an order-access token
exists, `redirectUrl` points to `/status/:orderToken` rather than reopening editing.

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `NOT_FOUND` | 404 | Token not found or expired |
| `RATE_LIMITED` | 429 | Too many resume attempts from this IP |

**Rate limit:** 20 req/IP/hour

---

### 3.2 Drafts

#### `POST /api/v1/drafts`
Create a new draft letter scoped to the current session.

**Request body:**
```ts
const CreateDraftBody = z.object({
  locale: LocaleSchema,
  intent: z.string().max(500).optional(),      // free-text intent hint for AI
  deliveryType: DeliveryTypeSchema.optional(), // defaults to "standard"
});
```

**Response `201 Created`:**
```ts
const DraftStatusSchema = z.enum([
  "collecting", "fields_complete", "reviewed",
  "rendering", "ready", "submitted", "dispatched", "closed",
]);

const DraftSummary = z.object({
  id: UuidSchema,
  sessionId: UuidSchema,
  status: DraftStatusSchema,                           // ← DraftLetter.status (primary state)
  locale: LocaleSchema,
  deliveryType: DeliveryTypeSchema,
  dispatchState: DispatchStateSchema.nullable(),       // null if no dispatch attempt exists yet
  paymentState: PaymentStateSchema.nullable(),         // null if no payment attempt exists yet
  subject: z.string().nullable(),
  body: z.string().nullable(),                         // stored as `body` in DB; HTML content for rendering
  enclosureNote: z.string().nullable(),
  signatureMode: z.enum(["typed", "image"]).nullable(),
  schemaVersion: z.number().int().positive(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  reviewedAt: TimestampSchema.nullable(),
  sender: SenderProfileSchema.nullable(),
  recipient: RecipientProfileSchema.nullable(),
  fileCount: z.number().int().nonnegative(),
});

const CreateDraftResponse = z.object({ draft: DraftSummary });
```

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `SESSION_REQUIRED` | 401 | No valid session |
| `VALIDATION_ERROR` | 400 | Invalid locale or deliveryType |
| `RATE_LIMITED` | 429 | Too many drafts created |

**Rate limit:** 20 drafts/session/day

---

#### `GET /api/v1/drafts/:id`
Fetch a draft with full current state, sender/recipient profiles, and file asset summary.

**Path params:** `id` — draft UUID

**Response `200 OK`:**
```ts
const GetDraftResponse = z.object({
  draft: DraftSummary.extend({
    conversationMessageCount: z.number().int().nonnegative(),
    latestSnapshotId: UuidSchema.nullable(),
  }),
});
```

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `SESSION_REQUIRED` | 401 | No valid session |
| `NOT_FOUND` | 404 | Draft doesn't exist or belongs to another session |

**Rate limit:** 120 req/session/min

---

#### `PATCH /api/v1/drafts/:id`
Partial update of draft fields. Cannot update a draft that has already been submitted.

**Request body:**
```ts
const PatchDraftBody = z.object({
  locale: LocaleSchema.optional(),
  deliveryType: DeliveryTypeSchema.optional(),
  subject: z.string().max(200).nullable().optional(),
  body: z.string().max(50_000).nullable().optional(),
  enclosureNote: z.string().max(2000).nullable().optional(),
  signatureMode: z.enum(["typed", "image"]).nullable().optional(),
  baseUpdatedAt: TimestampSchema,
}).refine(obj => Object.keys(obj).length > 0, {
  message: "At least one field must be provided",
});
```

`baseUpdatedAt` is the client's last known draft freshness marker. The backend compares it with the
current draft `updatedAt` to reject stale writes from another tab or stale UI state.

**Response `200 OK`:**
```ts
const PatchDraftResponse = z.object({ draft: DraftSummary });
```

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `SESSION_REQUIRED` | 401 | No valid session |
| `NOT_FOUND` | 404 | Draft not found |
| `CONFLICT` | 409 | Draft is in a state that forbids editing, or the client's `baseUpdatedAt` is stale |
| `VALIDATION_ERROR` | 400 | Field value invalid |

**Rate limit:** 120 req/session/min

---

#### `POST /api/v1/drafts/:id/review`
Create an immutable snapshot of the current draft state. All required fields must be present. Returns the snapshot. Advances draft to a reviewable state.

**Request body:** none

**Response `201 Created`:**
```ts
const DraftSnapshotSchema = z.object({
  id: UuidSchema,
  draftId: UuidSchema,
  schemaVersion: z.number().int().positive(),
  locale: LocaleSchema,
  deliveryType: DeliveryTypeSchema,
  subject: z.string(),
  body: z.string(),
  enclosureNote: z.string().nullable(),
  signatureMode: z.enum(["typed", "image"]),
  sender: SenderProfileSchema,
  recipient: RecipientProfileSchema,
  attachmentFileIds: z.array(UuidSchema),
  signatureFileId: UuidSchema.nullable(),
  priceCents: z.number().int().positive(),  // CHF cents, locked at snapshot time
  createdAt: TimestampSchema,
});

const ReviewDraftResponse = z.object({ snapshot: DraftSnapshotSchema });
```

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `SESSION_REQUIRED` | 401 | No valid session |
| `NOT_FOUND` | 404 | Draft not found |
| `CONFLICT` | 409 | Draft already submitted/paid |
| `VALIDATION_ERROR` | 400 | Required fields missing; `details` lists specific fields |

**Rate limit:** 30 req/session/hour

---

#### `GET /api/v1/drafts/:id/preview`
Return the current letter preview data suitable for client-side rendering. Does not generate a PDF; PDF rendering is a backend concern triggered by the dispatch flow.

**Response `200 OK`:**
```ts
const LetterPreviewResponse = z.object({
  preview: z.object({
    draftId: UuidSchema,
    snapshotId: UuidSchema.nullable(),
    locale: LocaleSchema,
    deliveryType: DeliveryTypeSchema,
    subject: z.string().nullable(),
    body: z.string().nullable(),
    enclosureNote: z.string().nullable(),
    sender: SenderProfileSchema.nullable(),
    recipient: RecipientProfileSchema.nullable(),
    signatureMode: z.enum(["typed", "image"]).nullable(),
    signatureFileId: UuidSchema.nullable(),
    attachmentCount: z.number().int().nonnegative(),
    priceCents: z.number().int().positive().nullable(), // null until fully valid
    updatedAt: TimestampSchema,
  }),
});
```

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `SESSION_REQUIRED` | 401 | No valid session |
| `NOT_FOUND` | 404 | Draft not found |

**Rate limit:** 120 req/session/min

---

### 3.3 Conversation / AI

#### `POST /api/v1/drafts/:id/messages`
Send a user message. Triggers AI processing. AI response is streamed via SSE on `GET /api/v1/drafts/:id/stream`. This endpoint returns immediately after enqueuing.

**Request body:**
```ts
const SendMessageBody = z.object({
  content: z.string().min(1).max(4000),
});
```

**Response `202 Accepted`:**
```ts
const SendMessageResponse = z.object({
  message: z.object({
    id: UuidSchema,
    draftId: UuidSchema,
    role: z.literal("user"),
    content: z.string(),
    createdAt: TimestampSchema,
  }),
  streamUrl: z.string(), // relative: /api/v1/drafts/:id/stream
});
```

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `SESSION_REQUIRED` | 401 | No valid session |
| `NOT_FOUND` | 404 | Draft not found |
| `CONFLICT` | 409 | Draft already submitted; conversation locked |
| `VALIDATION_ERROR` | 400 | Message content empty or too long |
| `RATE_LIMITED` | 429 | Too many AI messages |
| `PROVIDER_UNAVAILABLE` | 503 | AI provider unavailable |

**Rate limit:** 30 messages/session/hour; 10 messages/draft

---

#### `GET /api/v1/drafts/:id/messages`
Fetch conversation history for a draft. Cursor-paginated, newest-first.

**Query params:**
```ts
const ListMessagesQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

**Response `200 OK`:**
```ts
const ConversationMessageSchema = z.object({
  id: UuidSchema,
  draftId: UuidSchema,
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  createdAt: TimestampSchema,
});

const ListMessagesResponse = z.object({
  data: z.array(ConversationMessageSchema),
  cursor: z.string().optional(),
  hasMore: z.boolean(),
});
```

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `SESSION_REQUIRED` | 401 | No valid session |
| `NOT_FOUND` | 404 | Draft not found |

**Rate limit:** 60 req/session/min

---

#### `GET /api/v1/drafts/:id/stream`
SSE endpoint. Client opens and holds this connection to receive real-time events for the draft.

**Response:** `Content-Type: text/event-stream`

**SSE event types:**
```ts
// Token from AI stream
type AiTokenEvent = {
  event: "ai_token";
  data: { token: string; messageId: string };
};

// AI message complete
type AiMessageCompleteEvent = {
  event: "ai_message_complete";
  data: {
    messageId: string;
    fullContent: string;
    extractedFields?: Partial<DraftFields>; // fields the AI updated
  };
};

// Draft field was updated (AI or user action)
type FieldUpdateEvent = {
  event: "field_update";
  data: {
    field: string;       // e.g. "subject", "body"
    value: unknown;
    updatedAt: string;   // ISO 8601
  };
};

// Draft state changed
type DraftStatusEvent = {
  event: "draft_status";
  data: { dispatchState: string; paymentState: string; updatedAt: string };
};

// Non-fatal error during AI processing
type StreamErrorEvent = {
  event: "error";
  data: { code: string; message: string };
};
```

Clients should reconnect using `Last-Event-ID` header. Each event carries an `id` field.

**Error responses (HTTP, before stream opens):**

| Code | HTTP | When |
|------|------|------|
| `SESSION_REQUIRED` | 401 | No valid session |
| `NOT_FOUND` | 404 | Draft not found |

**Connection rule:** one shared SSE connection per active draft per tab. The server may briefly
tolerate a second same-session+draft connection during reconnect overlap, but duplicate connections
should be replaced quickly rather than treated as a supported steady state.

---

### 3.4 Profiles

#### `PUT /api/v1/drafts/:id/sender`
Set or fully replace the sender profile for a draft.

**Request body:**
```ts
const SenderProfileSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  companyName: z.string().max(200).optional(),
  addressLine1: z.string().min(1).max(200),
  addressLine2: z.string().max(200).optional(),
  postalCode: z.string().min(1).max(20),
  city: z.string().min(1).max(100),
  country: z.string().length(2), // ISO 3166-1 alpha-2
  email: z.string().email().max(254).optional(),
  phone: z.string().max(30).optional(),
});
```

**Response `200 OK`:**
```ts
const SetSenderResponse = z.object({
  sender: SenderProfileSchema.extend({
    id: UuidSchema,
    draftId: UuidSchema,
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  }),
});
```

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `SESSION_REQUIRED` | 401 | No valid session |
| `NOT_FOUND` | 404 | Draft not found |
| `CONFLICT` | 409 | Draft already submitted |
| `VALIDATION_ERROR` | 400 | Invalid field values |

**Rate limit:** 60 req/session/min

---

#### `PUT /api/v1/drafts/:id/recipient`
Set or fully replace the recipient profile for a draft.

**Request body:**
```ts
const RecipientProfileSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  companyName: z.string().max(200).optional(),
  department: z.string().max(200).optional(),
  addressLine1: z.string().min(1).max(200),
  addressLine2: z.string().max(200).optional(),
  postalCode: z.string().min(1).max(20),
  city: z.string().min(1).max(100),
  country: z.string().length(2), // ISO 3166-1 alpha-2
}).refine(
  data => data.firstName || data.lastName || data.companyName,
  { message: "At least one of firstName, lastName, or companyName is required" }
);
```

**Response `200 OK`:**
```ts
const SetRecipientResponse = z.object({
  recipient: RecipientProfileSchema.extend({
    id: UuidSchema,
    draftId: UuidSchema,
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  }),
});
```

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `SESSION_REQUIRED` | 401 | No valid session |
| `NOT_FOUND` | 404 | Draft not found |
| `CONFLICT` | 409 | Draft already submitted |
| `VALIDATION_ERROR` | 400 | Invalid field values or recipient identity missing |

**Rate limit:** 60 req/session/min

---

#### `GET /api/v1/drafts/:id/address-search`
Search Swiss mailing addresses while the user is filling sender or recipient details. This is an
assistive lookup only; the structured fields remain editable and authoritative.

**Query params:**
```ts
const AddressSearchQuery = z.object({
  query: z.string().trim().min(3).max(160),
});
```

**Response `200 OK`:**
```ts
const AddressSearchResponse = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      primaryText: z.string(),
      secondaryText: z.string().nullable(),
      source: z.literal("google_places"),
    }),
  ),
});
```

**Behavior notes:**
- used for sender and recipient address assist, not company identity lookup
- current provider is Google Places behind a backend adapter
- restricted to Swiss results only
- selecting a result is a shortcut to prefill structured fields; users can still edit street, PLZ, and city manually
- this is not postal-grade validation and must not be treated as dispatch acceptance

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `VALIDATION_ERROR` | 400 | Query shorter than 3 characters |
| `NOT_FOUND` | 404 | Draft not found or not owned by the session |
| `PROVIDER_OUTAGE` | 503 | Address search provider is temporarily unavailable |

**Rate limit:** 60 req/session/min

---

#### `GET /api/v1/drafts/:id/address-details`
Fetch canonical mailing fields for a previously selected address-search result.

**Query params:**
```ts
const AddressDetailsQuery = z.object({
  id: z.string().trim().min(1).max(200),
});
```

**Response `200 OK`:**
```ts
const AddressDetailsResponse = z.object({
  address: z.object({
    id: z.string(),
    label: z.string(),
    addressLine1: z.string().nullable(),
    postalCode: z.string().nullable(),
    city: z.string().nullable(),
    countryCode: z.string().length(2).nullable(),
    source: z.literal("google_places"),
  }),
});
```

**Behavior notes:**
- returned fields are normalized into Swiss Mail's sender/recipient form shape
- fields may still require user correction; this endpoint improves prefill, it does not replace review
- adapter-backed so the provider can change without changing the frontend contract

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `VALIDATION_ERROR` | 400 | Missing or invalid address identifier |
| `NOT_FOUND` | 404 | Draft not found or not owned by the session |
| `PROVIDER_OUTAGE` | 503 | Address details provider is temporarily unavailable |

**Rate limit:** 60 req/session/min

---

#### `GET /api/v1/drafts/:id/recipient/company-search`
Search the official company registry for a business recipient while the user is filling the
recipient step. This is a synchronous request/response endpoint, not a queue job.

**Query params:**
```ts
const RecipientCompanySearchQuery = z.object({
  query: z.string().trim().min(2).max(120),
});
```

**Response `200 OK`:**
```ts
const RecipientCompanySearchResponse = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      registryUid: z.string().nullable(),
      registryChid: z.string().nullable(),
      registryId: z.string().nullable(),
      registryStatus: z.string().nullable(),
      legalSeat: z.string().nullable(),
      source: z.literal("zefix"),
    }),
  ),
});
```

**Behavior notes:**
- only for company / organization recipient lookup
- current staging provider is Zefix via an internal Swiss Mail proxy
- results help the user select the company identity
- once a company is selected, the frontend may fetch company details from the same provider to prefill the
  structured recipient address fields
- future Swiss Post address validation remains a separate adapter concern and must not be faked until
  provider access is available

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `VALIDATION_ERROR` | 400 | Query shorter than 2 characters |
| `NOT_FOUND` | 404 | Draft not found or not owned by the session |
| `PROVIDER_OUTAGE` | 503 | Official company registry is temporarily unavailable |

**Rate limit:** 60 req/session/min

---

#### `GET /api/v1/drafts/:id/recipient/company-details`
Fetch canonical company address details for a previously selected recipient-company result. This remains
adapter-backed so Zefix can be replaced or complemented later.

**Query params:**
```ts
const RecipientCompanyDetailsQuery = z.object({
  id: z.string().trim().min(1).max(160),
});
```

**Response `200 OK`:**
```ts
const RecipientCompanyDetailsResponse = z.object({
  company: z.object({
    id: z.string(),
    name: z.string(),
    addressLine1: z.string().nullable(),
    postalCode: z.string().nullable(),
    city: z.string().nullable(),
    source: z.literal("zefix"),
  }),
});
```

**Behavior notes:**
- current staging provider is Zefix detail lookup by UID / EHRAID / CHID
- response is normalized into canonical recipient-address fields for the structured form
- this improves company prefill without coupling the UI to raw provider payloads
- future Swiss Post integration can replace or augment this adapter path without changing the UI contract

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `VALIDATION_ERROR` | 400 | Missing/invalid company identifier |
| `NOT_FOUND` | 404 | Draft not found or not owned by the session |
| `PROVIDER_OUTAGE` | 503 | Official company registry details are temporarily unavailable |

**Rate limit:** 60 req/session/min

---

### 3.5 Files

#### `POST /api/v1/drafts/:id/files`
Upload a file attachment or signature image. Uses `multipart/form-data`.

**Request:** `Content-Type: multipart/form-data`
- `file` — binary file field
- `kind` — `"attachment"` or `"signature"`

Limits (canonical source: `docs/04-product/file-handling.md` and `docs/08-guardrails/open-decisions.md`):
- Max file size per attachment: 5 MB (`MAX_ATTACHMENT_FILE_BYTES`)
- Max signature image size: 2 MB (`MAX_SIGNATURE_FILE_BYTES`)
- Allowed MIME types for `attachment`: `application/pdf`, `image/png`, `image/jpeg`
- Allowed MIME types for `signature`: `image/png`, `image/jpeg`
- Max 5 attachments per draft; max 1 signature per draft
- Max total upload per draft: 20 MB (`MAX_TOTAL_UPLOAD_BYTES`)

**Response `201 Created`:**
```ts
const FileAssetSchema = z.object({
  id: UuidSchema,
  draftId: UuidSchema,
  kind: FileAssetKindSchema,
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive(),
  storageKey: z.string(), // internal; not for client use
  deletedAt: TimestampSchema.nullable(),
  createdAt: TimestampSchema,
});

const UploadFileResponse = z.object({
  file: FileAssetSchema.omit({ storageKey: true }),
});
```

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `SESSION_REQUIRED` | 401 | No valid session |
| `NOT_FOUND` | 404 | Draft not found |
| `CONFLICT` | 409 | Draft already submitted; attachment limit reached |
| `VALIDATION_ERROR` | 400 | Unsupported MIME type or file too large |
| `INTERNAL_ERROR` | 500 | Object storage write failed |

**Rate limit:** 20 uploads/session/hour

---

#### `GET /api/v1/drafts/:id/files`
List all non-deleted file assets for a draft.

**Response `200 OK`:**
```ts
const ListFilesResponse = z.object({
  files: z.array(FileAssetSchema.omit({ storageKey: true })),
});
```

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `SESSION_REQUIRED` | 401 | No valid session |
| `NOT_FOUND` | 404 | Draft not found |

**Rate limit:** 120 req/session/min

---

#### `DELETE /api/v1/drafts/:id/files/:fileId`
Soft-delete a file from the draft. The file record is retained; the storage object is scheduled for cleanup per retention policy.

**Response `200 OK`:**
```ts
const DeleteFileResponse = z.object({
  fileId: UuidSchema,
  deletedAt: TimestampSchema,
});
```

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `SESSION_REQUIRED` | 401 | No valid session |
| `NOT_FOUND` | 404 | Draft or file not found |
| `CONFLICT` | 409 | Draft already submitted; file cannot be removed |

**Rate limit:** 30 req/session/min

---

#### `GET /api/v1/files/:fileId/download`
Redirect to a short-lived presigned URL for downloading the file. The presigned URL is generated at request time and is valid for 5 minutes.

**Response `302 Found`:** Redirects to presigned object storage URL.

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `SESSION_REQUIRED` | 401 | No valid session |
| `NOT_FOUND` | 404 | File not found or belongs to another session |
| `INTERNAL_ERROR` | 500 | Presigned URL generation failed |

**Rate limit:** 30 req/session/min

---

### 3.6 Payment

#### `POST /api/v1/drafts/:id/checkout`
Create a Stripe PaymentIntent with manual capture. A valid, reviewed snapshot must exist. Returns
the client secret for embedding Stripe's `<PaymentElement>` in the checkout page (see
`page-specifications.md` §8). Email is stored on the session for receipt delivery.

**Request body:**
```ts
const CreateCheckoutBody = z.object({
  email: z.string().email().max(254),
});
```

**Response `200 OK`:**
```ts
const CreateCheckoutResponse = z.object({
  clientSecret: z.string(),            // Stripe PaymentIntent client secret for <PaymentElement>
  paymentAttemptId: UuidSchema,        // internal ID; use to poll status
  priceCents: z.number().int().positive(), // locked price from snapshot
  currency: z.literal("CHF"),
});
```

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `SESSION_REQUIRED` | 401 | No valid session |
| `NOT_FOUND` | 404 | Draft not found |
| `CONFLICT` | 409 | Draft already paid or submitted; no valid snapshot |
| `VALIDATION_ERROR` | 400 | Missing or invalid email |
| `PROVIDER_UNAVAILABLE` | 503 | Stripe API unavailable |

**Rate limit:** 10 req/session/hour

---

#### `GET /api/v1/drafts/:id/payment`
Poll payment status. Safe to call repeatedly; returns canonical state, not raw Stripe data.

**Response `200 OK`:**
```ts
const PaymentStatusResponse = z.object({
  payment: z.object({
    draftId: UuidSchema,
    paymentAttemptId: UuidSchema.nullable(),
    state: PaymentStateSchema,
    priceCents: z.number().int().positive().nullable(),
    currency: z.literal("CHF"),
    authorizedAt: TimestampSchema.nullable(),
    capturedAt: TimestampSchema.nullable(),
    refundedAt: TimestampSchema.nullable(),
    failureReason: z.string().nullable(), // user-safe message, not Stripe codes
  }),
});
```

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `SESSION_REQUIRED` | 401 | No valid session |
| `NOT_FOUND` | 404 | Draft not found |

**Rate limit:** 60 req/session/min

---

#### `POST /api/v1/webhooks/stripe`
Stripe webhook handler. Raw body must be passed unchanged for signature verification. Sets `Content-Type: application/json` in response only.

**Request:**
- `Content-Type: application/json` (raw body, not parsed)
- `Stripe-Signature` header required
- No session cookie required; verified by Stripe signature

**Response `200 OK`:**
```ts
const WebhookAckResponse = z.object({ received: z.literal(true) });
```

> Return `200` even for unhandled event types to prevent Stripe retries. See §6 for full webhook handling.

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `VALIDATION_ERROR` | 400 | Invalid Stripe signature |
| `INTERNAL_ERROR` | 500 | Webhook processing failed |

**Rate limit:** No client rate limit; Stripe delivery is the source.

---

### 3.7 Dispatch

#### `GET /api/v1/drafts/:id/dispatch`
Get canonical dispatch state. Never exposes raw provider payloads. Ambiguous states are surfaced as-is.

**Response `200 OK`:**
```ts
const DispatchStatusResponse = z.object({
  dispatch: z.object({
    draftId: UuidSchema,
    dispatchAttemptId: UuidSchema.nullable(),
    state: DispatchStateSchema,
    providerRef: z.string().nullable(), // reference number, if available
    submittedAt: TimestampSchema.nullable(),
    acceptedAt: TimestampSchema.nullable(),
    rejectedAt: TimestampSchema.nullable(),
    rejectionReason: z.string().nullable(), // user-safe; no raw provider codes
    trackingAvailable: z.boolean(),
    lastCheckedAt: TimestampSchema.nullable(),
  }),
});
```

**State display rules:**
- `queued` → "Not yet submitted"
- `submitted` → "Submitted to postal provider — awaiting confirmation"
- `accepted` → "Accepted by postal provider"
- `rejected` → "Dispatch rejected — see support"
- `unknown` → "Dispatch status unclear — we are checking"
- `reconciled` → "Confirmed via manual reconciliation"

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `SESSION_REQUIRED` | 401 | No valid session |
| `NOT_FOUND` | 404 | Draft not found |

**Rate limit:** 60 req/session/min

---

#### `POST /api/v1/drafts/:id/dispatch/retry`
Admin-only. Retry a failed or stuck dispatch attempt. Requires admin session.

**Request body:** none

**Response `202 Accepted`:**
```ts
const DispatchRetryResponse = z.object({
  dispatchAttemptId: UuidSchema,
  state: DispatchStateSchema,
  queuedAt: TimestampSchema,
});
```

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `SESSION_REQUIRED` | 401 | Not authenticated as admin |
| `NOT_FOUND` | 404 | Draft not found |
| `CONFLICT` | 409 | Dispatch not in a retryable state |

**Rate limit:** 10 req/admin/hour

---

### 3.8 Order Status (Token-Authenticated)

These endpoints use a distinct order-access token, not the guest session cookie.
The order-access token is delivered via email after payment succeeds. It provides
read-only access to payment state, dispatch state, and the final rendered PDF for
a single paid order.

Authentication: the `orderToken` path parameter is the credential. The backend
validates it against a stored hash, the same way resume tokens are validated.

#### `GET /api/v1/orders/:orderToken`
Return canonical order status. Never exposes raw provider payloads.

**Response `200 OK`:**
```ts
const OrderStatusResponse = z.object({
  order: z.object({
    draftId: UuidSchema,
    orderRef: z.string(),            // human-readable order reference
    locale: LocaleSchema,
    payment: z.object({
      state: PaymentStateSchema,
      priceCents: z.number().int().positive(),
      currency: z.literal("CHF"),
      capturedAt: TimestampSchema.nullable(),
      refundedAt: TimestampSchema.nullable(),
    }),
    dispatch: z.object({
      state: DispatchStateSchema,
      providerRef: z.string().nullable(),
      submittedAt: TimestampSchema.nullable(),
      acceptedAt: TimestampSchema.nullable(),
      rejectedAt: TimestampSchema.nullable(),
      trackingAvailable: z.boolean(),
      lastCheckedAt: TimestampSchema.nullable(),
    }),
    deliveryType: z.enum(["standard", "registered"]),
    recipientName: z.string(),       // first + last only; no full address
    createdAt: TimestampSchema,
  }),
});
```

**State display rules:** same as §3.7 dispatch state display rules.

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `NOT_FOUND` | 404 | Token invalid, expired, or order not found |

**Rate limit:** 30 req/IP/min

---

#### `GET /api/v1/orders/:orderToken/pdf`
Download the final rendered PDF for the paid order. Returns the PDF binary, not JSON.

**Response `200 OK`:**
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="letter-{orderRef}.pdf"`

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `NOT_FOUND` | 404 | Token invalid, expired, order not found, or PDF not yet rendered |

**Rate limit:** 10 req/IP/hour

---

### 3.9 Admin

All `/api/v1/admin/*` endpoints require an authenticated admin session. These are not accessible to guest or consumer sessions.

#### `GET /api/v1/admin/search`
Search across drafts, sessions, payment records by various identifiers.

**Query params:**
```ts
const AdminSearchQuery = z.object({
  q: z.string().min(1).max(200),  // draft ID, session ID, email, payment ID, provider ref
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});
```

**Response `200 OK`:**
```ts
const AdminSearchResultItem = z.object({
  kind: z.enum(["draft", "session", "payment_attempt", "dispatch_attempt"]),
  id: UuidSchema,
  label: z.string(),       // human-readable summary
  matchedOn: z.string(),   // which field matched
  createdAt: TimestampSchema,
});

const AdminSearchResponse = z.object({
  data: z.array(AdminSearchResultItem),
  cursor: z.string().optional(),
  hasMore: z.boolean(),
});
```

**Rate limit:** 60 req/admin/min

---

#### `GET /api/v1/admin/drafts/:id/timeline`
Full ordered event timeline for a draft: state transitions, payment events, dispatch events, support events.

**Response `200 OK`:**
```ts
const TimelineEvent = z.object({
  id: UuidSchema,
  eventType: z.string(),   // e.g. "payment_state_changed", "dispatch_state_changed"
  from: z.string().nullable(),
  to: z.string().nullable(),
  actor: z.enum(["system", "user", "admin", "webhook", "provider"]),
  meta: z.record(z.unknown()).nullable(), // structured event metadata
  occurredAt: TimestampSchema,
});

const DraftTimelineResponse = z.object({
  draftId: UuidSchema,
  events: z.array(TimelineEvent),
});
```

**Rate limit:** 30 req/admin/min

---

#### `POST /api/v1/admin/drafts/:id/refund`
Initiate a refund for a paid draft. Creates a Stripe refund via the payment adapter. Idempotent: repeated calls for the same draft return the existing refund record if already refunded.

**Request body:**
```ts
const AdminRefundBody = z.object({
  reason: z.string().min(1).max(500),
  notifyCustomer: z.boolean().default(true),
});
```

**Response `200 OK`:**
```ts
const AdminRefundResponse = z.object({
  paymentAttemptId: UuidSchema,
  refundState: z.enum(["refund_pending", "refunded"]),
  refundInitiatedAt: TimestampSchema,
  alreadyRefunded: z.boolean(), // true if idempotent no-op
});
```

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `NOT_FOUND` | 404 | Draft or payment record not found |
| `CONFLICT` | 409 | Payment not in a refundable state |
| `PROVIDER_UNAVAILABLE` | 503 | Stripe unavailable |

**Rate limit:** 10 req/admin/hour

---

#### `POST /api/v1/admin/drafts/:id/reconcile`
Trigger manual dispatch reconciliation for a draft in an ambiguous or unknown state.

**Request body:** none

**Response `202 Accepted`:**
```ts
const AdminReconcileResponse = z.object({
  dispatchAttemptId: UuidSchema,
  state: DispatchStateSchema,
  reconciledAt: TimestampSchema,
  notes: z.string().nullable(),
});
```

**Error responses:**

| Code | HTTP | When |
|------|------|------|
| `NOT_FOUND` | 404 | Draft not found |
| `CONFLICT` | 409 | Dispatch not in a reconcilable state |

**Rate limit:** 10 req/admin/hour

---

## 4. Error Code Catalog

| Code | HTTP Status | Meaning | Example |
|------|-------------|---------|---------|
| `VALIDATION_ERROR` | 400 | Input is invalid; `details` contains field errors | Missing required field, invalid enum value |
| `SESSION_REQUIRED` | 401 | No valid session cookie | Expired cookie, no cookie |
| `PAYMENT_FAILED` | 402 | Payment processing failed | Card declined |
| `NOT_FOUND` | 404 | Resource not found or not accessible | Wrong draft ID, cross-session access |
| `CONFLICT` | 409 | State conflict | Draft already submitted, duplicate checkout |
| `RATE_LIMITED` | 429 | Too many requests | Exceeded per-session or per-IP limit |
| `INTERNAL_ERROR` | 500 | Unexpected server error | Unhandled exception, DB timeout |
| `DISPATCH_REJECTED` | 502 | Postal provider rejected the dispatch | Provider validation failure |
| `PROVIDER_UNAVAILABLE` | 503 | External service unavailable | Stripe down, postal API timeout |

All responses use the canonical error envelope from §1 (sourced from `error-taxonomy.md`):
```json
{
  "error": {
    "code": "validation_error",
    "family": "validation_error",
    "message": "Request body failed validation",
    "userMessage": "Some required details are missing or invalid.",
    "userAction": "Please review the highlighted fields and try again.",
    "fields": [
      { "field": "subject", "message": "Subject is required" },
      { "field": "recipient.postalCode", "message": "Must be a 4-digit Swiss postal code" }
    ]
  }
}
```

`details` is only present on `VALIDATION_ERROR` responses.

---

## 5. Rate Limiting Table

| Endpoint | Limit | Window | Keyed By |
|----------|-------|--------|----------|
| `POST /api/v1/sessions` | 60 | 1 hour | IP |
| `GET /api/v1/sessions/current` | 60 | 1 min | Session |
| `PATCH /api/v1/sessions/current` | 20 | 1 min | Session |
| `GET /api/v1/resume/:token` | 20 | 1 hour | IP |
| `POST /api/v1/drafts` | 20 | 1 day | Session |
| `GET /api/v1/drafts/:id` | 120 | 1 min | Session |
| `PATCH /api/v1/drafts/:id` | 120 | 1 min | Session |
| `POST /api/v1/drafts/:id/review` | 30 | 1 hour | Session |
| `GET /api/v1/drafts/:id/preview` | 120 | 1 min | Session |
| `POST /api/v1/drafts/:id/messages` | 30 | 1 hour | Session |
| `GET /api/v1/drafts/:id/messages` | 60 | 1 min | Session |
| `GET /api/v1/drafts/:id/stream` | 1 shared steady-state connection per active draft per tab; short reconnect overlap tolerated | — | Session + Draft |
| `PUT /api/v1/drafts/:id/sender` | 60 | 1 min | Session |
| `PUT /api/v1/drafts/:id/recipient` | 60 | 1 min | Session |
| `POST /api/v1/drafts/:id/files` | 20 | 1 hour | Session |
| `GET /api/v1/drafts/:id/files` | 120 | 1 min | Session |
| `DELETE /api/v1/drafts/:id/files/:fileId` | 30 | 1 min | Session |
| `GET /api/v1/files/:fileId/download` | 30 | 1 min | Session |
| `POST /api/v1/drafts/:id/checkout` | 10 | 1 hour | Session |
| `GET /api/v1/drafts/:id/payment` | 60 | 1 min | Session |
| `POST /api/v1/webhooks/stripe` | No limit | — | — |
| `GET /api/v1/drafts/:id/dispatch` | 60 | 1 min | Session |
| `GET /api/v1/orders/:orderToken` | 30 | 1 min | IP |
| `GET /api/v1/orders/:orderToken/pdf` | 10 | 1 hour | IP |
| `POST /api/v1/drafts/:id/dispatch/retry` | 10 | 1 hour | Admin |
| `GET /api/v1/admin/search` | 60 | 1 min | Admin |
| `GET /api/v1/admin/drafts/:id/timeline` | 30 | 1 min | Admin |
| `POST /api/v1/admin/drafts/:id/refund` | 10 | 1 hour | Admin |
| `POST /api/v1/admin/drafts/:id/reconcile` | 10 | 1 hour | Admin |

Rate limit responses include headers:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1748789400   # Unix timestamp
Retry-After: 3600
```

---

## 6. Webhook Contracts

### 6.1 Stripe Webhook Handler
**Endpoint:** `POST /api/v1/webhooks/stripe`
**Security:** HMAC-SHA256 signature verified via `Stripe-Signature` header before any processing.

### 6.2 Handled Event Types

#### `payment_intent.amount_capturable_updated`
PaymentIntent has been authorized (hold placed on card). This fires when the user completes payment
via the embedded `<PaymentElement>` and the PaymentIntent has `capture_method: 'manual'`.

In the locked launch model this confirms authorization — the payment attempt moves to `authorized`,
not `captured`.

**Internal action:**
1. Look up `PaymentAttempt` by `metadata.paymentAttemptId` (set when creating the PaymentIntent).
2. Verify the intent status is `requires_capture`.
3. Transition `PaymentAttempt.state` to `authorized`.
4. Enqueue dispatch submission for the associated draft after render/preflight checks pass.
5. Log canonical `payment_state_changed` event.

```ts
// Relevant Stripe fields we read:
const PaymentIntentAuthorizedFields = z.object({
  id: z.string(),                   // Stripe PaymentIntent ID
  status: z.literal("requires_capture"),
  amount: z.number().int(),         // cents
  currency: z.string(),
  metadata: z.object({
    paymentAttemptId: UuidSchema,
    draftId: UuidSchema,
  }),
  latest_charge: z.string().nullable(),
});
```

> **Note:** The product uses Stripe Elements (embedded `<PaymentElement>`), NOT Stripe Checkout
> (hosted page). There is no `checkout.session.completed` event in this flow. See
> `page-specifications.md` §8 for the UX spec.

---

#### Capture-confirmation webhook(s)
Stripe may emit one or more events that confirm manual capture completed. The exact event mix depends on how the payment adapter implements Stripe manual capture and must stay inside the adapter boundary.

**Internal action:**
1. Look up `PaymentAttempt` by Stripe identifiers in adapter metadata.
2. If already `captured`, no-op.
3. Otherwise transition to `captured`.
4. Log canonical `payment_state_changed` event.

Capture must happen only after deterministic dispatch acceptance in the locked payment model. Do not use capture confirmation as the trigger to submit dispatch.

---

#### `payment_intent.payment_failed`
Payment intent failed.

**Internal action:**
1. Look up `PaymentAttempt` by `payment_intent` ID.
2. Transition `PaymentAttempt.state` to `failed`.
3. Set `failureReason` to a user-safe message (do not store raw Stripe decline codes in user-visible fields; store in admin-only metadata).
4. Log canonical `payment_state_changed` event.

```ts
const PaymentFailedRelevantFields = z.object({
  id: z.string(),
  last_payment_error: z.object({
    code: z.string().nullable(),
    message: z.string().nullable(),
  }).nullable(),
  metadata: z.object({
    paymentAttemptId: UuidSchema,
    draftId: UuidSchema,
  }),
});
```

---

#### `charge.refunded`
A charge was refunded (may be Stripe-initiated or admin-initiated).

**Internal action:**
1. Look up `PaymentAttempt` by charge ID or `payment_intent`.
2. If already `refunded`, no-op.
3. Transition `PaymentAttempt.state` to `refunded`.
4. Log canonical `payment_state_changed` event.
5. If dispatch was submitted, escalate to admin queue for review.

---

### 6.3 Idempotency

Stripe may deliver the same event more than once. All webhook handlers must be idempotent:

1. **Deduplication key:** use the Stripe event `id` or an equivalent durable dedup key from the adapter. Do not rely on `Stripe-Signature` as the canonical dedup identifier.
2. **Check before act:** Before any state transition, check current state. If already in target state, return `200` immediately without re-processing.
3. **Transactional writes:** State transitions and event log writes must be atomic (single DB transaction).
4. **No side-effect re-runs:** Dispatch enqueue must be conditional on the transition actually occurring (not on every webhook delivery).

---

## 7. Shared Schema Reference

The full canonical schemas are defined in `shared/` and imported by both frontend and backend. These are the source of truth — API request/response types extend them.

```ts
// Key shared types (abbreviated for reference)
type Session = z.infer<typeof SessionSchema>;
type DraftLetter = z.infer<typeof DraftLetterSchema>;
type DraftSnapshot = z.infer<typeof DraftSnapshotSchema>;
type SenderProfile = z.infer<typeof SenderProfileSchema>;
type RecipientProfile = z.infer<typeof RecipientProfileSchema>;
type FileAsset = z.infer<typeof FileAssetSchema>;
type PaymentAttempt = z.infer<typeof PaymentAttemptSchema>;
type DispatchAttempt = z.infer<typeof DispatchAttemptSchema>;
```

Database tables with direct schema correspondence: `sessions`, `draft_letters`, `draft_snapshots`, `sender_profiles`, `recipient_profiles`, `file_assets`, `conversation_messages`, `payment_attempts`, `dispatch_attempts`, `dispatch_status_events`, `support_events`.

---

## 8. Open Questions

The following items are not yet resolved and must not be coded around by assumption:

- **Postal provider dispatch API shape** — adapter internals, provider-required fields, and provider response details remain unknown until the contract is signed. Public app endpoints stay canonical and must not expose guessed provider fields. See `docs/08-guardrails/provider-certainties.md`.
- **Tracking availability** — `trackingAvailable` in dispatch status is surfaced honestly; do not infer tracking from barcode generation.
- **PDF render trigger** — the exact conditions and timing for PDF generation are not yet specified. This endpoint does not expose a `/render` route; rendering is backend-initiated.
