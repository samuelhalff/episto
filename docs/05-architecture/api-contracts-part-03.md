# API Contracts — Part 3

> Split from [api-contracts.md](api-contracts.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- 3. Endpoints
- 4. Error Code Catalog

## 3. Endpoints

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

| Code               | HTTP | When                                              |
| ------------------ | ---- | ------------------------------------------------- |
| `SESSION_REQUIRED` | 401  | No valid session                                  |
| `NOT_FOUND`        | 404  | Draft not found                                   |
| `CONFLICT`         | 409  | Draft already submitted; attachment limit reached |
| `VALIDATION_ERROR` | 400  | Unsupported MIME type or file too large           |
| `INTERNAL_ERROR`   | 500  | Object storage write failed                       |

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

| Code               | HTTP | When             |
| ------------------ | ---- | ---------------- |
| `SESSION_REQUIRED` | 401  | No valid session |
| `NOT_FOUND`        | 404  | Draft not found  |

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

| Code               | HTTP | When                                            |
| ------------------ | ---- | ----------------------------------------------- |
| `SESSION_REQUIRED` | 401  | No valid session                                |
| `NOT_FOUND`        | 404  | Draft or file not found                         |
| `CONFLICT`         | 409  | Draft already submitted; file cannot be removed |

**Rate limit:** 30 req/session/min

---

#### `GET /api/v1/files/:fileId/download`

Redirect to a short-lived presigned URL for downloading the file. The presigned URL is generated at request time and is valid for 5 minutes.

**Response `302 Found`:** Redirects to presigned object storage URL.

**Error responses:**

| Code               | HTTP | When                                         |
| ------------------ | ---- | -------------------------------------------- |
| `SESSION_REQUIRED` | 401  | No valid session                             |
| `NOT_FOUND`        | 404  | File not found or belongs to another session |
| `INTERNAL_ERROR`   | 500  | Presigned URL generation failed              |

**Rate limit:** 30 req/session/min

---

## 3. Endpoints

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
  clientSecret: z.string(), // Stripe PaymentIntent client secret for <PaymentElement>
  paymentAttemptId: UuidSchema, // internal ID; use to poll status
  priceCents: z.number().int().positive(), // locked price from snapshot
  currency: z.literal("CHF"),
});
```

**Error responses:**

| Code                   | HTTP | When                                               |
| ---------------------- | ---- | -------------------------------------------------- |
| `SESSION_REQUIRED`     | 401  | No valid session                                   |
| `NOT_FOUND`            | 404  | Draft not found                                    |
| `CONFLICT`             | 409  | Draft already paid or submitted; no valid snapshot |
| `VALIDATION_ERROR`     | 400  | Missing or invalid email                           |
| `PROVIDER_UNAVAILABLE` | 503  | Stripe API unavailable                             |

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

| Code               | HTTP | When             |
| ------------------ | ---- | ---------------- |
| `SESSION_REQUIRED` | 401  | No valid session |
| `NOT_FOUND`        | 404  | Draft not found  |

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

| Code               | HTTP | When                      |
| ------------------ | ---- | ------------------------- |
| `VALIDATION_ERROR` | 400  | Invalid Stripe signature  |
| `INTERNAL_ERROR`   | 500  | Webhook processing failed |

**Rate limit:** No client rate limit; Stripe delivery is the source.

---

## 3. Endpoints

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

| Code               | HTTP | When             |
| ------------------ | ---- | ---------------- |
| `SESSION_REQUIRED` | 401  | No valid session |
| `NOT_FOUND`        | 404  | Draft not found  |

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

| Code               | HTTP | When                              |
| ------------------ | ---- | --------------------------------- |
| `SESSION_REQUIRED` | 401  | Not authenticated as admin        |
| `NOT_FOUND`        | 404  | Draft not found                   |
| `CONFLICT`         | 409  | Dispatch not in a retryable state |

**Rate limit:** 10 req/admin/hour

---

## 3. Endpoints

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
    orderRef: z.string(), // human-readable order reference
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
    recipientName: z.string(), // first + last only; no full address
    createdAt: TimestampSchema,
  }),
});
```

**State display rules:** same as §3.7 dispatch state display rules.

**Error responses:**

| Code        | HTTP | When                                       |
| ----------- | ---- | ------------------------------------------ |
| `NOT_FOUND` | 404  | Token invalid, expired, or order not found |

**Rate limit:** 30 req/IP/min

---

#### `GET /api/v1/orders/:orderToken/pdf`

Download the final rendered PDF for the paid order. Returns the PDF binary, not JSON.

**Response `200 OK`:**

- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="letter-{orderRef}.pdf"`

**Error responses:**

| Code        | HTTP | When                                                             |
| ----------- | ---- | ---------------------------------------------------------------- |
| `NOT_FOUND` | 404  | Token invalid, expired, order not found, or PDF not yet rendered |

**Rate limit:** 10 req/IP/hour

---

## 3. Endpoints

### 3.9 Admin

All `/api/v1/admin/*` endpoints require an authenticated admin session. These are not accessible to guest or consumer sessions.

#### `GET /api/v1/admin/search`

Search across drafts, sessions, payment records by various identifiers.

**Query params:**

```ts
const AdminSearchQuery = z.object({
  q: z.string().min(1).max(200), // draft ID, session ID, email, payment ID, provider ref
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});
```

**Response `200 OK`:**

```ts
const AdminSearchResultItem = z.object({
  kind: z.enum(["draft", "session", "payment_attempt", "dispatch_attempt"]),
  id: UuidSchema,
  label: z.string(), // human-readable summary
  matchedOn: z.string(), // which field matched
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
  eventType: z.string(), // e.g. "payment_state_changed", "dispatch_state_changed"
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

| Code                   | HTTP | When                              |
| ---------------------- | ---- | --------------------------------- |
| `NOT_FOUND`            | 404  | Draft or payment record not found |
| `CONFLICT`             | 409  | Payment not in a refundable state |
| `PROVIDER_UNAVAILABLE` | 503  | Stripe unavailable                |

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

| Code        | HTTP | When                                 |
| ----------- | ---- | ------------------------------------ |
| `NOT_FOUND` | 404  | Draft not found                      |
| `CONFLICT`  | 409  | Dispatch not in a reconcilable state |

**Rate limit:** 10 req/admin/hour

---

## 4. Error Code Catalog

| Code                   | HTTP Status | Meaning                                           | Example                                     |
| ---------------------- | ----------- | ------------------------------------------------- | ------------------------------------------- |
| `VALIDATION_ERROR`     | 400         | Input is invalid; `details` contains field errors | Missing required field, invalid enum value  |
| `SESSION_REQUIRED`     | 401         | No valid session cookie                           | Expired cookie, no cookie                   |
| `PAYMENT_FAILED`       | 402         | Payment processing failed                         | Card declined                               |
| `NOT_FOUND`            | 404         | Resource not found or not accessible              | Wrong draft ID, cross-session access        |
| `CONFLICT`             | 409         | State conflict                                    | Draft already submitted, duplicate checkout |
| `RATE_LIMITED`         | 429         | Too many requests                                 | Exceeded per-session or per-IP limit        |
| `INTERNAL_ERROR`       | 500         | Unexpected server error                           | Unhandled exception, DB timeout             |
| `DISPATCH_REJECTED`    | 502         | Postal provider rejected the dispatch             | Provider validation failure                 |
| `PROVIDER_UNAVAILABLE` | 503         | External service unavailable                      | Stripe down, postal API timeout             |

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
      {
        "field": "recipient.postalCode",
        "message": "Must be a 4-digit Swiss postal code"
      }
    ]
  }
}
```

`details` is only present on `VALIDATION_ERROR` responses.

---
