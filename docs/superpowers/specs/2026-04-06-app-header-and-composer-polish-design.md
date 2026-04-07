# App Header and Composer Polish Design

## Problem

Several customer-facing surfaces currently solve the same UI problems in slightly different ways:

- prompt shortcuts in the draft composer use fixed compact counts instead of fitting the available width
- the composer submit control can show both the arrow and the loading spinner at once
- the first body-draft step can keep showing a stale loading state after the initial draft appears
- bottom primary step CTAs are long enough to clip on narrow viewports
- customer-facing headers do not use one consistent language/menu pattern across marketing and app surfaces

The goal is to fix these issues as one shared-system pass rather than as isolated page patches.

## Scope

### In scope

- homepage and customer-facing marketing surfaces for language-selector consistency
- `/draft/new`
- draft workspace pages under `/draft/[draftId]/*`
- customer-facing status pages where a top header is shown
- prompt composer shortcut layout
- draft composer submit/loading affordance
- first body-draft loading state
- short primary CTA copy for bottom dock actions

### Out of scope

- admin pages and admin auth shell
- provider, payment, or dispatch behavior
- transient redirect/loading screens that do not present a stable page header
- unrelated visual refactors

## Design

### 1. Shared customer-facing header contract

Use one header contract across homepage and customer-facing app pages.

#### Mobile

- top row contains only title/logo on the left and hamburger trigger on the right
- language and theme controls move into the menu sheet
- the top row remains single-line and fixed-height

#### Desktop

- keep each surface's contextual center content (marketing navigation, draft progress, status actions)
- use a compact language dropdown trigger in the header instead of the current always-expanded locale pill row
- keep theme available in the menu everywhere; marketing pages may continue to expose the existing desktop theme toggle without changing the mobile rule

#### Reuse

- reuse the same menu-content structure for small screens so language and theme live in one predictable place
- normalize `draft/new`, draft workspace, review, checkout, confirmation, and status to this contract
- align homepage language selection behavior with the same dropdown model
- other marketing routes that already share the marketing header inherit the same language-dropdown change automatically

This keeps the implementation aligned with the docs: mobile hamburger overlay, compact single-line headers, and mid-flow locale switching without draft loss.

### 2. Language switcher behavior

Replace the current inline four-pill language control with a compact dropdown-trigger variant that:

- shows the current locale code in the closed state
- opens a list of the supported locales with readable names
- uses client-side locale navigation where possible
- preserves the current route and draft state during mid-flow language changes

The same dropdown interaction model should be available anywhere language selection is surfaced in the header.

### 3. Prompt shortcut layout

Replace the fixed compact shortcut count with a width-aware layout strategy:

- measure the available width of the shortcut row
- measure rendered badge widths
- reserve width for a trailing `More` chip whenever at least one shortcut must overflow
- keep the row single-line
- move every shortcut that does not fit into the sheet, preserving original order

The fit calculation should live in shared shortcut-layout logic so intake/body composer variants stay consistent.

#### Fallback rule

Before widths are known, keep the visible row in a strict single-line state and expose only the `More` affordance when multiple shortcuts exist. Once measurement completes, replace that placeholder state with the exact fitted subset immediately.

### 4. Composer submit loading behavior

The submit control must present one state at a time:

- idle or ready-to-send: show the up-arrow affordance
- sending: show only the loading spinner

Do not allow the button to render both affordances at once through mixed child/loading behavior.

### 5. First body-draft loading state

Treat first-draft generation and later refinements as separate states.

#### Initial auto-compose

- active only while the system is creating the very first body draft
- ends as soon as body content is present or the compose attempt definitively fails
- if the assistant completes but no body draft persists, transition to the error path instead of leaving the UI in a perpetual loading state

#### Refinement busy state

- applies only to user-initiated follow-up instructions after the first draft exists
- may show a compact loading affordance, but it must not reuse the initial-draft loading signal
- refinement history remains hidden until there are real refinement messages to show

### 6. Bottom primary CTA copy

Keep the existing dock layout and shorten only the copy.

- replace verbose `Continue to ...` labels with concise localized `Next`-style labels
- use the shortest unambiguous wording per locale
- keep the semantic destination clear without widening the button row

If any single label still clips after copy shortening, adjust that label rather than expanding the dock geometry first.

## Affected components

- `frontend/src/components/marketing/Header.tsx`
- `frontend/src/components/marketing/LanguageSwitcher.tsx`
- `frontend/src/components/layout/SiteMenuPanel.tsx`
- `frontend/src/components/product/FlowHeader.tsx`
- `frontend/src/components/product/draft-flow/WorkspaceSiteMenu.tsx`
- `frontend/src/components/product/draft-flow/draft-shell.tsx`
- `frontend/src/app/[locale]/draft/new/page.tsx`
- `frontend/src/app/[locale]/status/[orderToken]/page.tsx`
- `frontend/src/components/product/draft-flow/PromptShortcutBar.tsx`
- `frontend/src/components/product/draft-flow/prompt-shortcut-layout.ts`
- `frontend/src/components/product/draft-flow/draft-composer.tsx`
- `frontend/src/components/product/draft-flow/BodyStep.tsx`
- locale message files under `frontend/src/messages/*.json`

## Testing

Add or update regressions for:

- width-based shortcut collapsing with a reserved `More` affordance
- single-state submit button rendering in loading vs idle
- body-step initial-compose exit conditions so the loading state clears once the first draft lands
- header/language behavior where customer-facing mobile headers stay title + hamburger only and desktop uses the compact language selector

## Non-goals and guardrails

- do not change admin navigation
- do not broaden this into a full navigation redesign
- do not guess on provider or workflow behavior
- do not solve the CTA clipping problem with wider dock geometry before trying concise localized copy
