# API Contracts — Part 4

> Split from [api-contracts.md](api-contracts.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- 5. Rate Limiting Table
- 6. Webhook Contracts
- 7. Shared Schema Reference
- 8. Open Questions

## 5. Rate Limiting Table

| Endpoint                                  | Limit                                                                                        | Window | Keyed By        |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- | ------ | --------------- |
| `POST /api/v1/sessions`                   | 60                                                                                           | 1 hour | IP              |
| `GET /api/v1/sessions/current`            | 60                                                                                           | 1 min  | Session         |
| `PATCH /api/v1/sessions/current`          | 20                                                                                           | 1 min  | Session         |
| `GET /api/v1/resume/:token`               | 20                                                                                           | 1 hour | IP              |
| `POST /api/v1/drafts`                     | 20                                                                                           | 1 day  | Session         |
| `GET /api/v1/drafts/:id`                  | 120                                                                                          | 1 min  | Session         |
| `PATCH /api/v1/drafts/:id`                | 120                                                                                          | 1 min  | Session         |
| `POST /api/v1/drafts/:id/review`          | 30                                                                                           | 1 hour | Session         |
| `GET /api/v1/drafts/:id/preview`          | 120                                                                                          | 1 min  | Session         |
| `POST /api/v1/drafts/:id/messages`        | 30                                                                                           | 1 hour | Session         |
| `GET /api/v1/drafts/:id/messages`         | 60                                                                                           | 1 min  | Session         |
| `GET /api/v1/drafts/:id/stream`           | 1 shared steady-state connection per active draft per tab; short reconnect overlap tolerated | —      | Session + Draft |
| `PUT /api/v1/drafts/:id/sender`           | 60                                                                                           | 1 min  | Session         |
| `PUT /api/v1/drafts/:id/recipient`        | 60                                                                                           | 1 min  | Session         |
| `POST /api/v1/drafts/:id/files`           | 20                                                                                           | 1 hour | Session         |
| `GET /api/v1/drafts/:id/files`            | 120                                                                                          | 1 min  | Session         |
| `DELETE /api/v1/drafts/:id/files/:fileId` | 30                                                                                           | 1 min  | Session         |
| `GET /api/v1/files/:fileId/download`      | 30                                                                                           | 1 min  | Session         |
| `POST /api/v1/drafts/:id/checkout`        | 10                                                                                           | 1 hour | Session         |
| `GET /api/v1/drafts/:id/payment`          | 60                                                                                           | 1 min  | Session         |
| `POST /api/v1/webhooks/stripe`            | No limit                                                                                     | —      | —               |
| `GET /api/v1/drafts/:id/dispatch`         | 60                                                                                           | 1 min  | Session         |
| `GET /api/v1/orders/:orderToken`          | 30                                                                                           | 1 min  | IP              |
| `GET /api/v1/orders/:orderToken/pdf`      | 10                                                                                           | 1 hour | IP              |
| `POST /api/v1/drafts/:id/dispatch/retry`  | 10                                                                                           | 1 hour | Admin           |
| `GET /api/v1/admin/search`                | 60                                                                                           | 1 min  | Admin           |
| `GET /api/v1/admin/drafts/:id/timeline`   | 30                                                                                           | 1 min  | Admin           |
| `POST /api/v1/admin/drafts/:id/refund`    | 10                                                                                           | 1 hour | Admin           |
| `POST /api/v1/admin/drafts/:id/reconcile` | 10                                                                                           | 1 hour | Admin           |

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
  id: z.string(), // Stripe PaymentIntent ID
  status: z.literal("requires_capture"),
  amount: z.number().int(), // cents
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
  last_payment_error: z
    .object({
      code: z.string().nullable(),
      message: z.string().nullable(),
    })
    .nullable(),
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
