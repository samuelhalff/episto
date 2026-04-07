# Pre-Production Workspace Cleanup

**Status:** Draft - awaiting user review
**Scope:** Draft workspace and related frontend cleanup only

---

## Problem

The recent workspace fixes solved the visible layout issues, but a few low-risk cleanup items remain before production:

- repeated draft-step prop interfaces still duplicate the same shell contract,
- stale preview props are still threaded through shared workspace components that no longer use them,
- the new sticky body toolbar intent is correct but not explicitly documented in code/tests,
- a couple of shortened high-stakes subtitles became too terse and lost useful guidance.

The goal of this pass is to remove that legacy without redesigning the workspace again.

## Design Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Cleanup scope | Frontend workspace only | User explicitly scoped this pass away from unrelated backend cleanup |
| React optimization pass | None | Current state/callback usage is already appropriate; no meaningful perf debt was found |
| Refactor depth | Focused structural cleanup | Remove dead prop plumbing and duplicated types without changing product behavior |
| Copy policy | Keep subtitles short | Maintain the existing 3-4 word rule while restoring clearer guidance in high-stakes states |

---

## Changes

### 1. Shared workspace step prop types

Create a small shared type module for the repeated step-shell props used across draft workspace steps.

This module should centralize only the truly shared contract:

- `draftId`
- `onStepClick`
- `isStepMenuOpen`
- `isCompactViewport`
- `isNavigating`
- `onPrevious`
- `previousStepLabel`
- `onInputFocusChange` where needed

Preview-related props should be split out into a separate optional type and used only by the steps that actually consume them.

This keeps each step's local props focused while removing duplicated `StepProps` declarations across multiple files.

### 2. Remove stale preview prop plumbing

`DraftShell` should no longer accept preview props that it does not render or use.

The cleanup pass should:

- remove unused preview props from `DraftShellProps`,
- stop passing preview props through steps that only forward them unchanged,
- keep preview-toggle handling only in the step components that actually render preview controls.

This is a behavior-preserving cleanup. The preview sheet/pane UX stays as-is.

### 3. Lock the sticky body toolbar intent

The body-step preview trigger moved out of the bottom CTA row into the top sticky control strip to avoid dock overflow and to keep preview separate from navigation actions.

That intent should be made explicit in two places:

1. a short source comment near the body toolbar class constant, and
2. a regression assertion covering the intentional sticky/shared toolbar behavior.

The goal is to prevent future regressions from reintroducing a compact-only branch or moving preview back into the bottom dock.

### 4. Tighten high-stakes short subtitles

Keep the short subtitle rule, but revise only the problematic confirmation-state strings that became less helpful after shortening.

The cleanup should target the keys whose short copy lost reassurance or a next step, while still staying within the existing concise style across locales.

Examples of the desired direction:

- rejection/ambiguity states should still imply that Swiss Mail will follow up,
- payment failure should still imply a retry/return path,
- no subtitle should expand back into paragraph-length helper copy.

This should remain limited to the affected keys in:

- `en-CH.json`
- `de-CH.json`
- `fr-CH.json`
- `it-CH.json`

### 5. Verification

Run the directly affected workspace/frontend suites plus full repo verification.

Expected outcome:

- targeted workspace/layout/copy tests remain green,
- `typecheck` passes,
- full `test` passes,
- `lint` improves only where this cleanup removes unused frontend legacy, with unrelated backend warnings still out of scope.

---

## What This Does NOT Change

- No backend cleanup or unrelated repo-wide lint work
- No preview architecture redesign
- No new global preview hooks
- No new visual redesign of the workspace
- No speculative React memoization or hook extraction pass

## Files Expected To Change

- `frontend/src/components/product/draft-flow/BodyStep.tsx`
- `frontend/src/components/product/draft-flow/draft-shell.tsx`
- `frontend/src/components/product/draft-flow/*Step.tsx` (only where shared step props or stale preview props are involved)
- `frontend/src/messages/{en,de,fr,it}-CH.json`
- `frontend/tests/action-spacing.test.ts`
- `frontend/tests/workspace-layout.test.ts`
- any directly related frontend regression file needed to lock the cleanup

## Testing Notes

Prioritize the tests that already cover these surfaces:

- `frontend/tests/action-spacing.test.ts`
- `frontend/tests/workspace-layout.test.ts`
- `frontend/tests/draft-workspace-navigation.test.ts`
- `frontend/tests/page-subtitles.test.ts`
- `frontend/tests/button-system.test.ts`

Then re-run full repository verification from the repo root.
