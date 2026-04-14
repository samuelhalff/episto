# Help FAQ and CTA alignment design

**Status:** Approved for implementation planning  
**Date:** 2026-04-14  
**Scope:** Help-page FAQ expansion, help-page CTA redesign, and pricing-page FAQ/help CTA alignment

## Problem

The current help page is serviceable but too thin for the range of real customer questions it should answer,
and its standalone "Start writing" button does not read as a deliberate conversion section. The pricing page
also maintains a separate FAQ surface that can drift away from help-page wording over time. This task should
make `/help` the canonical FAQ destination, give the help page a stronger full-width CTA treatment, and keep
the pricing page FAQ preview aligned with help while still staying lighter and more conversion-focused.

## Current context

- `frontend/src/app/[locale]/help/page.tsx` renders eight FAQ cards, a small isolated CTA button, and a
  contact card.
- `frontend/src/components/marketing/PricingFaq.tsx` renders a separate pricing FAQ block with its own list
  of questions below the included/excluded cards.
- `frontend/src/components/marketing/PricingPageClient.tsx` currently places the pricing FAQ section before
  the final pricing CTA section.
- FAQ copy lives in the locale message files, so any overlap between help and pricing must stay consistent
  through the message layer rather than route-local hardcoded strings.
- Existing tests already lock in some help-page spacing and pricing-page FAQ structure, so the redesign
  should update those contracts instead of introducing unchecked drift.

## Decision

Use a shared FAQ model with two different presentation depths:

1. `/help` becomes the canonical FAQ hub and owns the fuller set of customer-facing answers.
2. `/pricing` shows only a short preview of the most conversion-relevant FAQ items.
3. Any question that appears on both pages must reuse the same wording and answer text.
4. The help page replaces the isolated button with a proper full-width CTA block.
5. The pricing page adds a dedicated CTA that sends users to `/help` for the rest of the FAQ set.

This keeps help comprehensive enough to remove common support friction while preventing pricing from becoming
visually heavy or duplicative.

## Help page design

### FAQ scope

Expand the help FAQ into a balanced, practical set of concise answers. Target roughly 10 to 12 questions. The
goal is not an exhaustive support manual; it is a credible, high-signal FAQ that covers the main blockers a
customer is likely to have before or right after checkout.

The help FAQ should cover the following concern areas:

- how drafting works and when a letter can still be edited
- when the letter is prepared, printed, and handed off for dispatch
- what tracking is or is not visible depending on the dispatch type
- what happens after checkout and what can no longer be changed
- privacy, session data, file retention, and support follow-up expectations
- attachments, signatures, guest use, payment timing, refunds, and what to do when something went wrong

### Layout

- Keep the centered page intro at the top.
- Keep the FAQ body as cards, stacked on smaller viewports and arranged into a clean two-column grid on
  larger screens.
- Preserve the existing marketing-page rhythm, but give the FAQ section enough breathing room so the new CTA
  block does not feel visually jammed against the content above or below it.

### CTA redesign

Replace the current standalone "Start writing" button with a real conversion band inside its own section.

Requirements:

- the CTA reads as a full-width content block, not a floating button
- the block includes supportive copy plus the primary drafting action
- on mobile, the primary action spans the available width inside the block
- on desktop, the block can shift to a wider editorial layout with copy on the left and the action on the
  right
- the section should feel intentional and spacious, with clear separation from both the FAQ cards and the
  contact card below

The contact card remains below the CTA and continues to serve as the fallback for questions the FAQ does not
resolve.

## Pricing page design

### FAQ preview role

The pricing page should keep a lighter FAQ treatment than help. Its FAQ block should answer only three or
four high-intent questions that directly support conversion and trust.

Examples of pricing-relevant topics:

- when payment is charged
- what the quoted price includes
- refund expectations
- dispatch or tracking questions that materially affect purchase confidence

### Consistency rule

If a pricing-page question overlaps with help, the wording and answer must be the same. Pricing should not
maintain alternate versions of the same answer.

### Help-page handoff

Below the small pricing FAQ preview, add a dedicated CTA that points to `/help` for the full FAQ list.

Requirements:

- the CTA sits directly below the pricing FAQ preview
- the CTA is explicit that more answers live on the help page
- the CTA is visually separate from the existing pricing conversion CTA so users can distinguish between
  "I still have questions" and "I am ready to start"
- the help CTA should read as a secondary/support-oriented action so it does not visually outrank the final
  pricing conversion CTA

The existing pricing conversion CTA remains in place after this FAQ/help handoff.

## Shared FAQ source model

To keep the two pages aligned over time, help and pricing should not each manually define overlapping FAQ
content in separate route-local lists.

Implementation shape:

- keep all user-facing FAQ copy in the locale message files
- define one canonical help FAQ set in code using stable FAQ identifiers or shared message-key mappings
- derive the pricing FAQ preview as an explicit subset of that canonical set
- let each page control presentation depth and order, but not alternate answer wording for shared topics

This is a content-ownership boundary, not a new product feature or schema change.

## Copy and truth guardrails

Any FAQ answer that touches dispatch, tracking, refunds, timing, or retention must stay inside the current
documented product truth.

Specifically:

- do not imply guaranteed delivery timing
- do not imply tracking exists for every letter
- do not imply a user can edit content after submission if the flow is locked
- do not overstate what refund outcomes are guaranteed
- do not invent new retention durations or support guarantees

The redesign should prefer short, direct, operationally honest answers over marketing-heavy reassurance.

## Localization

The redesign applies to all active locales:

- `de-CH`
- `fr-CH`
- `it-CH`
- `en-CH`

The page structure should stay consistent across locales, and the updated FAQ/CTA copy should be added
through the existing message layer rather than hardcoded in the route components.

## Testing

Update existing tests or add focused regressions that lock in:

1. shared pricing/help FAQ consistency for overlapping questions
2. the pricing-page CTA that links to `/help` for more FAQs
3. the help-page full-width CTA treatment and its surrounding spacing contract
4. the fact that the redesign does not regress the current locale-driven copy structure

The testing should stay narrow and presentation-focused; this task does not introduce new backend behavior.

## Non-goals

- redesigning unrelated marketing pages
- changing pricing logic or checkout behavior
- changing dispatch capabilities, provider wording, or support policy beyond the approved copy refresh
- turning the help page into a full support center with search, categories, or account tooling
- replacing the existing pricing conversion CTA with the help CTA
