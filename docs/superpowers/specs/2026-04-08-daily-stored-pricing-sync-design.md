# Daily Stored Pricing Sync Design

## Problem

Swiss Mail already has the beginnings of a stored pricing model, but it is not complete enough to be
trusted.

Today:

- the repository has `provider_rate_matrix_versions` and `provider_rate_matrix_entries`, but no real
  refresh path that populates them from the provider
- the scheduled refresh worker only retires expired versions; it does not build a new canonical matrix
- draft preview and other display surfaces can still fall back to legacy static reference pricing via
  `calculatePrice()`, which is not the same truth source as the stored matrix
- display pricing can fail simply because the stored matrix is empty, even though the intended product
  model is to serve display pricing from stored provider data rather than making request-time provider
  calls

The user decision for this design is:

- **display pricing uses stored provider prices**
- **checkout keeps using the live draft-specific provider quote**
- **the repository should be cleaned up on this topic rather than layering new pricing paths on top of
  old ones**

The goal is a prod-ready pricing architecture where Swiss Mail refreshes a canonical provider-backed
matrix every morning, serves app display pricing from that stored matrix, and can be seeded manually
on demand without inventing prices.

## Scope

### In scope

- a real provider-backed daily rate-matrix refresh path
- use of stored pricing for public and in-app display surfaces
- retention of live provider quotes for checkout truth only
- cleanup of legacy runtime display pricing on this topic
- a manual command to run the same sync path immediately after deployment or repair
- scheduling, failure behavior, and test coverage for the stored-matrix flow
- doc updates for pricing truth and operating instructions

### Out of scope

- changing checkout to charge purely from stored rates
- adding pricing dimensions that are not currently verified in provider evidence
- speculative multi-attachment pricing beyond the current `single_hint` model
- international delivery pricing
- unrelated cleanup outside the pricing sync / display pricing topic

## Decisions

- **Display-only stored pricing, live checkout truth.**
  All non-checkout display pricing should use the stored provider matrix. Payment creation and the
  final checkout amount must still use the live draft-specific provider quote path.

- **One canonical stored-matrix model.**
  Do not introduce a second display-pricing cache or a flat reference-prices table. Reuse the
  versioned matrix tables already present in the schema.

- **Reference pricing probes belong behind the postal adapter boundary.**
  Provider-specific request building and response parsing for matrix refresh must stay inside the
  dispatch adapter implementation, not in workers or route modules.

- **The matrix stays explicit about its pricing dimensions.**
  Even when some values are fixed today, stored rows should retain the full verified pricing key:
  `postage`, `numberOfPage`, `attachmentMode`, `shippingCountry`, `envelopeSize`, `windowLocation`,
  and `duplex`.

- **The last successful matrix remains readable for display surfaces even when stale.**
  A failed morning sync should not blank all display pricing if yesterday's stored matrix is still the
  best known truth. Freshness should be explicit, not hidden behind accidental outages.

- **Legacy runtime display pricing should be removed, not preserved as a parallel path.**
  `calculatePrice()` and the hardcoded ePost reference constants should stop powering draft/runtime
  display pricing. Stored-matrix reads should become the single display-pricing source.

## Design

### 1. Canonical pricing dimensions

The stored matrix should cover the currently supported Swiss Mail display-pricing surface only:

| Dimension | Current scope |
| --- | --- |
| `postage` | env-mapped `A_POST` for standard, env-mapped `REGISTERED` for registered |
| `numberOfPage` | `1..5` |
| `attachmentMode` | `none` or `single_hint` |
| `shippingCountry` | `CH` |
| `envelopeSize` | `C5` |
| `windowLocation` | `LEFT` |
| `duplex` | `false` |

This produces a small, explicit, verified matrix:

- 2 delivery/postage variants
- 5 page counts
- 2 attachment modes
- fixed Swiss domestic assumptions already used elsewhere in the pricing system

That is 20 provider-backed entries per successful refresh. The design deliberately does not invent
unsupported dimensions or ambiguous provider behavior.

### 2. Sync architecture

Introduce a dedicated sync service in
`backend/src/modules/dispatch/dispatch-rate-matrix-sync.service.ts`.

Its responsibilities:

1. build the canonical probe set for the supported dimensions
2. call the dispatch adapter for each probe
3. write a new matrix version and its entries
4. validate completeness before activation
5. promote the new version to active only after the whole matrix succeeds

The dispatch adapter interface should gain a reference-pricing probe method specifically for canonical
stored pricing inputs:

- `quoteReferencePrice(input: DispatchPricingInput): Promise<{ providerQuotedCents, providerQuoteReference, quotedAt }>`

This is intentionally separate from the live draft quote method. The live quote path depends on a real
draft package and checkout semantics. The stored-matrix refresh path depends on canonical reference
inputs only. Both belong inside the adapter boundary, but they serve different truths.

The ePost adapter should implement the reference probe via the preview pricing endpoint already used
for live quoting. The stub adapter should remain explicitly unavailable and surface a provider outage
error rather than faking prices.

### 3. Matrix version lifecycle

Each sync run should create a new version row first, with:

- `provider_name`
- `status = 'building'`
- `source_endpoint`
- `created_at` / `updated_at`

Then the sync should probe and insert all expected matrix entries under that version.

After all expected entries are stored and validated:

1. mark previously active versions as `retired`
2. mark the new version as `active`
3. set `verified_at`
4. set `effective_at`
5. set `expires_at = verified_at + DISPATCH_RATE_MATRIX_TTL_HOURS`

If any probe fails or the matrix is incomplete:

- mark the new version `failed`
- persist the `failure_reason`
- keep the previously successful version unchanged

This promotion must be atomic from the perspective of readers: the app should never observe a partial
matrix as the active one.

### 4. Read path cleanup

Display pricing should be refactored around one shared stored-matrix reader instead of a mixture of
static pricing helpers and matrix lookups.

This cleanup should include:

- replacing blank-draft preview pricing fallback with a stored-matrix reference read
- removing draft/runtime reliance on `calculatePrice()`
- keeping public pricing mapped from the active stored matrix
- keeping `resolveDisplayDispatchQuoteForDraft()` on stored pricing, but updating it to read the last
  successful matrix even when it is stale

`backend/src/modules/pricing/index.ts` must stop participating in runtime display pricing. If it still
has a real marketing/reference-only purpose after cleanup, keep it scoped to that role. If it has no
remaining production caller after this cleanup, delete it in this work.

The intended end state is:

- **public pricing page** -> stored matrix
- **draft preview / review estimated totals** -> stored matrix
- **checkout amount and charge creation** -> live provider quote

No request-time provider calls should remain in non-checkout display pricing paths.

### 5. Freshness and failure behavior

Freshness should come from `expiresAt`, not from whether a cron happened to run on time.

Behavior rules:

- if a fresh matrix exists, display pricing uses it normally
- if only a stale last-successful matrix exists, display pricing still uses it
- the public pricing contract should expose stale freshness explicitly; draft preview/review do not
  need new stale UI in this design
- if no successful matrix has ever existed, display pricing returns `pricing unavailable`
- a failed sync must not retire or delete the last successful matrix

This avoids a prod-hostile design where one missed morning run turns all display pricing into an
outage.

The old retire-only worker logic should be removed or folded into the explicit sync/promotion flow.
The code should no longer have a scheduled job whose main effect is to age pricing out without also
replacing it.

### 6. Scheduling and manual seeding

The BullMQ schedule should change from the current hourly sentinel pattern to a true daily morning
refresh.

Use an environment-backed cron string:

- `DISPATCH_RATE_MATRIX_REFRESH_CRON`

with a morning default such as `5 6 * * *`.

This keeps the schedule deployment-configurable without code edits.

In addition, add a manual backend command that calls the same sync service directly:

- `npm run dispatch:refresh-rates -w backend`

That command should:

- run one full matrix refresh immediately
- exit non-zero on failure
- print a concise success summary including version id, entry count, freshness window, and whether the
  new version became active

Operationally, “run it once now” after implementation should use this command rather than a special
one-off code path.

### 7. Targeted cleanup for a prod-ready repository

This work should clean up pricing logic on the topic it touches, because the repository is not yet
live and should be ready for prod rather than carrying redundant legacy behavior.

Targeted cleanup includes:

- removing or narrowing the old static display-pricing helper if runtime code no longer needs it
- renaming or replacing `refreshDispatchRateMatrixIfNeeded()` so its name and behavior match reality
- deleting tests that only protect the old retire-only scheduling model
- consolidating display-price reads around one stored-pricing reader instead of duplicating selection
  logic in multiple modules

This is a targeted cleanup, not a license for unrelated refactors elsewhere in the repo.

### 8. Testing

Add or update backend tests for:

- successful matrix sync and activation
- partial sync failure keeping the previous successful version
- stale matrix reads still working for display surfaces
- no-successful-matrix behavior returning pricing unavailable
- blank-draft preview pricing reading the stored matrix instead of static fallback constants
- queue registration using the daily configurable schedule
- manual sync command success and failure exits
- checkout quote path remaining live and unchanged

Add regression coverage around the adapter reference-pricing probe so the mapping from canonical
pricing input to ePost preview pricing stays explicit and reviewable.

### 9. Documentation updates

Update the docs so the written source of truth matches the new implementation:

- `docs/04-product/pricing-structure.md`
  - display pricing comes from the stored daily provider matrix
  - checkout still uses the live draft-specific provider quote
- `docs/07-operations/deployment-and-ci.md`
  - add the morning refresh env/config and the manual seed command
- any relevant pricing or architecture docs that still describe display pricing as static or purely
  code-derived

The docs should make the distinction clear:

- stored provider matrix for display truth
- live provider quote for checkout truth

## Implementation shape

Expected file-level changes are likely to include:

- **create or replace** a real dispatch rate-matrix sync service
- **extend** the dispatch adapter interface with a reference-pricing probe method
- **update** the ePost adapter to implement that probe
- **update** queue registration to use a daily cron env key
- **update** the refresh worker to run the real sync path
- **create** a manual backend sync command
- **refactor** display pricing readers to use stored matrix data only
- **remove or narrow** legacy static runtime pricing helpers
- **update** pricing, queue, preview, and worker tests
- **update** pricing and ops docs

## Success criteria

This design is complete when all of the following are true:

1. a morning scheduled job can build and activate a full stored provider matrix
2. a one-off command can seed the same matrix immediately
3. draft preview/review and public pricing no longer depend on request-time provider calls
4. checkout still uses the live draft-specific provider quote
5. failed refresh runs do not wipe the last successful display pricing source
6. blank-draft and other display pricing no longer rely on hardcoded runtime reference totals
7. the pricing docs and ops docs describe the same truth the code now implements
