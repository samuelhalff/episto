# Pricing Page Clarity Redesign — Design

**Status:** Approved for implementation  
**Date:** 2026-04-12

## Problem

The current `/pricing` page still reads like a technical reference instead of a clear decision page. It repeats itself, exposes internal/provider-shaped thinking, uses inconsistent list and icon styling, and has already drifted into copy that feels improvised instead of intentional.

The redesign must make the page easy to understand in one pass:

1. show the two delivery choices first
2. let the user simulate price by letter type and page count second
3. explain what is and is not included without overselling
4. answer common questions in plain language

## Goals

- Make the page decision-first and fast to scan.
- Show only **Standard** and **Registered** as the public delivery choices.
- Remove sync/freshness framing and provider/public-source framing from the public page.
- Keep pricing truthful to the existing stored pricing response.
- Replace the static examples table with a cleaner pricing simulator.
- Make list rows, icon sizes, and color usage consistent across light and dark themes.
- Ensure the page itself never overflows horizontally.

## Non-goals

- Do not change the pricing contract, pricing API, or checkout pricing logic.
- Do not invent generic add-ons, attachment surcharges, or standalone page surcharges.
- Do not expose provider quote vs Swiss Mail markup on the public pricing page.
- Do not reintroduce the old hero explainer, sync card, or comparison/reference-total filler blocks.
- Do not change homepage pricing teaser behavior as part of this redesign.

## Approved content architecture

### 1. Hero

- **Title:** `Simple, honest pricing`
- **Subtitle:** short 3-4 word line in the existing marketing-page style, conveying that pricing is visible upfront
- No extra hero pricing panel or explainer paragraph.

### 2. Main pricing card

- **Section title:** `Choose your delivery`
- No supporting paragraph under the section title.
- Two cards only:
  - `Standard`
  - `Registered`

Each card shows:

- the main reference total first
- a small caption under the price: `1-page letter`
- only factual price rows backed by the existing response data

Approved row labels:

- **Standard**
  - `Each additional page` → `+CHF …`
- **Registered**
  - `Registered delivery` → `+CHF …`
  - `Each additional page` → `+CHF …`

These rows must use actual derived amounts from the stored pricing response. They are not generic add-ons, and they must stay phrased as plain increment prices rather than provider or sync explanations.

### 3. Pricing simulator section

The static examples section is replaced by a simulator card.

- **Title:** `Pricing simulator`
- No intro paragraph by default.
- The block replaces the old `Price examples by page count` table/card.

#### Controls

- `Letter type` first
- `Pages` second
- Controls stack vertically on mobile and sit inline on larger screens

#### Interaction model

- One active result at a time
- Letter type uses a shadcn-style segmented toggle
- Page count uses a compact stepper
- No dropdowns, tables, comparison grids, or hidden popovers for the main interaction

#### Result area

- Left side: short live summary, e.g. `Standard · 3 pages`
- Right side: total price
- One short note below: `Each additional page +CHF …`
- No filler explanation, no reference-language, no provider language

### 4. Included / not included

- Titles only, with no eyebrow labels and no supporting paragraphs.
- **Included title:** `What's included`
- **Not included title:** `What's not included`

Approved included list:

- `Drafting assistance and structured review`
- `Swiss-style formatting and final PDF generation`
- `Postal submission handling and payment processing`
- `Receipt, confirmation, and support handling`

Approved not included list:

- `Legal advice or legal review`
- `Guaranteed delivery or guaranteed tracking`
- `Translation or localisation review`
- `Custom document design work`

### 5. FAQ

- **Title:** `Common questions`
- No eyebrow label.
- No intro paragraph.

FAQ answers must be rewritten in direct user language. Remove internal or system-shaped phrasing such as:

- `MVP`
- `Stripe confirms it`
- overly technical payment/dispatch wording where a simpler truthful sentence is possible

### 6. CTA

- Keep the existing final CTA structure.
- Do not add a final pricing recap or another explanatory pricing block above it.

## Approved visual rules

### 1. No page-level horizontal overflow

- The page container must not create horizontal scrolling.
- The page container must not rely on a wide comparison table for pricing comprehension.

### 2. Consistent list-row system

Included and not-included rows must share the same:

- row height
- padding
- icon container size
- icon size
- spacing
- corner radius

### 3. Consistent color usage

- Included title and icons use the success/green family.
- Not included title and icons use the danger/red family.
- FAQ icons use one consistent neutral-accent treatment and must stay readable in both themes.
- Light and dark theme treatments must preserve accessible contrast; do not use faint low-opacity dark-mode icon chips.

### 4. Consistent icon treatment

- Included and not-included icons must use the same visual scale.
- Included and not-included icon containers must use the same shape and sizing.
- FAQ icon containers must follow the same overall visual rhythm, even with a different icon glyph.

### 5. No repetitive meta copy

If a heading already explains the section, do not add a second sentence that merely restates it. The page should feel composed, not narrated.

### 6. Minimal paragraph rule

Every paragraph on the page must earn its place. If a line does not help the user decide, understand a price increment, or resolve a real question, remove it.

### 7. Shared alignment rule

Any row with a label on the left and a price/value on the right must use the same layout:

- flexible left column
- auto-width right column
- baseline-aligned content
- consistent vertical spacing between rows

This rule applies to the simulator result row and the existing pricing rows above it.

## Copy rules

- Never mention pricing sync, freshness, or “up to date” status on the public page.
- Never mention provider names, provider/source URLs, or provider-vs-product breakdowns on the public page.
- Avoid phrases like `reference totals`, `compare`, `what makes it cost more`, or other meta-instructions about how to read the page.
- Prefer direct labels over explanatory labels.
- Keep sentences short and concrete.
- Avoid repetition across adjacent sections.

## Implementation notes

- Start with tests in `frontend/tests/pricing-page.test.ts`.
- Add or update the shadcn-derived primitive(s) needed for the simulator controls in `frontend/src/components/ui/` rather than inventing ad hoc styling.
- Update the pricing page components:
  - `frontend/src/components/marketing/PricingHero.tsx`
  - `frontend/src/components/marketing/PricingPageClient.tsx`
  - `frontend/src/components/marketing/PricingTiers.tsx`
  - `frontend/src/components/marketing/PricingFaq.tsx`
  - `frontend/src/components/marketing/pricing-shared.tsx`
- Update pricing copy in all locale files:
  - `frontend/src/messages/de-CH.json`
  - `frontend/src/messages/en-CH.json`
  - `frontend/src/messages/fr-CH.json`
  - `frontend/src/messages/it-CH.json`
- Update the route spec in `docs/03-ux/page-specifications-part-01.md` so the canonical UX doc matches the approved page.
