# Draft workspace polish design

## Problem

The current draft workspace and payment flow have several small but high-friction UX issues:

1. Thread-style "ready to continue" banners use an oversized full-width desktop CTA.
2. The body-generation loading dialog uses a pale amber loading badge that loses contrast in dark mode.
3. The body step does not acknowledge when the first AI draft becomes ready; the current one-time coachmark is timed to step entry instead of draft readiness.
4. Desktop multi-file selection is broken from the intake quick-attach control even though the main attachments step already supports multi-select.
5. The review step still feels unfinished on desktop because the action dock is not kept visible there, and the loading feedback for price calculation needs stronger regression protection.
6. The checkout payment surface still mixes payment intent with price-chip button chrome, and the desktop secondary action can compress awkwardly.

This is a polish pass, not a flow redesign. The goal is to make the existing flow feel deliberate, trustworthy, and consistent without broadening scope.

## Goals

1. Reduce avoidable friction in draft, review, and checkout.
2. Keep mobile behavior intact where it already works.
3. Prefer small shared-component improvements over route-local hacks.
4. Preserve existing business rules and API contracts.

## Scope

In scope:

- Draft workspace thread CTA sizing
- Body-generation dialog contrast
- One-time first-draft-ready guidance on the body step
- Intake quick-attach multi-file selection
- Review dock visibility and bottom-spacing polish
- Checkout CTA and secondary-action polish
- Locale copy and regression coverage required by the new behavior

Out of scope:

- Backend API changes
- New draft-generation states or provider behavior
- A broad attachment uploader redesign
- Reworking the overall review or checkout information architecture
- Changing pricing logic or payment state machines

## Approved approach

Use a focused polish pass that keeps the current route structure and only broadens shared primitives where the same UX issue appears in multiple places.

Why this approach:

- It fixes the real regressions without turning a polish bundle into a redesign.
- It matches the existing architecture, where shared CTA and dock behavior already lives in reusable components.
- It keeps scope tight enough for one implementation plan and one review pass.

## UX decisions

### 1. Thread action banners

- Keep the banner card full width.
- Keep the CTA full width on compact/mobile layouts.
- On desktop, cap the CTA to a reasonable maximum width so it reads like a clear next step instead of a large slab button.
- Apply this at the shared thread-action component level so the behavior stays consistent anywhere the pattern is reused.

This should solve the current intake-thread desktop issue without shrinking the message container itself.

### 2. Body-generation loading dialog

- Keep the existing blocking loading dialog pattern.
- Update the loading badge styling so the icon and surface maintain obvious contrast in both light and dark themes.
- Make the color treatment feel warm and active, not washed out.

This is a shared component fix inside the dialog, not a route-local override.

### 3. First-draft-ready guidance

- Replace the current timing of the one-time body-step coachmark.
- Show the guidance only once, when the first AI-generated draft actually becomes available.
- Do not show it again on later refinements.
- Keep the interaction calm and lightweight: the draft is already visible, so the overlay is informational rather than a fork in the flow.

Recommended English copy:

- Title: `Your first draft is ready`
- Body: `Check the suggested draft and make any changes you want — manually or with AI.`
- Action: `Dismiss`

The modal should use a neutral secondary-style dismissal action and no competing primary CTA.

### 4. Attachments

- Fix the intake quick-attach control so desktop file pickers can select multiple files at once.
- Preserve the main attachments-step uploader as the canonical management surface.
- Do not add a max-width cap to the uploaded-file cards in the attachments step for now.

Reasoning:

- The actual bug is the intake quick-attach input, which currently only reads the first selected file.
- The attachments step is already a single-column management area; artificially narrowing the file cards would mostly waste space without solving a clearer usability problem.

### 5. Review

- Keep the review CTA dock visible on desktop as well as mobile by opting into desktop sticky behavior.
- Maintain generous bottom padding in the scrollable content so the final summary content never sits flush against the dock.
- Keep the price-calculation loading state explicit on the CTA and in the price summary.
- Treat the missing loading-label incident as a regression to guard against, not as a copy rewrite.

### 6. Checkout

- Keep the intermediate checkout action as a continuation step, because it leads into the payment element rather than charging immediately.
- Keep the final Stripe submit button as a simple payment verb (`Pay` / localized equivalent).
- Remove the final payment-button price chip and rely on surrounding pricing context instead.
- Prevent the desktop back action from collapsing or ellipsizing unnecessarily.

This aligns better with common payment flows, where the final submit uses a clear payment verb and avoids decorative CTA chrome that competes with the payment fields.

## Technical design

### Shared component changes

- `ThreadActionCard`
  - Own the desktop CTA width rule so thread-style banners inherit the same responsive treatment.
- `BodyGenerationDialog`
  - Own the theme-safe loading badge contrast fix.
- `FlowActionDock`
  - Reuse the existing `desktopSticky` support for review rather than inventing a separate sticky footer pattern.
- `StripePaymentForm`
  - Remove the trailing price chip from the final submit button.

### Route wiring

- `IntakeStep`
  - Add `multiple` to the hidden quick-attach file input.
  - Iterate the selected `FileList` instead of only uploading `files[0]`.
  - Reuse the existing `files.uploadFile` path so validation and error messaging remain consistent with the rest of the app.
- `BodyStep`
  - Reuse the existing one-time dismissal persistence pattern.
  - Retime the guidance overlay from step-entry to "first AI draft became available."
- `ReviewPage`
  - Opt into `FlowActionDock` desktop sticky mode.
  - Preserve or increase the bottom spacing contract to keep scroll content clear of the dock.
  - Keep the existing review-specific price-loading copy path and harden it with tests.
- `CheckoutPage`
  - Adjust desktop action sizing so the back action has room.
  - Keep the pre-payment CTA as a transition action.
- `StripePaymentForm`
  - Keep `buttonLabel` as the payment verb without trailing price metadata.

## Copy and localization

- Add new body-step modal keys in all four locales for:
  - first-draft-ready title
  - first-draft-ready body
  - dismiss action
- Keep the existing checkout payment verb keys.
- Keep the existing review price-loading keys and ensure regression tests cover them.

## Error handling and guardrails

- Do not show a "draft ready" overlay until a real body exists.
- Do not imply that payment is happening before the user reaches the actual payment submit.
- Do not silently swallow invalid quick-attach uploads; rely on the existing validation and surfaced error path.
- Do not let sticky footer changes obscure content or create dead scroll regions.
- Do not broaden this into a larger attachment, review, or checkout redesign.

## Testing

Add focused regression coverage for:

1. Desktop thread CTA sizing with mobile full-width preservation
2. Theme-safe body-generation dialog loading badge treatment
3. First-draft-ready modal timing and one-time dismissal behavior
4. Intake quick-attach multi-file selection
5. Review desktop sticky dock usage and bottom-spacing contract
6. Checkout / Stripe final CTA no longer rendering a price chip
7. Locale coverage for the new body-step modal keys
8. Locale/regression coverage for review price-loading copy

## Risks

- The first-draft-ready trigger must avoid firing on hydration noise or stale body content.
- Reusing `uploadFile` sequentially from the intake quick-attach control must not produce confusing partial-state behavior if one file in the batch fails.
- Review desktop sticky behavior must not cover long content or crowd the preview at common laptop heights.

## Result

The flow remains the same, but the experience becomes calmer and more legible:

- clearer next actions on desktop
- better dark-mode contrast while AI is drafting
- explicit acknowledgment when the first draft is ready
- working multi-file quick attach
- a visible desktop review CTA
- cleaner payment-button semantics at checkout
