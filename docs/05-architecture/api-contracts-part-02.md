# API Contracts — Part 2

> Split from [api-contracts.md](api-contracts.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- 3. Endpoints

## 3. Endpoints

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

| Code                   | HTTP | When                                         |
| ---------------------- | ---- | -------------------------------------------- |
| `SESSION_REQUIRED`     | 401  | No valid session                             |
| `NOT_FOUND`            | 404  | Draft not found                              |
| `CONFLICT`             | 409  | Draft already submitted; conversation locked |
| `VALIDATION_ERROR`     | 400  | Message content empty or too long            |
| `RATE_LIMITED`         | 429  | Too many AI messages                         |
| `PROVIDER_UNAVAILABLE` | 503  | AI provider unavailable                      |

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

| Code               | HTTP | When             |
| ------------------ | ---- | ---------------- |
| `SESSION_REQUIRED` | 401  | No valid session |
| `NOT_FOUND`        | 404  | Draft not found  |

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
    field: string; // e.g. "subject", "body"
    value: unknown;
    updatedAt: string; // ISO 8601
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

| Code               | HTTP | When             |
| ------------------ | ---- | ---------------- |
| `SESSION_REQUIRED` | 401  | No valid session |
| `NOT_FOUND`        | 404  | Draft not found  |

**Connection rule:** one shared SSE connection per active draft per tab. The server may briefly
tolerate a second same-session+draft connection during reconnect overlap, but duplicate connections
should be replaced quickly rather than treated as a supported steady state.

---

## 3. Endpoints

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

| Code               | HTTP | When                    |
| ------------------ | ---- | ----------------------- |
| `SESSION_REQUIRED` | 401  | No valid session        |
| `NOT_FOUND`        | 404  | Draft not found         |
| `CONFLICT`         | 409  | Draft already submitted |
| `VALIDATION_ERROR` | 400  | Invalid field values    |

**Rate limit:** 60 req/session/min

---

#### `PUT /api/v1/drafts/:id/recipient`

Set or fully replace the recipient profile for a draft.

**Request body:**

```ts
const RecipientProfileSchema = z
  .object({
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    companyName: z.string().max(200).optional(),
    department: z.string().max(200).optional(),
    addressLine1: z.string().min(1).max(200),
    addressLine2: z.string().max(200).optional(),
    postalCode: z.string().min(1).max(20),
    city: z.string().min(1).max(100),
    country: z.string().length(2), // ISO 3166-1 alpha-2
  })
  .refine((data) => data.firstName || data.lastName || data.companyName, {
    message: "At least one of firstName, lastName, or companyName is required",
  });
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

| Code               | HTTP | When                                               |
| ------------------ | ---- | -------------------------------------------------- |
| `SESSION_REQUIRED` | 401  | No valid session                                   |
| `NOT_FOUND`        | 404  | Draft not found                                    |
| `CONFLICT`         | 409  | Draft already submitted                            |
| `VALIDATION_ERROR` | 400  | Invalid field values or recipient identity missing |

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
    }),
  ),
});
```

**Behavior notes:**

- used for sender and recipient address assist, not company identity lookup
- current provider is geo.admin / Federal Office of Topography behind a backend adapter
- restricted to Swiss official address search results only
- result identifiers are opaque lookup tokens; the frontend must only pass them back to `/address-details`
- selecting a result is a shortcut to prefill structured fields; users can still edit street, PLZ, and city manually
- this is not postal-grade validation and must not be treated as dispatch acceptance

**Error responses:**

| Code               | HTTP | When                                               |
| ------------------ | ---- | -------------------------------------------------- |
| `VALIDATION_ERROR` | 400  | Query shorter than 3 characters                    |
| `NOT_FOUND`        | 404  | Draft not found or not owned by the session        |
| `PROVIDER_OUTAGE`  | 503  | Address search provider is temporarily unavailable |

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
  }),
});
```

**Behavior notes:**

- returned fields are normalized into Episto's sender/recipient form shape
- invalid or stale address identifiers are rejected as client errors before or during provider lookup
- non-Swiss address details are rejected even if someone calls the endpoint directly with an arbitrary provider ID
- fields may still require user correction; this endpoint improves prefill, it does not replace review
- wire response stays provider-opaque so the backend can change address-search providers without changing the frontend contract

**Error responses:**

| Code               | HTTP | When                                                                                |
| ------------------ | ---- | ----------------------------------------------------------------------------------- |
| `VALIDATION_ERROR` | 400  | Missing or invalid address identifier                                               |
| `NOT_FOUND`        | 404  | Draft not found or not owned by the session                                         |
| `PROVIDER_OUTAGE`  | 503  | Address details provider is temporarily unavailable or returns unusable detail data |

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
- current staging provider is Zefix via an internal Episto proxy
- results help the user select the company identity
- once a company is selected, the frontend may fetch company details from the same provider to prefill the
  structured recipient address fields
- future Swiss Post address validation remains a separate adapter concern and must not be faked until
  provider access is available

**Error responses:**

| Code               | HTTP | When                                                 |
| ------------------ | ---- | ---------------------------------------------------- |
| `VALIDATION_ERROR` | 400  | Query shorter than 2 characters                      |
| `NOT_FOUND`        | 404  | Draft not found or not owned by the session          |
| `PROVIDER_OUTAGE`  | 503  | Official company registry is temporarily unavailable |

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

| Code               | HTTP | When                                                          |
| ------------------ | ---- | ------------------------------------------------------------- |
| `VALIDATION_ERROR` | 400  | Missing/invalid company identifier                            |
| `NOT_FOUND`        | 404  | Draft not found or not owned by the session                   |
| `PROVIDER_OUTAGE`  | 503  | Official company registry details are temporarily unavailable |

**Rate limit:** 60 req/session/min

---
