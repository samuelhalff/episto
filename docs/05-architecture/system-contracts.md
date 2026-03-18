# System Contracts and State Models

**Status:** Authoritative reference  
**Resolves:** INCON-1 (OrderLifecycle vs DispatchState separation), INCON-3 (SignatureAsset unification), INCON-4 (DraftSnapshot definition), INCON-5 (PaymentState completeness), IMPROV-10 (complete DraftLetter contract)  
**Supersedes:** earlier contract/state-model drafts  
**See also:** `docs/05-architecture/database-schema.md` for full column-level specifications, `docs/08-guardrails/swiss-post-api-reference-map.md` for the provider/API-dependent state surfaces

---

## 1. Canonical Entities

| Entity | Description |
|---|---|
| `Session` | Root entity. Every interaction starts here. Scopes all child objects. |
| `DraftLetter` | The live, mutable letter being written. One active draft per session. |
| `DraftSnapshot` | Immutable snapshot of a draft. Created at review time (see §3.2). |
| `SenderProfile` | Sender name, address, contact details captured at checkout. |
| `RecipientProfile` | Recipient name and address. |
| `FileAsset` | Any uploaded or generated file. Signatures and attachments are both `FileAsset` rows — differentiated by `kind`. |
| `PaymentAttempt` | One Stripe payment intent. One active at a time per draft. |
| `DispatchAttempt` | One submission to the postal provider. One active at a time per draft. |
| `DispatchStatusEvent` | Append-only event log for dispatch state transitions. |
| `SupportEvent` | Append-only audit/support event. |

> **Note on SignatureAsset (INCON-3):** `SignatureAsset` is NOT a separate entity. Signatures are `FileAsset` rows with `kind = 'signature'`. The `draft_letters.signature_asset_id` column references a `file_assets` row directly. There is no separate `signature_assets` table.

---

## 2. Canonical Enums

All enums are defined once in `shared/enums.ts`. PostgreSQL counterparts mirror them exactly. `drizzle-zod` is the bridge — do not duplicate definitions.

```typescript
// shared/enums.ts

export const SessionType = {
  guest:   'guest',
} as const;

export const Locale = {
  de_CH: 'de-CH',
  fr_CH: 'fr-CH',
  it_CH: 'it-CH',
  en_CH: 'en-CH',
} as const;

export const DraftStatus = {
  collecting:      'collecting',      // user is still answering questions
  fields_complete: 'fields_complete', // all required fields present
  reviewed:        'reviewed',        // user has reviewed; snapshot created
  rendering:       'rendering',       // PDF is being generated
  ready:           'ready',           // PDF ready, awaiting payment
  submitted:       'submitted',       // dispatch submitted after payment authorization
  dispatched:      'dispatched',      // provider accepted submission and payment capture is confirmed
  closed:          'closed',          // terminal: dispatched, cancelled, or expired
} as const;

export const DeliveryType = {
  standard:   'standard',
  registered: 'registered',
} as const;

export const PaymentState = {
  pending:             'pending',
  authorized:          'authorized',
  captured:            'captured',
  failed:              'failed',
  cancelled:           'cancelled',           // added — resolves INCON-5
  refund_pending:      'refund_pending',
  refunded:            'refunded',
  partially_refunded:  'partially_refunded',  // added — resolves INCON-5
} as const;

export const DispatchState = {
  queued:      'queued',
  submitted:   'submitted',
  accepted:    'accepted',
  rejected:    'rejected',
  unknown:     'unknown',
  reconciled:  'reconciled',
} as const;
// Note: 'draft' is NOT a DispatchState value. Dispatch rows are only created when
// a draft is ready to dispatch. Pre-dispatch state lives in DraftStatus.

export const FileAssetKind = {
  attachment:   'attachment',
  signature:    'signature',
  rendered_pdf: 'rendered_pdf',
} as const;

export const FileStatus = {
  active:           'active',
  pending_deletion: 'pending_deletion',
  deleted:          'deleted',
} as const;

export const MessageRole = {
  user:      'user',
  assistant: 'assistant',
  system:    'system',
} as const;
```

---

## 3. State Machines

Three separate state machines govern the order lifecycle, payment, and dispatch. They are **not** one machine. Each transitions independently and logs every transition explicitly.

### 3.1 OrderLifecycle (DraftLetter status) — resolves INCON-1

This is the top-level user-journey state. It spans from blank draft to final closed state.

```
collecting
  → fields_complete    (all required fields present and valid)

fields_complete
  → collecting         (user edits, drops below required fields)
  → reviewed           (user confirms; DraftSnapshot created — immutable from here)

reviewed
  → rendering          (PDF generation job enqueued)

rendering
  → ready              (PDF successfully generated and stored)
  → collecting         (rendering failed; user must re-review after fix)

ready
  → submitted          (payment authorized; dispatch queued or submitted)
  → collecting         (user returns to edit before paying)

submitted
  → dispatched         (provider accepted the submission and capture succeeded)
  → closed             (dispatch permanently failed; authorization cancelled, refund completed, or escalation recorded)

dispatched
  → closed             (retention window complete; housekeeping finalised)

[any non-terminal state]
  → closed             (session expired, user explicitly cancelled, or admin closed)
```

**Rules:**
- Every transition is an explicit write to the `draft_letters.status` column.
- Every transition is logged to `support_events`.
- Transitions happen in the backend only — never inferred by the frontend.

### 3.2 PaymentState — resolves INCON-5

One `PaymentAttempt` row per Stripe payment intent.

```
pending
  → authorized         (Stripe auth hold created)
  → failed             (terminal: Stripe declined immediately)
  → cancelled          (user abandoned or intent expired)

authorized
  → captured           (capture confirmed after deterministic dispatch acceptance)
  → cancelled          (void before capture)
  → failed             (terminal: capture failed after auth)

captured
  → refund_pending     (refund requested)

refund_pending
  → refunded           (terminal: full refund confirmed)
  → partially_refunded (terminal: partial refund confirmed)

[any]
  → failed             (unrecoverable Stripe error)
```

**Rules:**
- Payment truth comes from Stripe webhooks normalized by the payment adapter.
- Frontend never decides payment state — it reads backend responses only.
- `authorized` and `captured` are distinct states. Do not collapse them.
- Dispatch submission is allowed from the authorized state. Capture does not gate dispatch submission in the locked launch model.

### 3.3 DispatchState — resolves INCON-1

One `DispatchAttempt` row per submission to the postal provider. This machine is **dispatch-specific only** — it does not carry pre-dispatch letter state (that is `DraftStatus`).

```
queued
  → submitted          (request sent to provider)

submitted
  → accepted           (provider accepted the submission — NOT just "reference created")
  → rejected           (terminal: provider refused the submission)
  → unknown            (ambiguous or timeout response; awaiting reconciliation)

unknown
  → reconciled         (resolved via polling, callback, or manual intervention)
  → accepted           (reconciliation confirmed dispatch)
  → rejected           (reconciliation confirmed rejection)
```

**Rules:**
- `accepted` means the provider accepted the submission into its downstream workflow. It does NOT
  mean delivered.
- `submitted` means the HTTP request was made. It does NOT mean accepted.
- `unknown` is a valid permanent state if reconciliation cannot resolve. Show it as ambiguous in the UI — never collapse to `pending` or `sent`.
- Every transition must produce a `dispatch_status_events` row. No silent transitions.

---

## 4. Entity Contracts

### 4.1 DraftLetter — resolves IMPROV-10

Complete field list. Column-level types and constraints are in `docs/05-architecture/database-schema.md`.

```typescript
interface DraftLetter {
  id:                   string;        // UUID v7
  sessionId:            string;        // → Session.id
  status:               DraftStatus;
  locale:               Locale;
  deliveryType:         DeliveryType;
  subject:              string | null;
  body:                 string | null;
  tone:                 string | null; // e.g. 'formal', 'neutral'
  intent:               string | null; // e.g. 'complaint', 'inquiry'
  senderProfileId:      string | null; // → SenderProfile.id
  recipientProfileId:   string | null; // → RecipientProfile.id
  signatureAssetId:     string | null; // → FileAsset.id (kind=signature)
  estimatedPages:       number | null;
  metadata:             Record<string, unknown>; // extensible; never used for core logic
  createdAt:            Date;
  updatedAt:            Date;
}
```

### 4.2 DraftSnapshot — resolves INCON-4

> **Definition:** An immutable snapshot created at review time. Contains the complete letter content used for PDF rendering and dispatch. **Cannot be modified after creation.** The PDF and the dispatched letter are always derived from this snapshot — never from the live `DraftLetter` record.

```typescript
interface DraftSnapshot {
  id:                   string;   // UUID v7
  draftId:              string;   // → DraftLetter.id
  version:              number;   // increments; (draftId, version) unique
  snapshotData:         object;   // complete letter content at review time (JSONB)
  renderedPdfAssetId:   string | null; // → FileAsset.id (kind=rendered_pdf); set after rendering
  schemaVersion:        string;   // e.g. '1.0' — used for forward compatibility
  createdAt:            Date;     // immutable — no updatedAt
}
```

Once a `DraftSnapshot` row is inserted, it must never be updated. If a user edits after reviewing, a new snapshot is created with an incremented version.

### Field naming convention

Entity interfaces use camelCase. Database columns use snake_case. The mapping is mechanical:
`firstName` ↔ `first_name`, `addressLine1` ↔ `address_line_1`, `postalCode` ↔ `postal_code`.
API request/response schemas use the same camelCase names as entity interfaces.
Drizzle ORM handles the mapping automatically. Do not introduce a third naming convention.

### 4.3 SenderProfile

```typescript
interface SenderProfile {
  id:           string;
  sessionId:    string;
  firstName:    string;
  lastName:     string;
  company:      string | null;
  addressLine1: string;
  addressLine2: string | null;
  postalCode:   string;
  city:         string;
  country:      string;          // ISO 3166-1 alpha-2; default 'CH'
  email:        string | null;   // for receipt/confirmation
  phone:        string | null;
  createdAt:    Date;
  updatedAt:    Date;
}
```

### 4.4 RecipientProfile

```typescript
interface RecipientProfile {
  id:           string;
  sessionId:    string;
  firstName:    string | null;
  lastName:     string | null;
  company:      string | null;
  department:   string | null;
  addressLine1: string;
  addressLine2: string | null;
  postalCode:   string;
  city:         string;
  country:      string;          // ISO 3166-1 alpha-2; default 'CH'
  createdAt:    Date;
  updatedAt:    Date;
}
```

### 4.5 FileAsset

```typescript
interface FileAsset {
  id:           string;
  sessionId:    string;
  draftId:      string | null;
  kind:         FileAssetKind;   // 'attachment' | 'signature' | 'rendered_pdf'
  status:       FileStatus;
  storageKey:   string;          // deterministic namespace — see §5
  filename:     string;
  mimeType:     string;
  sizeBytes:    number;
  deletionPolicy: string | null; // config key controlling TTL
  createdAt:    Date;
  updatedAt:    Date;
}
```

---

## 5. Storage Key Namespacing

Storage keys are deterministic and namespaced:

```
attachments/{sessionId}/{fileId}
signatures/{sessionId}/{fileId}
renders/{draftId}/{renderVersion}.pdf
```

Never use random or opaque keys. The namespace lets retention jobs and admin tooling locate and clean up files without a database scan.

---

## 6. API Boundary Rules

**Frontend talks only to backend app contracts. Never directly to providers.**

Frontend must never:
- Call postal providers directly
- Interpret raw provider payloads
- Decide payment or dispatch truth by inference
- Read `DispatchState` from anything other than a backend response

### Suggested endpoint groups

```
POST   /sessions
GET    /sessions/:id
PATCH  /drafts/:id
POST   /drafts/:id/snapshot       ← creates DraftSnapshot at review time
POST   /drafts/:id/render
POST   /payments/:draftId/create
POST   /dispatch/:draftId/submit
GET    /dispatch/:id/status
POST   /files
DELETE /files/:id
```

---

## 7. Adapter Boundaries

**Dispatch adapter owns:**
- Building the provider request from canonical `DraftSnapshot` data
- Normalizing the provider response to `DispatchState`
- Normalizing provider status lookups to `DispatchState`
- Producing `DispatchStatusEvent` rows

**Payment adapter owns:**
- Creating Stripe payment intents or checkout sessions
- Normalizing Stripe webhook events to `PaymentState` transitions
- Creating and normalizing Stripe refund responses

No provider-specific fields, codes, or payload shapes may appear outside their adapter module.

---

## 8. State-Machine Implementation Rules

- All state transitions must be explicit, logged, and testable.
- No transition may happen without a corresponding database write.
- No transition may be inferred by the frontend — backend is the single source of truth.
- Every state machine must have unit tests covering all valid transitions and all invalid transition attempts.

---

## Cross-References

| Document | Relationship |
|---|---|
| `docs/05-architecture/database-schema.md` | Column-level expansion of all entities above |
| `docs/05-architecture/backend-architecture.md` | Modules that own each state machine |
| `docs/05-architecture/stack-decisions.md` | Technology choices (Zod, Drizzle, etc.) |
| `docs/08-guardrails/` | Anti-hallucination rules governing provider behavior |
| `shared/enums.ts` | Canonical TypeScript enums matching §2 exactly |
