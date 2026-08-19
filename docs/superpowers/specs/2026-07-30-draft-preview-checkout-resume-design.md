# Draft Preview, Checkout, and Resume Prompt Design

**Goal:** Make draft edits immediately trustworthy, make promo pricing explicit before payment, prevent indefinite checkout loading, and help returning users resume unfinished drafts without blocking them.

## Design

Manual body edits continue to use the existing debounced draft PATCH. The preview hook will invalidate its preview query on the same realtime `field_update` event that updates the draft cache, so the backend preview is refetched after persistence. The existing stale indicator remains as a fallback if refresh fails.

Promo validation will be a read-only authenticated backend operation. A new draft-scoped POST endpoint will resolve the current live delivery quote, call the existing `applyPromoToTotal` validator, and return the quote with the discounted total plus promo metadata. It will never reserve a redemption; redemption remains exclusively in checkout transaction creation. The checkout page will debounce non-empty code changes, show validation/loading/error/success states, render the discount and final amount, and disable payment submission when a non-empty code is not currently validated. The final checkout POST continues to recompute the promo server-side.

Checkout initiation will use a bounded client request timeout and surface a recoverable error. The request must not leave the primary action in a permanent pending state.

The returning-draft prompt will be a reusable client component mounted in the shared marketing/site shell. On the first page load of a browser visit it will read the session’s drafts, filter to drafts that are not terminal, and display a dismissible modal listing the resumable drafts ordered by most recent update. Selecting a draft navigates directly to its customer-flow path. Dismissal is stored in session storage; absent drafts, API errors, or storage failures do not block normal site rendering or “write a letter.”

## Data and error contracts

- Promo quote request: `POST /v1/drafts/:draftId/promo-quote`, body `{ promoCode: string }`.
- Success: `{ quote: DraftDispatchQuote, promo: { code, kind, discountCents, finalCents } }`.
- Invalid/expired/inactive/capped code: existing canonical validation error envelope; no redemption mutation.
- Resume prompt treats only customer drafts in resumable statuses as candidates and links through the existing customer-flow path helper.

## Verification

- Route test proves promo quote returns discounted totals and does not call redemption.
- Frontend contract/runtime tests prove preview invalidation, promo validation state, timeout behavior, and resumable prompt filtering/dismissal.
- Run focused tests, workspace typechecks, lint/format checks, and production build before handoff.
