# Production Flow Shell Design

## Problem

Swiss Mail's customer flow now has production-grade expectations, but the current implementation still
behaves like a set of adjacent pages rather than one deliberate product flow.

The main issues are structural:

- bottom primary actions still rely on labels that can clip in constrained button widths
- the desktop preview pane can reappear with animation when steps change instead of behaving like a
  stable workspace panel
- subject editing uses a single-line input even though real subjects are often longer than the field
- desktop checkout does not use the same always-visible action pattern as the draft workspace
- checkout pricing pending states disable the primary action silently instead of communicating what is
  happening
- desktop checkout email layout is too narrow and under-explains the communication flow
- back actions are still page-local in parts of the flow and can skip to the wrong surface
- the dark-mode illustration/banner treatment is not yet polished enough for launch

The goal is to replace these isolated behaviors with one production-ready flow shell shared across
drafting, review, checkout, confirmation, and status-touching surfaces where appropriate.

## Scope

### In scope

- draft workspace pages under `/draft/[draftId]/*`
- `/draft/[draftId]/review`
- `/draft/[draftId]/checkout`
- `/draft/[draftId]/confirmation`
- `/status/[orderToken]`
- bottom dock CTA copy and dock behavior
- desktop preview-panel persistence and stability
- subject-step editing UX
- checkout desktop layout, spacing, pricing-loading CTA, and email helper copy
- secure post-payment PDF download access from confirmation/status flows
- dark-mode illustration/banner polish
- shared previous-step/back-navigation logic across workspace, review, and checkout
- Stripe Payment Element method presentation and readiness expectations for Swiss payments

### Out of scope

- admin surfaces
- direct payment-method integrations outside Stripe
- hardcoded retention durations
- emailing raw PDF/attachment packages directly as launch behavior
- speculative provider/dispatch behavior beyond existing documented contracts

## Decisions

- **Use a shared customer flow shell instead of page-local layout patches.**
  Draft workspace, review, and checkout should share the same structural rules for desktop columns,
  sticky action docking, and bottom spacing. Confirmation and status should align visually with the
  same customer-facing system even if they do not expose the exact same dock.

- **Use one ordered customer flow graph for navigation.**
  Back behavior must come from one shared graph:
  `intake → sender → recipient → body → attachments → subject → logistics → review → checkout`
  with confirmation failure returning to checkout. No page should hardcode its own "back" route when
  that route is really "previous step in the flow".

- **Persist desktop preview visibility as client-side UI state keyed by draft.**
  This is a local workspace preference, not business data, so it should not be written into draft
  content metadata. Use client persistence keyed by `draftId` (for example session storage) so the
  preview stays hidden if the user hides it, including across step changes and reloads in the same
  working session. If storage is unavailable, default to open on wide viewports.

- **Use compact dock CTA vocabulary.**
  Intermediate dock CTAs should use the shortest localized verb that remains clear in context
  (for example `Next`). Secondary dock actions should likewise stay short (`Back`). Terminal actions
  remain action-specific (`Pay`, `Send`) rather than inheriting the generic copy.

- **Use a multiline subject editor, but keep a single-line saved subject.**
  Subject editing should move to an auto-growing textarea so long text remains readable. Saved subject
  content is still normalized into the canonical single subject line used for rendering and dispatch.

- **Keep payment methods inside Stripe's Payment Element.**
  For Swiss SaaS checkout, the correct production approach is Stripe's standard Payment Element with
  TWINT surfaced first, then cards, then wallets when Stripe/device capabilities allow them. Do not
  build a custom payment-method selector.

- **Professionalize the receipt/confirmation package without emailing document attachments.**
  Users should receive a professional payment receipt and dispatch/status communication, and they
  should be able to access the final PDF after successful payment through secure download links from
  confirmation/status surfaces. Emails may contain secure links, but should not directly attach the
  document package in this slice.

- **Retention remains backend-owned and configurable.**
  The frontend must not hardcode "10 days" or any other period. Download availability and expiry copy
  must be driven by backend-truthful retention/access data.

## Design

### 1. Shared production flow shell

Introduce one shared customer flow shell for the linear customer journey.

#### Responsibilities

- desktop two-column page framing
- optional stable secondary panel region (preview or summary)
- shared sticky bottom action dock with consistent bottom breathing room
- consistent header spacing and content widths
- responsive-safe fallbacks for smaller screens

#### Behavior

- workspace, review, and checkout adopt one shell contract instead of independently managing layout
- desktop preview/summary panels no longer snap in and out because the shell owns when those regions
  mount, collapse, or remain visually stable
- checkout uses the same "actions are always visible" rule as the draft workspace instead of burying
  the primary action at the end of the scroll

This is a structural refactor, not just a spacing tweak. The point is to remove the class of layout
regressions that comes from each page solving the same problem independently.

### 2. Shared previous-step navigation

Introduce a shared flow-navigation helper/hook that owns previous/next resolution across:

- draft workspace steps
- review
- checkout
- failure/recovery return paths

#### Rules

- workspace step "back" always goes to the true previous step in the ordered draft graph
- review "back" returns to logistics (the actual previous step), not a generic draft landing
- checkout "back" returns to review
- confirmation error/failure routes return to checkout
- mobile and desktop use the same navigation model

This should replace page-local route assumptions with one source of truth that can be unit-tested
independently.

### 3. Desktop preview-pane stability

The desktop preview pane should behave like a workspace tool, not a transient animation.

#### Required behavior

- the pane stays mounted and visually stable across step changes
- hide/show state is remembered for the current draft/session
- step navigation must not reopen or reanimate the pane unless the user explicitly toggles it
- when closed, the shell should reclaim the space cleanly without remount jitter

#### Responsive rule

- this persistence behavior is desktop-specific
- responsive/mobile continues to rely on explicit preview triggers instead of a persistent side pane

### 4. Bottom CTA rules

Bottom dock CTAs should optimize for constrained width and fast recognition.

#### Copy rules

- intermediate drafting/review transitions use short localized verbs only (`Next`)
- secondary actions use short localized verbs only (`Back`)
- final or consequential actions stay explicit (`Pay`, `Send`)
- do not append destination labels inside narrow dock buttons unless the button has the space to
  carry them without clipping

#### Layout rules

- the dock is responsible for bottom spacing so the primary action never sits flush against the end
  of the scroll viewport
- desktop checkout uses the same persistent action affordance as the drafting flow

### 5. Subject-step UX

The subject step should switch from a single-line input to an auto-growing textarea.

#### Why

- real subjects are often longer than one visible line
- users need to see the full phrasing while editing
- truncation inside the input is poor UX for formal-letter context

#### Constraints

- line breaks are an editing convenience only
- saved content is normalized to the canonical single-line subject before persistence
- character limits and autosave behavior remain visible
- responsive/mobile benefits from the same editor change

### 6. Checkout shell and pricing state

Checkout should feel like the final step of the same product, not a different layout mode.

#### Layout

- keep the summary/sidebar stable on desktop
- make the email input use the full width of the main checkout content region
- add deliberate bottom spacing beneath the action area
- use the shared dock pattern for desktop primary/secondary actions

#### Pricing pending state

- when pricing is still being resolved, the primary action should not look inert
- replace silent disabled state with an explicit loading/blocked CTA state such as localized
  `Calculating…`
- this state should make it clear that the system is still preparing the payment step rather than
  simply refusing input

### 7. Checkout email copy and professional confirmation package

The email section should explain the communication contract clearly and professionally.

#### Checkout copy direction

- explain that email is used for payment receipt, dispatch/status updates, support, and secure
  order-status follow-up
- do not promise direct document-package email attachments in this slice
- keep the copy trustworthy and operationally precise

#### Post-payment experience

- confirmation page and status flow should provide secure access to the final PDF while it remains
  available under the configured retention/access policy
- transactional emails may include secure status/download links rather than raw attachments
- if the PDF is no longer available, the UI must say so plainly instead of implying the file still
  exists

#### Retention rule

- frontend copy must be driven by backend truth
- durations remain configurable; no hardcoded "10 days"
- if available, the backend should expose download availability/expiry metadata so the UI does not
  infer retention locally

### 8. Swiss payment-method handling

Use Stripe's standard production path.

#### UX direction

- keep Stripe Payment Element as the single payment UI
- prefer TWINT first in method ordering for Swiss checkout
- allow cards and wallets to surface when Stripe/device support is present
- do not build a custom in-app payment-method picker

#### Production-readiness expectation

The application should clearly support the standard Stripe path, but the actual method availability
depends on Stripe setup:

- real Stripe keys configured
- backend payment-intent flow compatible with automatic payment methods
- TWINT enabled in the Stripe Dashboard
- Apple Pay / Google Pay enabled where appropriate

If a configured environment does not expose those methods, the UI should fail honestly rather than
pretending they are available.

### 9. Confirmation/status download access

Confirmation and status surfaces should become the professional post-payment source of truth for the
customer.

#### Direction

- confirmation page exposes order reference, payment truth, dispatch truth, and secure PDF download
  when available
- status page exposes the same professional summary and secure download path
- secure download should be order-scoped or otherwise access-controlled; do not expose draft internals
  casually in emailed links

If the current API surface does not already provide an order-safe document download mechanism for
status/email use, add one rather than stretching a draft-session-only route beyond its intended
boundary.

### 10. Dark-mode and banner polish

The drafting flow should be visually credible in both themes.

#### Required polish

- audit icons and illustrations in light and dark mode for contrast and color balance
- fix banner art that currently collapses into low-contrast orange-on-orange treatment
- replace the mixed spinner + dots drafting banner state with a cleaner localized text treatment
  based on `Drafting` + animated dots only

This should be handled as product polish, not as a one-off CSS hack.

## Responsive reuse

Although the driving problems are mostly desktop-centric, the design should intentionally reuse the
following improvements on smaller viewports where they help:

- short CTA vocabulary
- shared previous-step logic
- subject textarea editing
- full-width checkout email field
- explicit pricing-loading CTA messaging

Desktop-only behavior should remain isolated to:

- persistent side preview-pane visibility
- desktop two-column shell behavior

## Affected surfaces and likely component boundaries

- shared shell/layout for workspace, review, and checkout
- shared flow-navigation helper/hook
- shared draft/workspace UI-state helper for preview visibility persistence
- draft workspace client / preview-pane integration
- subject step
- checkout page and checkout payment form
- confirmation page
- status page
- locale message files for compact CTA copy and pricing-loading copy
- dark-mode/banner assets and loading treatment

## Error handling

- if preview-state persistence is unavailable, default to the safe desktop-open behavior
- if pricing is pending, communicate that state explicitly instead of exposing a dead-looking button
- if download access has expired or the artifact is unavailable, show a clear unavailable state
- if Stripe is not configured for TWINT/wallets, do not imply those options exist outside what the
  Payment Element actually surfaces
- if confirmation/status routes cannot securely provide document access, fall back to truthful status
  messaging rather than leaking or faking access

## Testing

Add or update verification for:

- shared previous-step resolution across workspace, review, checkout, and confirmation failure flows
- desktop preview visibility persistence across step changes
- no unwanted preview reanimation/remount behavior on step navigation
- compact CTA copy staying short across locales
- subject textarea editing with single-line normalization on save
- checkout desktop action docking and bottom spacing
- pricing-pending CTA loading label behavior
- full-width desktop checkout email layout
- secure download availability states on confirmation/status surfaces
- dark-mode banner and illustration regressions

## Non-goals and guardrails

- do not build a custom payment-method selector outside Stripe
- do not hardcode retention durations in the frontend
- do not promise document-package email attachments in this slice
- do not store local UI-only preview visibility in backend draft content metadata
- do not solve layout issues with isolated page hacks when the shared shell can own the behavior
