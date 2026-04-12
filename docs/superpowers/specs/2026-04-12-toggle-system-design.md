# Shared Toggle System Refresh — Design

**Status:** Approved for implementation  
**Date:** 2026-04-12

## Problem

The company/person control changed recently. The clearest recent change is commit `87420f6`
(`refactor: extract SegmentedControl, unify toggle style and BodyStep CTA`), which moved that
control into a custom `SegmentedControl` inside the draft-flow layer.

That refactor improved reuse within the draft workspace, but it also left the app with multiple
separate toggle implementations:

- a draft-flow-only `SegmentedControl`
- a standalone `ThemeToggle`
- a separate `LanguageSwitcher`
- other hand-rolled selector patterns in product and marketing surfaces

This now conflicts with the frontend architecture rule that `components/ui/` contains
shadcn-derived primitives only, while product and marketing layers consume those primitives. It
also makes theme behavior, contrast, keyboard behavior, and visual polish drift across the app.

## Goals

- Rebase shared compact toggles on a shadcn/Radix primitive in `frontend/src/components/ui/`.
- Keep the existing Swiss Mail pill styling language rather than switching to stock shadcn visuals.
- Make the company/person toggle feel correct again in light and dark themes.
- Use one shared primitive foundation under both segmented pills and the theme toggle appearance.
- Standardize the compact multi-option selectors in scope for this pass:
  - company/person
  - AI/manual
  - language
  - theme
- Improve accessibility and keyboard behavior through Radix-backed state handling.

## Non-goals

- Do not redesign larger card selectors such as delivery/pricing selection in this pass.
- Do not change copy, workflow order, or product meaning of the controls being migrated.
- Do not introduce generic global toggle styling that ignores Swiss Mail’s current tokens and
  contrast rules.

## Approved approach

### 1. Shared foundation

- Add a shadcn-derived Radix toggle-group primitive under `frontend/src/components/ui/`.
- Use that primitive as the single interaction/state foundation for the compact toggle family.
- Remove the current draft-flow-only `SegmentedControl` implementation once migrations are complete.

### 2. Shared app wrapper

- Build one shared app toggle wrapper on top of the primitive.
- The wrapper must stay generic enough to live outside product-specific feature code.
- The wrapper supports two approved appearances:
  - **segmented pill** — compact labeled choices such as company/person, AI/manual, and language
  - **theme track** — light/dark toggle with a track-and-thumb presentation

Both appearances must use the same primitive state model, selected handling, and focus behavior.

### 3. Styling rules

- Keep Swiss Mail’s pill language and existing app tokens.
- Selected state must remain visually strong in both themes.
- Avoid hardcoded light-only styling that becomes weak or muddy in dark mode.
- Preserve the better parts of the current theme toggle appearance instead of flattening it into a
  plain text pill.
- The component family should look like one system, not four separate controls.

## Behavior and accessibility

- Use Radix single-select behavior for compact toggle groups.
- Compact toggles must support keyboard focus and directional navigation without custom ad hoc logic.
- Selected state must be exposed through the primitive semantics rather than inferred from visual
  styling alone.
- Theme toggle labels must remain truthful and explicit for assistive technology.
- Visual states must rely on shared tokens/classes instead of per-feature hand wiring.

## Adoption scope

This pass migrates the following controls to the shared toggle system:

1. `frontend/src/components/product/draft-flow/RecipientForm.tsx`
2. `frontend/src/components/product/draft-flow/BodyModeToolbar.tsx`
3. `frontend/src/components/marketing/LanguageSwitcher.tsx`
4. `frontend/src/components/marketing/ThemeToggle.tsx`

Larger selector cards such as `frontend/src/components/product/DeliverySelector.tsx` and
`frontend/src/components/marketing/PricingSimulator.tsx` stay out of scope for this pass unless a
direct dependency makes a tiny compatibility change necessary.

## Testing and regression coverage

- Add or update tests for the recent company/person toggle path.
- Add shared-theme contrast coverage for light and dark mode.
- Add behavior coverage for the new shared primitive/wrapper state handling.
- Confirm the old draft-flow-only segmented path is removed from active use.

## Implementation notes

- `components/ui/` must only contain shadcn-derived primitives or generic wrappers built directly on
  them; no draft-flow-specific logic belongs there.
- Product and marketing components should compose the shared toggle system rather than reimplementing
  their own interaction markup.
- Prefer targeted migration over broad refactoring outside the approved scope.
