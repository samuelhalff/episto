# API Contracts — Part 1

> Split from [api-contracts.md](api-contracts.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- 1. API Conventions
- 2. Zod Schema Conventions
- 3. Endpoints

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
    code: string; // machine-readable, snake_case (e.g. 'validation_error')
    family: ErrorFamily; // one of the canonical families from error-taxonomy.md
    message: string; // human-readable; safe for dev logs
    userMessage: string; // localized, safe to display to end users
    userAction: string | null; // what the user can do next; null if no action available
    fields?: Array<{
      // present only for validation_error
      field: string;
      message: string;
    }>;
    requestId?: string; // trace ID for support
  };
};
```

### Pagination (cursor-based)

```ts
type PaginatedResponse<T> = {
  data: T[];
  cursor?: string; // opaque cursor; omit on first page
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
  "pending",
  "authorized",
  "captured",
  "failed",
  "cancelled",
  "refund_pending",
  "refunded",
  "partially_refunded",
]);
const DispatchStateSchema = z.enum([
  "queued",
  "submitted",
  "accepted",
  "rejected",
  "unknown",
  "reconciled",
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

| Code           | HTTP | When                                    |
| -------------- | ---- | --------------------------------------- |
| `RATE_LIMITED` | 429  | Too many session creations from this IP |

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

| Code               | HTTP | When                         |
| ------------------ | ---- | ---------------------------- |
| `SESSION_REQUIRED` | 401  | No cookie or session expired |

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

| Code               | HTTP | When                              |
| ------------------ | ---- | --------------------------------- |
| `SESSION_REQUIRED` | 401  | No valid session                  |
| `VALIDATION_ERROR` | 400  | Invalid locale or malformed email |

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

| Code           | HTTP | When                                  |
| -------------- | ---- | ------------------------------------- |
| `NOT_FOUND`    | 404  | Token not found or expired            |
| `RATE_LIMITED` | 429  | Too many resume attempts from this IP |

**Rate limit:** 20 req/IP/hour

---

## 3. Endpoints

### 3.2 Drafts

#### `POST /api/v1/drafts`

Create a new draft letter scoped to the current session.

**Request body:**

```ts
const CreateDraftBody = z.object({
  locale: LocaleSchema,
  intent: z.string().max(500).optional(), // free-text intent hint for AI
  deliveryType: DeliveryTypeSchema.optional(), // defaults to "standard"
});
```

**Response `201 Created`:**

```ts
const DraftStatusSchema = z.enum([
  "collecting",
  "fields_complete",
  "reviewed",
  "rendering",
  "ready",
  "submitted",
  "dispatched",
  "closed",
]);

const DraftSummary = z.object({
  id: UuidSchema,
  sessionId: UuidSchema,
  status: DraftStatusSchema, // ← DraftLetter.status (primary state)
  locale: LocaleSchema,
  deliveryType: DeliveryTypeSchema,
  dispatchState: DispatchStateSchema.nullable(), // null if no dispatch attempt exists yet
  paymentState: PaymentStateSchema.nullable(), // null if no payment attempt exists yet
  subject: z.string().nullable(),
  body: z.string().nullable(), // stored as `body` in DB; HTML content for rendering
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

| Code               | HTTP | When                           |
| ------------------ | ---- | ------------------------------ |
| `SESSION_REQUIRED` | 401  | No valid session               |
| `VALIDATION_ERROR` | 400  | Invalid locale or deliveryType |
| `RATE_LIMITED`     | 429  | Too many drafts created        |

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

| Code               | HTTP | When                                              |
| ------------------ | ---- | ------------------------------------------------- |
| `SESSION_REQUIRED` | 401  | No valid session                                  |
| `NOT_FOUND`        | 404  | Draft doesn't exist or belongs to another session |

**Rate limit:** 120 req/session/min

---

#### `PATCH /api/v1/drafts/:id`

Partial update of draft fields. Cannot update a draft that has already been submitted.

**Request body:**

```ts
const PatchDraftBody = z
  .object({
    locale: LocaleSchema.optional(),
    deliveryType: DeliveryTypeSchema.optional(),
    subject: z.string().max(200).nullable().optional(),
    body: z.string().max(50_000).nullable().optional(),
    enclosureNote: z.string().max(2000).nullable().optional(),
    signatureMode: z.enum(["typed", "image"]).nullable().optional(),
    baseUpdatedAt: TimestampSchema,
  })
  .refine((obj) => Object.keys(obj).length > 0, {
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

| Code               | HTTP | When                                                                               |
| ------------------ | ---- | ---------------------------------------------------------------------------------- |
| `SESSION_REQUIRED` | 401  | No valid session                                                                   |
| `NOT_FOUND`        | 404  | Draft not found                                                                    |
| `CONFLICT`         | 409  | Draft is in a state that forbids editing, or the client's `baseUpdatedAt` is stale |
| `VALIDATION_ERROR` | 400  | Field value invalid                                                                |

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
  priceCents: z.number().int().positive(), // CHF cents, locked at snapshot time
  createdAt: TimestampSchema,
});

const ReviewDraftResponse = z.object({ snapshot: DraftSnapshotSchema });
```

**Error responses:**

| Code               | HTTP | When                                                     |
| ------------------ | ---- | -------------------------------------------------------- |
| `SESSION_REQUIRED` | 401  | No valid session                                         |
| `NOT_FOUND`        | 404  | Draft not found                                          |
| `CONFLICT`         | 409  | Draft already submitted/paid                             |
| `VALIDATION_ERROR` | 400  | Required fields missing; `details` lists specific fields |

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

| Code               | HTTP | When             |
| ------------------ | ---- | ---------------- |
| `SESSION_REQUIRED` | 401  | No valid session |
| `NOT_FOUND`        | 404  | Draft not found  |

**Rate limit:** 120 req/session/min

---
