# Provider Quote Caching and Review Hook Fix Design

## Problem

Swiss Mail's current pricing path is doing too much work too late, and it is no longer internally
consistent.

The issues are now coupled:

- review and checkout want fast, trustworthy pricing, but the live quote path is configured to be
  aggressively fresh and can hit the provider repeatedly across the same customer flow
- the live quote route currently requires a latest snapshot, while the review page asks for pricing
  before the review mutation creates that snapshot, so first-visit review pricing can fail for a
  structural reason rather than a transient outage
- preview/review code still exposes `priceCents` from the static reference `calculatePrice()` path,
  while checkout uses the live ePost quote path, so adjacent product surfaces are mixing reference
  pricing and provider pricing
- the latest review-page refactor introduced React hooks below loading/error early returns, which
  now triggers a hook-order violation in `ReviewPage`

The goal is not to replace provider truth with a guess. The goal is to keep the live provider quote
as the checkout truth while making review and checkout fast, stable, and operationally resilient.

## Scope

### In scope

- quote resolution for review and checkout
- provider-backed price caching and refresh strategy
- exact pricing dimensions stored for Swiss Mail's supported physical-letter flow
- background refresh job design and failure behavior
- removal of non-marketing use of the static `calculatePrice()` path
- `ReviewPage` hook-order fix
- lint/test guardrails for this class of regression

### Out of scope

- changing checkout truth to a purely stored-rate engine
- adding speculative provider dimensions that are not currently documented or verified
- expanding attachment pricing beyond the currently verified singular attachment hint behavior
- international delivery pricing
- admin UI design for pricing inspection beyond the minimum needed for operational visibility

## Decisions

- **Keep the live provider quote as checkout truth.**
  Review and checkout may display cached or precomputed prices, but payment creation must still
  require a provider-backed live quote for the exact draft pricing input.

- **Introduce a hybrid pricing model: active rate matrix plus live quote cache.**
  The matrix exists for fast UI and resilience. The live quote cache exists so the exact provider
  quote does not need to be re-fetched on every adjacent step.

- **Stop using `calculatePrice()` outside marketing/reference surfaces.**
  `backend/src/modules/pricing/index.ts` remains the marketing/reference scenario module only.
  Draft preview, review, and checkout pricing must resolve through the same quote service family.

- **Quote inputs must be keyed by exact provider-facing pricing dimensions, not only UI delivery
  labels.**
  Stored rows must reflect the effective ePost request shape used for physical preview pricing.

- **Use freshness-driven scheduling, not a fragile local-time cron as the single source of truth.**
  The system should survive DST changes, app restarts, and temporary outages without serving a
  partial matrix or silently disabling pricing.

- **Fix the React bug structurally, not cosmetically.**
  `ReviewPage` should be split into a loader shell plus a ready-state child component so memo and
  callback hooks cannot drift below early returns again.

- **Add automated guardrails.**
  The repository should enforce React hook rules in ESLint and add targeted regression coverage for
  pricing flow and ready-state rendering.

## Design

### 1. Supported pricing dimensions

For Swiss Mail's current physical-letter scope, the effective pricing key should include the exact
provider-facing inputs below:

| Field | Why it matters | Current Swiss Mail scope |
|---|---|---|
| `postage` | This is the actual ePost physical service selector | `A_POST` for standard, `REGISTERED` for registered via env mapping |
| `numberOfPage` | Public preview pricing explicitly accepts it when no file is uploaded | `1..5` |
| `attachmentMode` | Verified probes show pricing changes when the singular `attachment` hint is present | `none` or `single_hint` |
| `shippingCountry` | Present in the provider request and must stay explicit | currently fixed `CH` |
| `envelopeSize` | Present in the provider request and potentially price-relevant | currently fixed `C5` |
| `windowLocation` | Present in the provider request | currently fixed `LEFT` |
| `duplex` | Present in the provider request and would affect sheet math if enabled later | currently fixed `false` |

These dimensions should remain explicit in storage even when some are fixed constants today. That
keeps the matrix honest about what it represents and avoids reusing stale rows if Swiss Mail later
changes an ePost request default.

Fields that should **not** become pricing dimensions unless real provider evidence proves otherwise:

- recipient or sender names
- sender end-to-end identifiers
- `documentTypes`
- tracking/reference identifiers
- arbitrary attachment count beyond the currently verified singular attachment hint

Because non-Swiss recipient addresses are already hard-blocked in the product flow, the supported
matrix remains deliberately small. In today's scope it is effectively:

- 2 postage/service levels
- 5 page counts
- 2 attachment modes
- with fixed `CH`, `C5`, `LEFT`, and `duplex = false`

That is a small enough surface to refresh and verify safely.

### 2. Data model

Introduce two backend-owned pricing storage layers.

#### 2.1 Provider rate matrix

Add a versioned matrix for precomputed provider prices.

Suggested structure:

- `provider_rate_matrix_versions`
  - `id`
  - `provider_name`
  - `status` (`building`, `active`, `failed`, `retired`)
  - `verified_at`
  - `effective_at`
  - `expires_at`
  - `source_endpoint`
  - `notes` / `failure_reason`
  - `created_at`
  - `updated_at`

- `provider_rate_matrix_entries`
  - `id`
  - `version_id`
  - `postage`
  - `number_of_page`
  - `attachment_mode`
  - `shipping_country`
  - `envelope_size`
  - `window_location`
  - `duplex`
  - `provider_quoted_cents`
  - `currency`
  - `provider_quote_reference` nullable
  - `verified_at`

The matrix stores provider quote values only. Swiss Mail markup stays application-owned and is added
at resolution time so markup changes do not require provider reprobes.

#### 2.2 Live quote cache

Add a separate cache for exact provider-backed quotes already fetched for a draft input.

Suggested structure:

- `draft_quote_cache`
  - `id`
  - `draft_id`
  - `snapshot_id` nullable
  - `pricing_input_hash`
  - `pricing_input` JSONB
  - `source` (`matrix`, `live`)
  - `delivery_type`
  - `postage`
  - `provider_quoted_cents`
  - `swiss_mail_markup_cents`
  - `total_cents`
  - `currency`
  - `provider_quote_reference` nullable
  - `rate_matrix_version_id` nullable
  - `generated_at`
  - `expires_at`
  - `created_at`

`pricing_input_hash` must be deterministic and derived from the exact quote inputs listed above.
That lets review, checkout, and payment creation reuse the same live quote safely when the draft's
pricing-relevant inputs have not changed.

Historical charged truth remains on `payment_attempts.breakdown`. Do not recompute historical
payments from either matrix rows or later live cache entries.

### 3. Shared pricing-input builder

The current quote path is too dependent on snapshot existence. Introduce one shared service that
builds canonical pricing input from either:

- the latest snapshot when one exists and is relevant, or
- the live draft + preview-ready data when the user is still on first review

This builder should produce:

- resolved `postage`
- `numberOfPage`
- `attachmentMode`
- fixed physical-mail constants
- a deterministic `pricingInputHash`

The quote builder must not require a snapshot just to price the first review screen. Snapshot-backed
rendering remains important for dispatch truth, but it is the wrong prerequisite for showing an
early price.

### 4. Quote resolution flow

#### 4.1 Review and checkout display

`GET /drafts/:draftId/quote` should resolve in this order:

1. build canonical pricing input
2. return a fresh **live quote cache** hit when `pricingInputHash` matches and the record is still
   valid
3. otherwise return a **matrix-backed quote** derived from the active matrix version plus current
   markup

This route should also return lightweight source metadata so the backend can distinguish matrix and
live paths operationally. The user-facing UI does not need to expose internal provider jargon, but
the system should know which source it used.

The key behavior change is that review and checkout no longer need to block on a live provider round
trip just to show a trustworthy pre-payment price.

#### 4.2 Payment creation

`POST /drafts/:draftId/checkout` should resolve in this order:

1. build canonical pricing input for the current draft state
2. reuse a fresh **live quote cache** hit when present for the exact `pricingInputHash`
3. otherwise call the ePost preview pricing endpoint once, persist the resulting **live** quote in
   the cache, and use that as checkout truth
4. if the live provider quote cannot be obtained, block payment creation and return a truthful error
   that says payment has not started because live postal pricing could not be verified

This preserves the approved policy:

- cached/precomputed pricing is acceptable on review and checkout
- payment creation still requires a provider-backed quote

#### 4.3 Payment persistence

When payment creation succeeds, persist the live quote breakdown onto the `PaymentAttempt` exactly
once:

- `providerQuotedCents`
- `swissMailMarkupCents`
- `totalCents`
- `postage`
- `attachmentHandling`
- line items
- `providerQuoteReference`

This keeps receipt and order history tied to the actual charged amount, not to the currently active
matrix version.

### 5. Matrix refresh and DST-safe scheduling

Do not rely on one "run every morning in local time" cron as the single safety mechanism.

Use two job layers:

#### 5.1 Hourly sentinel

A repeatable sentinel job runs hourly and checks:

- whether an active matrix exists
- whether the active version is approaching expiry
- whether a newer successful version already exists
- whether a build is already in progress

If refresh is needed, the sentinel enqueues exactly one build job.

This avoids DST problems because the truth boundary is freshness/expiry timestamps, not a single
local wall-clock trigger. If the app is down during one expected run, the next sentinel run can
recover automatically.

#### 5.2 Matrix build job

The build job should:

1. create a new `provider_rate_matrix_versions` row in `building`
2. probe all supported input combinations against the ePost preview pricing endpoint
3. write all entry rows for that version
4. verify completeness and invariants before activation
5. atomically mark the new version `active` and retire the previous version

If the build fails:

- keep the previous active version untouched
- mark the new version `failed`
- emit structured error tracking / operational alerting

Never expose a partially built matrix as active.

### 6. Eliminate pricing drift across product surfaces

Today draft preview and review mutation still compute `priceCents` from the static
`calculatePrice()` reference path. That must change.

Target state:

- `backend/src/modules/pricing/index.ts` stays marketing-only
- draft preview price, if still returned, must come from the same quote resolver family as review
  and checkout
- review mutation must not persist or return a static reference price that can later disagree with
  the provider-backed checkout amount

If the preview payload keeps a `priceCents` field, it should come from the matrix/live quote
resolver. If that field is not needed, it is safer to remove it than to keep a second pricing truth.

### 7. ReviewPage React fix

The hook-order crash is a real Rules of Hooks violation, not a React Query quirk.

The recent refactor added:

- `useReviewPrimaryActionState`
- `useMemo`
- `useCallback`

below `draft.isLoading` / `draft.error` early returns in `ReviewPage`, which changes the hook order
between loading and loaded renders.

The safer repair is structural:

- keep a thin `ReviewPage` shell responsible for route params, query bootstrap, and loading/error
  shells
- move ready-state memo and callback logic into a child component such as `ReviewPageReady`
- keep hook-heavy ready-state code isolated from loading/error branches

This is preferable to merely moving more hooks above the returns because it makes the invariant
obvious and easier to maintain.

### 8. Guardrails and tests

#### 8.1 Lint

Add React Hooks lint rules to the existing ESLint setup so conditional-order regressions are caught
automatically in CI and local development.

#### 8.2 Backend tests

Add coverage for:

- canonical pricing-input building from live draft data without a snapshot
- `pricingInputHash` stability
- matrix lookup correctness for all supported dimensions
- matrix refresh completeness and atomic activation behavior
- quote route behavior on first review when no snapshot exists yet
- checkout blocking when no live provider quote can be obtained

#### 8.3 Frontend tests

Add or strengthen coverage for:

- `ReviewPage` rendering through loading to ready state without hook-order violations
- review and checkout honoring early cached pricing while preserving payment-time blocking
- regression coverage around the ready-state component boundary or equivalent hook-order guard

The current source-inspection test that only checks `useDispatchQuote` above the loading return is
too narrow. This design needs either a stronger structural assertion or a real render-based
regression test for the loading-to-ready transition, plus lint coverage.

## Error handling and user truth

- Review and checkout may show the currently active cached/precomputed price even when a live quote
  is temporarily unavailable.
- Payment creation must fail honestly when live provider pricing cannot be verified.
- Error copy must say that payment has **not** started or been charged when the failure happens
  before payment creation.
- A stale matrix should remain usable only while there is still an active version inside the allowed
  freshness window. If there is no valid active version, pricing should be unavailable rather than
  guessed.

## Risks and guardrails

- Do not treat undocumented provider behavior as pricing truth.
- Do not expand attachment pricing beyond the currently verified singular `attachment` metadata hint.
- Do not assume tracking availability affects price.
- Do not use local-time-only scheduling semantics as the sole freshness mechanism.
- Do not let review/preview/payment surfaces drift onto separate pricing rules again.

## Implementation notes

This design intentionally solves both the pricing architecture and the `ReviewPage` hook bug in one
slice because the current user-visible failure is the result of architectural drift plus a frontend
regression, not of one isolated line-level defect.
