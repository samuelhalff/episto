# Pricing page canonical source design

## Problem

The current pricing page is trying to do two jobs at once:

1. explain Swiss Mail pricing in enough detail to reduce anxiety
2. reassure the user that the prices are real and current

It currently falls short on both.

- The page repeats the same trust message across too many sections, which makes the content feel padded instead of precise.
- The backend pricing endpoint that powers the page is still built from hardcoded reference constants, so the public page can drift from the prices used inside the product.
- The UI already talks like the prices are backend-driven and current, but the implementation does not yet match that claim.

The result is a page that is detailed, but not clean enough, and honest in tone, but not yet honest enough in source wiring.

## Goal

Create a pricing page that is:

- clean and professional
- comprehensive without repetition
- explicit about every meaningful pricing input
- backed by the same stored pricing source used by the app
- honest about freshness when the provider sync is stale

The page should feel like a serious pricing document, not a marketing collage.

## Explicit product decision

This design follows the newer product direction for pricing truth:

- Swiss Mail stores provider pricing through a scheduled daily sync
- the app and the public pricing page both read from that same stored pricing source
- the pricing page must expose freshness metadata so users can see when the prices were last synced

This replaces the current pricing-page implementation pattern of deriving public values from embedded local constants.

## Non-goals

Out of scope for this design:

- a broader marketing-page redesign
- reworking checkout layout beyond the pricing-source contract it consumes
- adding speculative provider claims about delivery speed, tracking, or guarantees
- exposing internal operational language such as cron, queue, worker, or API job status in user-facing copy

## Approved approach

Rebuild `/pricing` around one canonical pricing story.

- Keep the route focused on pricing truth rather than sales repetition.
- Replace the current overlapping cards with one primary totals card, one sync-status banner, one itemized provider-rate area, one standard-vs-registered comparison, and concise included/excluded and FAQ sections.
- Expand `/v1/pricing` with sync metadata and source the full response from the stored pricing snapshot used by the app.
- Show stale prices when a previous snapshot exists, but mark them clearly and display the sync timestamp.
- If no snapshot exists at all, show the pricing-unavailable state rather than fabricating values.

## Page structure

### 1. Hero

Keep the pricing page headline simple:

- title: `Simple, honest pricing`
- subtitle: one sentence explaining that the page shows the current stored Swiss Mail pricing inputs and how totals are built

The hero should not carry the whole trust burden. It should orient the user, then quickly hand off to real pricing data.

### 2. Sync-status banner

Place a dedicated status block immediately under the hero.

It should show:

- pricing source/provider name
- last synced timestamp
- freshness state

If the data is stale, the warning must be explicit and visually prominent, but the last synced prices remain visible.

This is the most important new trust surface on the page. Freshness should be visible before the user reads any totals.

### 3. Primary totals card

Use one primary summary card instead of the current split between multiple overlapping summary/service cards.

Show only the decision-making totals:

- standard total
- registered add-on
- registered total

Add one short explanatory note under the totals:

- the public page uses the same stored pricing source as the app
- the app then calculates the actual draft total from the draft's real pages, sheets, envelope, and delivery choice

This keeps the top of the page scannable while still grounding it in the real pricing model.

### 4. Itemized pricing area

Break this into two clear tables.

#### 4.1 What makes up the total

This table explains the charged structure at a glance:

- Swiss Mail service fee
- provider standard reference total
- provider registered reference total

This gives the user the commercial breakdown without burying them in mechanical print inputs too early.

#### 4.2 Provider unit rates

This table lists the concrete provider-side inputs users expect to see when they want to verify the math:

- printed page
- physical A4 sheet
- C5 envelope
- C4 envelope
- standard postage
- registered postage
- first sheet, simplex
- first sheet, duplex
- additional sheet, simplex
- additional sheet, duplex

The reference scenario explanation appears once in this area and nowhere else.

The goal is completeness without echoing the same explanation across multiple cards.

### 5. Standard vs registered comparison

Keep a compact comparison table with only the rows that affect understanding and choice:

- service level wording
- provider reference / tracking wording
- confirmation wording
- price

Do not add filler rows just to make the table feel bigger.

### 6. Included / not included

Keep both sections because they strengthen trust, but make them shorter and calmer.

Included wording should foreground the outcome, not the internal mechanism. Prefer:

- drafting assistance
- formatting
- PDF generation
- postal submission handling
- receipt and confirmation handling

Avoid AI-forward marketing phrasing here unless it is necessary for user understanding.

### 7. Pricing FAQ and CTA

Keep a short pricing FAQ covering:

- rejection before capture
- refund handling
- volume discounts
- VAT treatment

Keep the CTA band, but subordinate it to pricing truth. The CTA should feel like a next step, not a reset into sales language.

## API and pricing-source design

### Canonical backend source

`/v1/pricing` must stop deriving its values from embedded local pricing constants.

Instead, both:

- the public pricing response
- the app's own pricing calculations

must resolve through the same backend pricing snapshot service backed by the stored provider sync.

This is the key contract change that removes drift between marketing and product.

### Expanded `/v1/pricing` response

Keep the existing totals and provider-breakdown data where possible so the frontend change can stay surgical.

Add a top-level sync metadata object dedicated to freshness display. It should include:

- provider/source label
- last synced timestamp as an ISO datetime
- freshness state (`fresh` or `stale`)

The pricing page should use this sync object for its banner and freshness copy instead of the current static date-oriented wording.

### Reference scenario

The public page should still expose one documented reference scenario so the totals remain explainable and comparable.

However, the source of the rates is no longer hardcoded page math. The reference scenario should be built from the stored pricing source and returned as part of the same response contract.

## State behavior

### Fresh

If the latest pricing snapshot is within the backend-defined freshness window:

- show prices normally
- show the last synced timestamp
- show a normal freshness label

### Stale

If the latest available pricing snapshot exists but is outside the freshness window:

- still return the last synced prices
- mark the response as stale
- show the timestamp
- show a prominent stale warning on the page

The stale warning must be direct. It should say that the displayed prices come from the last successful provider sync and may be outdated until the next update.

### Missing

If no pricing snapshot exists at all:

- do not fabricate prices
- show the page-level unavailable state

This is the only acceptable no-data fallback.

## Copy and tone rules for this page

The pricing page copy should follow these rules:

- sentence case throughout
- direct, calm, factual wording
- no hype
- no repeated "trust me" phrasing
- no AI-marketing-heavy language in hero or section framing
- no user-facing operational jargon like cron, queue, worker, or webhook

The page should sound like Swiss Mail knows exactly what it is charging and is willing to show the math plainly.

## Documentation updates required

This design changes pricing-source truth and therefore requires doc updates during implementation.

Update the relevant pricing and route specs so they reflect:

- stored synced pricing as the canonical source
- sync freshness metadata on the pricing page
- stale-state behavior that still shows the last synced prices

The docs must not keep describing this page as if it were powered by local reference constants.

## Regression coverage

### Backend

Add coverage for:

- fresh snapshot mapping into `/v1/pricing`
- stale snapshot mapping into `/v1/pricing`
- no-snapshot unavailable behavior

### Shared contracts

Add coverage for:

- required sync metadata shape
- freshness status validation

### Frontend

Add coverage proving:

- the page renders the sync-status banner from API data
- stale pricing still renders amounts and also renders the warning
- the core line items and provider unit-rate tables exist
- the rewritten page does not depend on hardcoded CHF values
- the older repetitive section structure is removed rather than layered on top of the new one

## Risks and guardrails

- Do not let the page claim "current" pricing unless that judgment comes from the backend freshness state.
- Do not hide stale pricing silently.
- Do not show prices when there is no stored snapshot.
- Do not reintroduce repetitive trust copy to compensate for uncertainty. Use the sync banner and the itemized tables instead.
- Do not let frontend components invent freshness logic; the backend owns pricing truth.

## Result

The finished pricing page should read like a canonical source of truth:

- one pricing source
- one freshness signal
- one clean top-level summary
- one place to inspect the math

That is what makes it both comprehensive and professional.
