# Open Decisions

This file is the single source of truth for implementation-blocking and significant design
decisions. It merges the decision analysis from the pre-dev gap review with the operational
decisions that most often get guessed incorrectly.

**If an item is LOCKED, the decision has been made. Do not reopen it without a documented
three-option review that supersedes the locked entry.**

**If an item is OPEN, development of features that depend on it must not paper over it with
defaults, mocks, or "temporary" placeholders.**

---

## LOCKED decisions

### Payment provider — LOCKED: Stripe

Locked. No alternatives under consideration.

---

### Payment capture model — LOCKED: Option B (authorize first, capture after acceptance)

**Locked choice:** Authorize payment before dispatch submission. Capture only after the provider
accepts the dispatch.

**If the chosen dispatch provider cannot offer a deterministic acceptance moment, fall back to
Option C:** capture immediately with strict automatic refund on deterministic dispatch failure.

**Option A (capture immediately, no automatic refund workflow) is rejected.** It creates the
weakest trust posture and highest refund exposure.

---

### Signature scope — LOCKED: typed and drawn visual options

**Locked choice:** Public `visual` signing exposes two explicit options — **typed** and
**drawn**. No uploaded image mode at launch.

See [`../04-product/signatures-and-attachments.md`](../04-product/signatures-and-attachments.md).

Since 2026-06-10 this is the only signature lock that governs shipped behaviour: `visual` is the
only non-`none` flow mode (`shared/src/enums.ts:78`). See the reversal below.

**Option A (typed only) rejected** — too weak for the perceived trust level.  
**Option B (typed + uploaded image) superseded** — on-screen drawing is higher-leverage and image
upload was never wired in production.

---

### Signature assurance exposure — REVERSED 2026-06-10: visual tier only

**Previous lock (2026-04 to 2026-06-10):** the product was to expose three signature choices —
typed, drawn, and QES (`qualified` assurance) — with a SwissSign / SwissID readiness scaffold and a
_Coming soon_ QES shell pending provider onboarding.

**Reversed on 2026-06-10.** QES and the SwissSign / SwissID scaffolding were removed from the
product per
[`../superpowers/plans/2026-06-10-remove-qes-swisssign-signing.md`](../superpowers/plans/2026-06-10-remove-qes-swisssign-signing.md).
The current lock is: **the product exposes typed and drawn signatures and nothing else.**

Verified state:

- `shared/src/enums.ts:78` — `SignatureFlowMode` is `{ none, visual }`; the `qualified`,
  `advanced`, and `swisssign_ses` values and the `signatureAssuranceLevel` enum no longer exist.
- `backend/src/db/schema/` — no `signature_sessions` or `signature_events` tables and no
  `signature_provider` / `signature_eligibility_status` / `signature_session_status` enums.
- `shared/src/state-machines.ts:189` — the fulfilment transition table has a single visual path;
  there are no ident, session, or signing states.
- `backend/src/modules/signing/fulfillment.service.ts:59` — the historical flow-mode argument is
  accepted and ignored (`_signatureFlowMode`).
- No SwissSign, SwissID, or Skribble reference remains in `backend/src`, `shared/src`, or
  `frontend/src`.

**Reason for the reversal:** the live tier carried the whole product need, while the QES path was
an unshippable scaffold blocked indefinitely on provider onboarding and carrying real maintenance
and correctness cost across the contract, state-machine, database, and frontend surfaces.

**Principle that survives the reversal:** typed and drawn signatures are evidentiary only. No UI
copy, marketing page, or terms text may imply that they carry the Art. 14(2bis) CO equivalence to a
handwritten signature.

Reintroducing a qualified signature would be a new decision and a new implementation, not the
lifting of a gate. The retained legal analysis is in
[`../04-product/qualified-signatures.md`](../04-product/qualified-signatures.md), which is now
background only.

---

### Attachment scope — LOCKED: Option B (narrow approved set)

**Locked choice:** Support `application/pdf`, `image/png`, `image/jpeg`. Attachments are
supporting documents, operationally separate from the letter artifact.

See [`../04-product/signatures-and-attachments.md`](../04-product/signatures-and-attachments.md)
and [`../04-product/file-handling.md`](../04-product/file-handling.md).

**Option A (no attachments) rejected** — cuts important use cases.  
**Option C (broad office formats) rejected** — file conversion complexity, too many provider
unknowns.

---

### File limits — LOCKED: provisional defaults (GAP-9)

| Parameter                    | Locked provisional value |
| ---------------------------- | ------------------------ |
| Max file size per attachment | 5 MB                     |
| Max attachments per draft    | 5                        |
| Max total upload per draft   | 20 MB                    |
| Max signature image          | 2 MB                     |
| Max body characters          | 10,000                   |
| Max subject characters       | 200                      |

All values are configurable via environment variables. See
[`../04-product/file-handling.md`](../04-product/file-handling.md).

---

### Retention direction — LOCKED: Option B (short but supportable)

**Locked direction:** Short-lived content, longer-lived minimal transactional metadata.

Provisional guidance:

- Session and resume tokens: 24–72 hours
- Order access tokens (sent in receipt): 30+ days
- Files and rendered PDFs: ~7 days
- Transactional metadata: longer-lived, exact duration to be approved

All durations must be configurable. Do not hardcode them.

**Option A (ultra-short, under 24 hours) rejected** — too weak for failure recovery and support.  
**Option C (30+ days convenience retention) rejected** — conflicts with data-minimization posture.

**Exact durations remain OPEN** — see below.

---

### Account scope — LOCKED: Option B (guest-first with later save-details path)

**Locked choice:** Launch guest-first. No account required at MVP. Design preserves the option for
a save-details account flow in a later phase.

**Option A (guest-only, no future account path) rejected** — weak for repeat use.  
**Option C (explicit accounts at launch) rejected** — too much auth complexity for launch.

---

### Address validation behavior — LOCKED: Option B (soft validation with warnings)

**Locked choice:** Soft validation with explicit user warnings. Swiss PLZ format check (4 digits),
city lookup where available. Warn on issues but do not block submission.

See [`../04-product/postal-dispatch.md`](../04-product/postal-dispatch.md).

**Option A (no validation) rejected** — too risky and support-heavy.  
**Option C (hard-blocking on every mismatch) rejected** — too rigid for real addresses.

---

### Recipient search scope — LOCKED: official company search only + manual person entry

**Locked choice:** Assisted recipient lookup is limited to **companies and registered organizations**
using an official Swiss business registry source. Person lookup is manual-only.

Operational direction:

- use official company search for business recipients
- keep registry credentials server-side only; browser access goes through episto backend-owned
  infrastructure instead of direct third-party calls
- do **not** use consumer people directories or broad web-search agents to guess private-person
  addresses
- when the user names a company but no postal address is confirmed yet, allow manual entry and then
  run the locked soft address validation flow

**Option A (broad people + company search) rejected** — weak reliability, privacy concerns, and poor
production trust posture.  
**Option C (no assisted company search at all) rejected** — too much avoidable typing for common
B2B recipients.

---

### AI context persistence — LOCKED: app-owned canonical state, provider thread as cache

**Locked choice:** episto owns canonical AI context in application data (draft fields +
conversation history). Provider-side thread or conversation IDs may be stored for resume efficiency,
but they are **not** the source of truth.

Operational direction:

- store provider conversation/thread identifiers and retention metadata with the draft/session
- when the provider thread is still valid, reuse it
- when the provider thread has expired, recreate provider context from canonical app state instead of
  silently continuing with stale remote memory
- do not clear a valid user draft just because the provider-side thread expired

**Option A (provider thread is the only source of truth) rejected** — too fragile and vendor-bound.  
**Option C (discard the entire app draft when provider retention expires) rejected** — bad recovery UX
and unnecessary data loss.

---

### Standard-mail confirmation wording — LOCKED: Option B (separate reference from tracking)

**Locked choice:** Strictly separate "provider reference" from "tracking." Never label a reference
as tracking unless the provider actually supports tracking queries for that reference type.

**Option A (show any reference as tracking) rejected** — overpromises.  
**Option C (hide all references for standard mail) rejected** — too conservative if a useful
reference exists.

---

### Queue strategy — LOCKED: BullMQ + Redis

**Locked choice:** BullMQ + Redis for all async job processing.

**Option A (no queue) rejected** — too fragile for rendering, retries, and cleanup.  
**Option C (heavier workflow engine) rejected** — too much setup overhead for MVP.

---

### Validation strategy — LOCKED: Zod shared schemas

**Locked choice:** Shared Zod schema layer in `shared/`. Both frontend and backend import from
there. No hand-duplicated validation.

**Option A (manual duplicated validation) rejected** — guaranteed drift.  
**Option C (generated contract toolchain from day one) rejected** — setup cost too high now.

---

### Auth approach at launch — LOCKED: effectively no accounts at first launch

**Locked direction:** No account system at initial launch. When accounts are introduced, use a
standard managed auth/session layer.

**Option C (heavy IAM platform from day one) rejected** — overkill for MVP.

---

### Monitoring baseline — LOCKED: structured logs + error tracking + alerting

**Locked choice:** Structured application logs plus a hosted error tracking and alerting service.

**Option A (application logs only) rejected** — insufficient once payments and dispatch are live.  
**Option C (enterprise observability stack) rejected** — too heavy for launch.

---

### Multi-page support — LOCKED: up to 5 pages allowed

**Locked choice:** Body text may span up to 5 pages. Additional pages carry a header with page
numbers. Signature block stays on the final page.

See [`../04-product/document-template.md`](../04-product/document-template.md).

---

### Admin auth at MVP — LOCKED: backend-managed Microsoft SSO (tenant-only)

**Locked choice:** Admin access uses backend-managed Microsoft OAuth with a signed HTTP-only session
cookie. Access is authorized by the configured WestBay tenant (`ADMIN_MICROSOFT_TENANT_ID`); any
identity token from a different tenant is denied. No Basic Auth fallback exists.

See [`admin-build-pack.md`](../06-build-packs/admin-build-pack.md).

---

### Email required at checkout — LOCKED

Email address collection at checkout is mandatory. It is the only dependable contact handle for
guest confirmations and support.

See [`../04-product/auth-billing-accounts.md`](../04-product/auth-billing-accounts.md).

---

### Draft questioning cadence — LOCKED: one primary gap at a time

**Locked choice:** The drafting experience asks one primary missing-data question at a time.
Tightly coupled structured subfields may be collected together only when a split interaction would
be more awkward than helpful, such as address blocks or compact date-choice clusters.

**Option A (strictly one single field every time) rejected** — too rigid for address and similarly
coupled inputs.  
**Option C (regular grouped question batches) rejected** — too close to a form dump and too easy to
degrade the guided-feeling UX.

---

### Attachment stage in flow — LOCKED: after first draft exists, editable through review

**Locked choice:** Attachments can be uploaded only after a draft exists. They are available from
the workspace once the first draft is generated and remain editable on the review step. No new
attachments are added during checkout.

**Option A (review-only attachment upload) rejected** — too late and too easy to create avoidable
backtracking.  
**Option C (attachment upload before any draft exists) rejected** — pulls the product toward a PDF
mailing utility instead of a guided letter workflow.

---

### Non-legal-service disclaimer prominence — LOCKED: calm reminder plus explicit checkout acknowledgment

**Locked choice:** The product uses a low-friction informational disclaimer in discovery/help
surfaces and a single explicit acknowledgment at checkout. It must not dominate the drafting
experience, but it must be unmissable before payment.

**Option A (heavy warning banner throughout drafting) rejected** — adds anxiety and makes the
product feel defensive.  
**Option C (terms-link only, no explicit checkout acknowledgment) rejected** — too easy to miss for
a high-stakes product boundary.

---

### Email provider — LOCKED: Resend

**Locked choice:** Resend for all transactional email.

**Why Resend over Postmark:**

- React Email native integration — template authoring and compilation in one ecosystem
- Cleaner TypeScript SDK with better error types
- $0 up to 3,000 emails/month (covers the entire MVP runway); $20/mo after
- EU data region available; DPA available on request
- Deliverability is production-grade and has closed the gap with Postmark for transactional volume

**Option B (hosting vendor mail) rejected** — vendor mail products are not designed for
programmatic transactional sending at the reliability level required.
**Option C (custom mail infrastructure) rejected** — operational burden, no deliverability benefit.

Adapter module: `notifications/adapters/resend.ts`. Use `resend` npm package. Never call Resend SDK
outside the adapter.

---

### Exact retention durations — LOCKED: recommended defaults (pending legal sign-off)

**Direction is locked.** The following defaults are recommended for implementation. They must remain
configurable via environment variables and must not be hardcoded. Final values require explicit
approval before launch.

| Item                          | Recommended default                  | Rationale                                                              |
| ----------------------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| Session cookie + resume token | 72 hours                             | Enough for abandonment recovery; not long enough to become a liability |
| Draft content + files         | 7 days after last activity           | Covers support window and dispatch confirmation lag                    |
| Rendered PDFs                 | 24 hours after dispatch confirmation | No reason to retain after confirmed handoff                            |
| Payment + dispatch metadata   | 7 years                              | Swiss accounting obligation (OR 3rd and 4th AML cycle); do not delete  |
| Support/audit events          | 3 years                              | Dispute resolution window                                              |
| Resume link auto-send trigger | 48 hours of inactivity (no payment)  | Not too soon to feel spammy; not so late the user has forgotten        |

Config keys: `SESSION_TTL_HOURS`, `CONTENT_RETENTION_DAYS`, `PDF_RETENTION_HOURS_POST_DISPATCH`,
`METADATA_RETENTION_YEARS`, `RESUME_INACTIVITY_HOURS`.

Do not hardcode any duration in application logic.

---

### AI provider vendor — LOCKED: Azure OpenAI / Azure AI Foundry Models API

**Locked choice:** Use Azure-hosted model APIs for all AI drafting. The backend owns all model
interaction through a dedicated adapter. The frontend never talks to Azure directly.

**Locked defaults:**

- Drafting and revision: `gpt-4.1`
- Classification, extraction, and follow-up generation: `gpt-4.1-mini`
- Exact deployment names, region, and API version stay in environment config, not in business logic

**Why this over alternatives:**

- Matches the chosen Microsoft/Azure procurement path
- Keeps AI credentials, rate limits, and auditability inside one enterprise platform
- Preserves the existing backend-owned adapter pattern and SSE streaming model
- Gives room to swap exact deployment names without rewriting feature code

**Option B (direct non-Azure vendor API) rejected** — conflicts with the chosen Azure-centered AI
procurement path.
**Option C (self-hosted or open-weight inference stack) rejected** — operational burden and quality
risk are not acceptable for MVP.

Adapter module: `ai/adapters/azure-openai.ts`. Keep Azure execution config environment-driven.
Default Azure OpenAI execution uses `AI_PROVIDER_MODE=azure_openai` with
`AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_API_VERSION`,
`AI_DRAFT_MODEL`, and `AI_CLASSIFY_MODEL`. Optional Azure AI Project agent execution may use
`AI_PROVIDER_MODE=azure_ai_project_agent` with `AZURE_AI_PROJECT_ENDPOINT`,
`AZURE_AI_AGENT_NAME`, and `AZURE_AI_AGENT_VERSION`, while still remaining inside Azure identity
and backend-owned adapter boundaries.

---

### Dispatch provider path — LOCKED: ePost / KLARA oneAPI (`api.epost.ch`)

**Locked choice:** MVP dispatch implementation targets the current ePost / KLARA oneAPI surface at
`api.epost.ch`, exercised behind a episto-owned adapter boundary. Do not build the MVP around
SmartSend or partner-provider fallbacks unless a newer decision record explicitly supersedes this
one.

**Rules:**

- Build and evolve the adapter only from current provider-issued docs plus live validated tenant
  behavior captured in `swiss-post-appendix.md`
- Keep tracking/reference behavior honest until Swiss Post confirms what each returned identifier
  actually means
- Keep dispatch state normalization on the app side; never expose raw provider semantics to the UI
- Keep sender/return-address semantics marked as **still unproven for actual physical returns**:
  live provider UI evidence now shows request-level sender identity on delivered mail, but not yet
  real undeliverable return routing

**Option B (ePost SmartSend / routed product path) rejected for MVP** — SmartSend is a different
product surface and not the one we have current public API docs plus live tenant validation for.
**Option C (partner fallback provider) rejected for MVP** — weakens the direct provider story and
adds another contract surface before launch.

Adapter module: `dispatch/adapters/epost.ts`. Auth handling, payload mapping, pricing preview,
submission normalization, and tracking lookup rules must come from current provider docs, not from
guesswork or old legacy material.

---

### Hosting topology — LOCKED: VPS with Docker Compose

**Locked choice:** Production infrastructure runs on a single VPS with Docker Compose. All services
(frontend, backend, worker, nginx proxy, PostgreSQL, Redis, MinIO) run as containers on one host.

**Locked topology direction:**

- All services defined in `docker-compose.prod.yml`, driven by `/etc/episto/production.env`
- nginx proxy handles TLS termination, same-host `/api` routing, and static asset serving
- `render-prod-proxy.sh` generates nginx config from environment variables at container start
- PostgreSQL and Redis run as containers on the same host
- Files and rendered PDFs live in S3-compatible object storage (MinIO or external provider)

**Operational rule:** The application targets standard PostgreSQL, Redis, and S3 interfaces so
infrastructure remains swappable. Migration to managed services or Kubernetes is a post-MVP concern.

---

### Resume link auto-send timing — LOCKED: 48-hour inactivity trigger

**Locked choice:** Send the resume email 48 hours after the last draft activity if no payment has
been completed and a session email exists.

- 48h is long enough to distinguish genuine abandonment from a short break
- Only one resume email per session (do not spam)
- Only sent if `session.email` is set (user must have provided it at checkout or earlier)
- Token expiry: **72 hours** from session creation — matches `SESSION_TTL_HOURS`

Config key: `RESUME_INACTIVITY_HOURS` (default: 48). The send itself is a BullMQ job scheduled
when session email is collected, cancelled if payment completes first.

---

### MVP launch pricing — LOCKED: provider quote + episto markup

**Locked choice:** Charge the live provider quote for the actual draft plus a configurable episto
markup.

**Rationale:**

- Keeps checkout truthful to real provider economics instead of faking static launch totals
- Preserves a configurable episto margin without inventing unsupported provider surcharges
- Keeps payment capture, receipts, and support handling aligned with the actual charged amount

**Locked exclusions at launch:**

- no page-count surcharge
- no attachment surcharge
- ~~no coupon/promotion system~~ — **reversed 2026-07-28, see below**
- no color-printing tier

Config keys:

- `PRICE_STANDARD_MARKUP_CENTS`
- `PRICE_REGISTERED_MARKUP_CENTS`

Do not hardcode the markup values in business logic. Read them from config, compute the provider
quote per draft, and persist the final charged amount on the payment record.

---

### Coupons and promotions — REVERSED 2026-07-28: promo codes are live

**Previous lock:** no coupon or promotion system at launch (recorded above and in
[`../04-product/pricing-structure.md`](../04-product/pricing-structure.md)).

**Reversed on 2026-07-28.** A promo-code system is implemented and reachable in production.

**What shipped:**

- `backend/src/db/schema/promos.ts:17` — `promo_codes` table with a `promo_kind` enum of
  `free | percent | fixed` (`:15`), plus `active`, `expiresAt`, `maxRedemptions`, and
  `redeemedCount` controls.
- `backend/src/modules/payments/promo.service.ts:42` — `applyPromoToTotal` resolves the code and
  computes the discounted total; it rejects unknown or inactive codes (`:62`), expired codes
  (`:63`), and codes at their redemption cap (`:64`).
- `backend/src/modules/payments/promo.service.ts:89` — `recordPromoRedemption` consumes a
  redemption under a conditional update that re-checks `active`, expiry, and the cap atomically
  (`:103`–`:107`), so a concurrent race cannot exceed `maxRedemptions`.
- `backend/src/modules/payments/payment-checkout.routes.ts:35` — checkout accepts an optional
  `promoCode` string; `:120`–`:122` applies it and recomputes the charged total.
- Administration: `backend/src/modules/admin/admin-promos.routes.ts:35` (list, create, patch) with
  the UI at `frontend/src/app/[locale]/admin/promos/page.tsx`.
- Customer entry point: the promo field on
  `frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx:374`.

**Locked properties of the reversal:**

- **Validation and discount application are server-side only.** The client submits a code string;
  it never submits or influences a price. The charged total is recomputed in the checkout route
  before the payment intent is created.
- Individual codes are data, not code. No promo code is hardcoded in the repository; codes are
  created and deactivated through the admin panel.
- The persisted charged amount on the payment record remains the source of truth, unchanged by
  this reversal.

---

## OPEN decisions (implementation-blocking)

Development of features that depend on these items must not assume a resolution.

At this point, no remaining open decision is purely internal. The only open items depend on current
provider onboarding facts that are still outside the repository.
