# Backend Architecture

**Status:** Authoritative reference  
**Resolves:** INCON-2 (canonical module list)  
**Supersedes:** earlier backend-architecture drafts  
**See also:** `docs/05-architecture/stack-decisions.md`, `docs/05-architecture/system-contracts.md`, `docs/08-guardrails/swiss-post-api-reference-map.md`, `docs/08-guardrails/swiss-post-appendix.md`

---

## 1. Architecture Style

- **Modular monolith** — one repo, one deployable backend process
- Modules are logical boundaries enforced by directory structure, not by network calls
- No microservices for MVP; module boundaries make future extraction possible without rewriting
- Backend owns: orchestration, all state transitions, all provider interaction, retention jobs

**Repository structure:**
```
backend/
  src/
    modules/
      sessions/
      drafting/
      rendering/
      files/
      payments/
      dispatch/
      tracking/
      retention/
      admin/
    adapters/
      dispatch/     ← postal provider adapters
      payment/      ← Stripe adapter
    shared/         ← internal utilities; NOT the shared/ monorepo package
  drizzle/
    migrations/
    seeds/
      test/
```

---

## 2. Canonical Module List — resolves INCON-2

The old docs listed `attachments` and `signatures` as separate modules. These are unified under `files`. The canonical module list is:

| Module | Responsibility |
|---|---|
| `sessions` | Create and manage sessions; issue and validate resume tokens; enforce session expiry. Scopes all other entities. |
| `drafting` | Manage `DraftLetter` lifecycle; handle conversation messages; coordinate AI-assisted field extraction; enforce `DraftStatus` state machine. |
| `rendering` | Accept render jobs from BullMQ; run Puppeteer to produce PDF from `DraftSnapshot` content; store resulting `FileAsset`; update `DraftSnapshot.renderedPdfAssetId`. |
| `files` | Handle all file upload, storage, and deletion — attachments, signatures, and rendered PDFs. Owns `FileAsset` records. Enforces file size limits and retention policies. Signatures are `FileAsset` rows with `kind = 'signature'`, not a separate module. |
| `payments` | Create Stripe PaymentIntents (manual capture); process Stripe webhooks; manage `PaymentAttempt` state machine; coordinate authorization, capture, cancellation, and refund with the dispatch module. |
| `dispatch` | Manage `DispatchAttempt` lifecycle; submit to postal provider via adapter; handle provider responses and reconciliation; update `DispatchState` with event log. |
| `tracking` | Provide tracking status for dispatched letters. Wraps provider lookup; surfaces ambiguity honestly — no invented tracking data. |
| `retention` | Run scheduled cleanup jobs: expire sessions, delete files past retention TTL, purge draft content per policy. All durations are configurable, never hardcoded. |
| `admin` | Internal tooling: reconciliation views, support event log, manual override endpoints, payment reversal triggers. |

---

## 3. Adapter Pattern — Required

**Every external provider interaction must sit behind an adapter interface.** No provider-specific logic is permitted outside its adapter module. This is a hard constraint, not a recommendation.

### Why

- Providers change APIs, deprecate endpoints, and go end-of-life (e.g., old E-Post Print and Send)
- Testing state machines requires the ability to inject mock adapters — impossible without the interface boundary
- Dispatch status is often ambiguous; the adapter normalizes ambiguity rather than letting it leak into business logic

### Interface pattern

```typescript
// adapters/dispatch/dispatch-adapter.interface.ts

export interface DispatchAdapter {
  /**
   * Submit a fully-resolved dispatch request.
   * Input is derived exclusively from DraftSnapshot — never from live DraftLetter.
   * Returns a normalized result; never returns raw provider payload.
   */
  submit(request: DispatchRequest): Promise<DispatchResult>;

  /**
   * Look up status of a previously submitted dispatch by provider reference.
   * Must return a canonical DispatchState — never a raw provider status code.
   */
  getStatus(providerReference: string): Promise<DispatchStatusResult>;
}

// adapters/payment/payment-adapter.interface.ts

export interface PaymentAdapter {
  createIntent(params: PaymentIntentParams): Promise<PaymentIntentResult>;
  normalizeWebhookEvent(raw: unknown): PaymentWebhookEvent;
  createRefund(params: RefundParams): Promise<RefundResult>;
}
```

### Adapter rules

- Adapters accept canonical input types (from `shared/`) and return canonical output types
- Adapters never return raw provider payloads to callers
- Adapters must normalize ambiguous provider responses to `DispatchState.unknown` — not to `accepted`
- Adapters are injected into modules via dependency injection; modules never import adapter implementations directly
- Every adapter implementation has unit tests covering normalization logic

---

## 4. Locked Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Database | PostgreSQL via Drizzle ORM |
| Job queue | BullMQ + Redis |
| File storage | S3-compatible object storage |
| PDF generation | Puppeteer (runs as background job — never in request handler) |
| Payments | Stripe (via payment adapter) |
| Validation | Zod (schemas from `shared/`) |
| Logging | Structured JSON logs (pino preferred) |

See `docs/05-architecture/stack-decisions.md` for the full rationale and three-option reviews.

---

## 5. BullMQ Queues and Jobs

All async work goes through BullMQ. Queue and job naming is canonical — do not invent alternatives.

### Queue definitions

| Queue Name | Purpose | Concurrency |
|------------|---------|-------------|
| `rendering` | PDF generation via Puppeteer | 2 (Puppeteer is memory-heavy) |
| `dispatch` | Submit letters to postal provider | 5 |
| `email` | Send transactional emails | 10 |
| `retention` | Scheduled cleanup of expired content | 1 |
| `reconciliation` | Check ambiguous dispatch states | 1 |

### Job types

| Job Name | Queue | Trigger | Idempotency Key |
|----------|-------|---------|-----------------|
| `render-pdf` | `rendering` | Snapshot created + all fields complete | `snapshot:{snapshotId}` |
| `submit-dispatch` | `dispatch` | Payment captured or authorized | `dispatch:{paymentAttemptId}` |
| `send-email` | `email` | Various (receipt, confirmation, resume) | `email:{templateId}:{sessionId}:{triggerId}` |
| `cleanup-expired-sessions` | `retention` | Repeatable: every 1 hour | N/A (idempotent by query) |
| `cleanup-expired-files` | `retention` | Repeatable: every 1 hour | N/A (idempotent by query) |
| `reconcile-ambiguous` | `reconciliation` | Repeatable: every 15 minutes | N/A (idempotent by query) |

### Job retry policy

```typescript
const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 }, // 5s, 10s, 20s
  removeOnComplete: { age: 86400 },  // Keep completed jobs for 24h
  removeOnFail: { age: 604800 },     // Keep failed jobs for 7 days (for debugging)
};
```

### Idempotency enforcement

Every job that causes side effects (dispatch submission, payment capture, email send) must check for an existing completed attempt before executing:

```typescript
// Example: submit-dispatch job
async process(job: Job<SubmitDispatchPayload>) {
  const existing = await db.query.dispatchAttempts.findFirst({
    where: eq(dispatchAttempts.paymentAttemptId, job.data.paymentAttemptId),
  });
  if (existing && existing.state !== 'queued') {
    return; // Already processed — idempotent skip
  }
  // ... proceed with dispatch
}
```

---

## 6. Dependency Injection

Adapters are injected into module services via constructor injection. No service locator pattern. No global singletons for provider clients.

```typescript
// Example: DispatchService receives its adapter at construction time
export class DispatchService {
  constructor(
    private readonly db: DrizzleClient,
    private readonly dispatchAdapter: DispatchAdapter,
    private readonly queue: Queue,
  ) {}

  async submitDispatch(snapshotId: string): Promise<void> {
    // Uses this.dispatchAdapter — never imports a concrete adapter
  }
}

// Wiring in the application bootstrap:
const dispatchAdapter = new EPostOneApiAdapter(config.epost);
const dispatchService = new DispatchService(db, dispatchAdapter, dispatchQueue);
```

For tests, inject a test double that implements the same interface:

```typescript
const mockAdapter: DispatchAdapter = {
  submit: vi.fn().mockResolvedValue({ state: 'accepted', reference: 'TEST-123' }),
  getStatus: vi.fn().mockResolvedValue({ state: 'accepted' }),
};
const service = new DispatchService(testDb, mockAdapter, testQueue);
```

---

## 7. State Ownership

The backend owns all state transitions. No state machine logic lives on the frontend.

| State machine | Owning module |
|---|---|
| `DraftStatus` (OrderLifecycle) | `drafting` |
| `PaymentState` | `payments` |
| `DispatchState` | `dispatch` |
| `FileStatus` | `files` |
| Session expiry | `sessions` + `retention` |

See `docs/05-architecture/system-contracts.md` for the full state machine definitions.

---

## 8. Build vs Buy

**Buy or adopt:**
- Stripe (payments)
- Managed PostgreSQL hosting
- S3-compatible object storage
- Transactional email provider
- Postal provider dispatch capability
- Puppeteer (PDF)
- BullMQ + Redis (queue)

**Build custom:**
- Drafting workspace and AI coordination logic
- Dispatch state machine and reconciliation
- Retention policy enforcement
- Provider adapter implementations
- Admin reconciliation model

---

## 9. API Boundary and Error Rules

- All HTTP responses use the canonical error format defined in `docs/05-architecture/error-taxonomy.md`
- Backend endpoints are the contract boundary — frontend talks to these, never to providers
- Webhook handlers must be idempotent — receiving the same Stripe or provider event twice must not cause duplicate state transitions
- All provider responses are normalized before leaving the adapter layer

---

## 10. File Storage Keys

All object storage keys follow deterministic namespaces:

```
attachments/{sessionId}/{fileId}
signatures/{sessionId}/{fileId}
renders/{draftId}/{renderVersion}.pdf
```

Files are never stored as database BLOBs. Every file has a `file_assets` metadata record with an explicit deletion policy.

---

## Cross-References

| Document | Relationship |
|---|---|
| `docs/05-architecture/system-contracts.md` | Canonical entities and state machines |
| `docs/05-architecture/database-schema.md` | Full table and column specifications |
| `docs/05-architecture/stack-decisions.md` | Technology choices and rationale |
| `docs/05-architecture/error-taxonomy.md` | Canonical error families and HTTP mapping |
| `docs/05-architecture/data-model.md` | Retention policies and limits |
| `docs/08-guardrails/` | Anti-hallucination rules for provider behavior |
