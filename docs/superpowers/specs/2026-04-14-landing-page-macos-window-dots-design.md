# Landing-page macOS window dots design

**Status:** Approved for implementation planning  
**Date:** 2026-04-14  
**Scope:** Marketing landing-page mockup chrome only

## Problem

The decorative three-dot window controls used in the landing-page mockup should read as standard macOS window controls instead of the current soft, reversed palette. The update should stay visually focused, avoid changing layout or copy, and establish one reusable treatment for any landing-page mockup that uses the same chrome pattern.

## Current context

- `frontend/src/components/marketing/HomepageHero.tsx` currently hardcodes three small dots inside the paper mockup.
- The current implementation uses a green, yellow, red order, which does not match the standard macOS traffic-light order.
- `frontend/tests/marketing-homepage.test.ts` currently locks in that same reversed expectation.
- `frontend/src/components/marketing/primitives.tsx` is already close to the repository target size, so this change should not extend that file further.

## Decision

Create a small dedicated marketing component for mockup window controls and use it from the homepage hero mockup. The component will render the standard macOS left-to-right order:

1. red — close
2. yellow — minimize
3. green — zoom

The visual treatment will use classic macOS-style colors:

- red: `#FF5F57`
- yellow: `#FFBD2E`
- green: `#28C840`

## Component design

Add a focused component at `frontend/src/components/marketing/MarketingWindowDots.tsx`.

Responsibilities:

- render the three decorative dots in the correct macOS order
- keep the markup small and reusable
- remain presentation-only with `aria-hidden="true"`

Constraints:

- no new product state, logic, or API contracts
- no change to mockup spacing, borders, shadows, or skeleton lines outside the dots themselves
- no provider, checkout, or other cross-surface UI impact

## Integration plan

- `HomepageHero.tsx` is the only current call site; this task updates that usage now and establishes the component for future landing-page mockups with the same chrome.
- Replace the hardcoded dot spans in `HomepageHero.tsx` with `MarketingWindowDots`.
- Keep the existing surrounding paper mockup structure intact.
- Treat this component as the single source of truth for the same landing-page window-dot pattern going forward.

## Testing

Update `frontend/tests/marketing-homepage.test.ts` so it no longer encodes the reversed green/yellow/red sequence. The test should instead validate the macOS-standard treatment by checking the shared component usage and the standard red/yellow/green order with the approved colors.

## Non-goals

- redesigning the hero layout
- changing the mockup from decorative to functional
- introducing broader color-token work for unrelated mockup chrome
- updating areas that do not use this three-dot landing-page pattern
