# Backend Build Pack

> Cross-reference: [`../05-architecture/database-schema.md`](../05-architecture/database-schema.md)
> for the full PostgreSQL schema, index strategy, and column-level notes.
> Cross-reference: [`../08-guardrails/swiss-post-api-reference-map.md`](../08-guardrails/swiss-post-api-reference-map.md)
> for every documentation area that depends on Swiss Post API truth.

## Goal

Define the backend in modules, jobs, and storage responsibilities before code generation starts.

## Backend planning rule

Backend work must begin with the full system flow, not isolated handlers.
For each major capability, define:

- entrypoints
- owning module
- canonical contracts
- state transitions
- idempotency strategy
- queue/job boundaries
- adapter boundaries
- observability and audit events

Do not write endpoint-first code that discovers architecture later.

## Module map (canonical — INCON-2 fix)

The following is the locked module list. No module may be added without a documented decision.

| Module | Primary responsibility |
|---|---|
| `sessions` | Guest session lifecycle, token issuance, resume tokens |
| `drafting` | Draft CRUD, snapshot management, field validation |
| `rendering` | HTML-to-PDF pipeline, version hashing, preview generation |
| `files` | Upload intake, metadata records, storage key assignment, deletion jobs |
| `payments` | Stripe integration, capture/authorize flows, webhook normalization |
| `dispatch` | Dispatch submission, adapter translation, state machine |
| `tracking` | Provider status lookup, reference vs tracking separation |
| `retention` | Configurable cleanup jobs, expiry policy enforcement |
| `admin` | Internal dashboard, support tooling, audit events |

## Database records

Full schema in [`../05-architecture/database-schema.md`](../05-architecture/database-schema.md).
Table summary:

| Table | Module |
|---|---|
| `sessions` | sessions |
| `draft_letters` | drafting |
| `draft_snapshots` | drafting |
| `sender_profiles` | drafting |
| `recipient_profiles` | drafting |
| `file_assets` | files |
| `conversation_messages` | drafting |
| `payment_attempts` | payments |
| `dispatch_attempts` | dispatch |
| `dispatch_status_events` | dispatch, tracking |
| `support_events` | admin |

## Storage key strategy

Use deterministic, namespaced keys. No storage key may encode a provider assumption that is not
canonical.

| Asset type | Key pattern |
|---|---|
| Attachment | `attachments/{sessionId}/{fileId}` |
| Signature image | `signatures/{sessionId}/{fileId}` |
| Rendered PDF | `renders/{draftId}/{renderVersion}.pdf` |

## Queue jobs

Managed with BullMQ + Redis (locked — see
[`../08-guardrails/open-decisions.md`](../08-guardrails/open-decisions.md)).

| Job | Trigger |
|---|---|
| `render-pdf` | Draft marked ready, or re-render requested |
| `submit-dispatch` | Payment confirmed |
| `reconcile-ambiguous-dispatch` | Dispatch state stuck in `dispatch_submitted` |
| `send-transactional-email` | Confirmation, receipt, or support events |
| `cleanup-expired-assets` | Scheduled; driven by configurable retention policy |

## Webhook handling

- Payment webhooks: normalize via Stripe adapter into canonical `PaymentEvent`
- Provider webhooks: handle only if the chosen provider actually supports them
- Every webhook event must map into a canonical internal event type before any state transition
- Raw webhook payloads are stored for audit; they must not drive UI state directly

## Backend rules

- Backend owns all state transitions — frontend never transitions state directly
- Backend owns all adapter translation — no provider payloads leak into frontend responses
- Backend owns retention cleanup — scheduled jobs, not application-request side effects
- Backend owns idempotency for payment and dispatch operations
- All provider-specific logic must live inside its adapter module
- No controller may hide placeholder branches, fake completions, or TODO-only failure handling
- Every endpoint and job must be complete enough to handle real production input, retries, and errors

## Adapter boundaries

| Domain | Adapter module |
|---|---|
| Postal dispatch | `dispatch/adapters/{providerName}.ts` |
| Payment | `payments/adapters/stripe.ts` |
| Tracking | `tracking/adapters/{providerName}.ts` |
| Email | `notifications/adapters/{providerName}.ts` |
