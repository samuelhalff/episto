# Review price loading state design

## Problem

On the review page, the main bottom action is already disabled until a live dispatch quote exists, but while that quote is loading the CTA still looks like a normal inactive button. The nearby `PriceSummary` also uses generic pending copy, so the page does not clearly communicate that pricing is actively being calculated.

This creates a trust gap on a high-anxiety step: the user can see that they cannot continue yet, but the interface does not acknowledge that work is in progress.

## Goal

Make the review page explicitly acknowledge live price calculation by showing:

1. A loading state on the main bottom primary action while review pricing is loading
2. Supporting price-summary copy that matches the same state

The experience should feel deliberate and reassuring, not like a broken disabled button.

## Scope

In scope:

- Review page primary CTA in `frontend/src/app/[locale]/draft/[draftId]/review/page.tsx`
- Supporting messaging in `frontend/src/components/product/PriceSummary.tsx`
- Locale copy needed for the review-specific loading label
- Regression coverage for the new loading-state wiring

Out of scope:

- Broader checkout CTA refactors
- Shared pricing-loading abstractions across the whole app
- New loading skeletons or larger layout changes

## Approved approach

Use a focused review-state improvement.

- Keep the existing safety gate: the CTA remains disabled until a live quote exists.
- While `quote.isLoading` is true and quote fetching is otherwise allowed, the bottom primary action should switch from a silent disabled state to a visible loading state with spinner and review-specific copy such as `Calculating…`.
- During the same state, the CTA must not show the trailing total chip, because there is no trustworthy total to display yet.
- `PriceSummary` should use explicit active-calculation copy during this state so the summary and dock describe the same thing.

## UX details

### CTA behavior

On the review page:

- Normal state: primary action keeps its existing `Proceed to payment` label and total chip
- Quote loading state: primary action shows loading spinner + review-specific calculation label
- Quote loading state: primary action stays non-interactive
- Quote loading state: trailing price chip is hidden

This is a review-specific calculation state, not a payment-processing state, so it should not reuse checkout wording that implies payment is already underway.

### Price summary behavior

During review quote loading:

- Replace passive “pending” style messaging with a more explicit active-calculation message
- Keep the existing total shimmer treatment, since it already signals an unknown total without fabricating a value

The summary should confirm that Swiss Mail is calculating the price right now, not simply waiting on some unspecified prerequisite.

## Technical design

### Review page

Update the review-page CTA logic to derive a dedicated loading state from the quote query, separate from the existing `reviewDraft.isPending` / `updateDraft.isPending` submission state.

The CTA should:

- pass `loading`
- swap its child label to the new review-specific loading copy
- suppress `trailingMeta` while review pricing is loading

### PriceSummary

Extend `PriceSummary` only as much as needed to support review-specific active loading copy.

Preferred shape:

- add an optional prop for a loading message override
- use that override only when `quote.isLoading`
- preserve current behavior for checkout and other callers when no override is supplied

This keeps the component reusable without turning the task into a broader shared-state redesign.

### i18n

Add a new review-specific key in all supported locales for the CTA loading label.

Do not reuse checkout’s `calculatingPayment` key because the review step is calculating price before payment, not processing payment itself.

## Testing

Add focused regression coverage that proves:

1. Review CTA enters a real loading state while quote loading is active
2. Review CTA uses the review-specific loading label in that state
3. Review CTA hides the trailing total chip while loading
4. `PriceSummary` accepts and uses the review-specific loading-copy path without regressing its existing loading behavior

## Risks and guardrails

- Do not show stale or fabricated totals while pricing is loading
- Do not broaden this into a checkout redesign
- Do not replace existing error handling or quote gating logic
- Keep the loading state calm and trust-building, consistent with the review step’s role in the flow
