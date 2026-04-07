# Pre-Production Workspace Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the remaining draft-workspace frontend legacy before production by centralizing repeated step prop types, deleting stale preview prop plumbing, locking the sticky body-toolbar intent, and restoring clearer short fallback subtitles in high-stakes confirmation states.

**Architecture:** Keep this pass behavior-safe and local to the draft workspace frontend. Use source-assertion tests first, then make the smallest structural cleanup in shared step typing and preview prop flow, then update only the affected fallback copy keys while preserving the existing 3-4 word subtitle rule.

**Tech Stack:** React, TypeScript, Next.js, next-intl locale JSON files, Vitest source-assertion tests

---

## File Map

| File | Action | Responsibility |
| --- | --- | --- |
| `frontend/src/components/product/draft-flow/step-props.ts` | Create | Shared step-shell, navigation, input-focus, and preview-toggle prop contracts |
| `frontend/src/components/product/draft-flow/DraftWorkspaceClient.tsx:214-238` | Modify | Split `commonProps` from preview-only props and pass preview props only where used |
| `frontend/src/components/product/draft-flow/draft-shell.tsx:13-32` | Modify | Remove legacy preview props from `DraftShellProps` |
| `frontend/src/components/product/draft-flow/BodyStep.tsx:42-55,428-440` | Modify | Adopt shared step prop types and document sticky preview-toolbar intent |
| `frontend/src/components/product/draft-flow/IntakeStep.tsx:31-43` | Modify | Adopt shared step prop types while keeping preview control support |
| `frontend/src/components/product/draft-flow/{SenderStep,RecipientStep,AttachmentsStep,SubjectStep,LogisticsStep}.tsx` | Modify | Replace duplicated local `StepProps` with shared step-shell types and remove unused legacy props |
| `frontend/src/messages/{en,de,fr,it}-CH.json:594-601` | Modify | Tighten confirmation fallback subtitles while keeping them short |
| `frontend/tests/draft-workspace-navigation.test.ts` | Modify | Lock preview prop routing and shared step-shell cleanup |
| `frontend/tests/workspace-layout.test.ts` | Modify | Lock the sticky body-toolbar intent and `DraftShell` prop cleanup |
| `frontend/tests/page-subtitles.test.ts` | Modify | Lock the revised high-stakes fallback subtitle copy |

---

### Task 1: Centralize draft step prop types and remove stale preview prop threading

**Files:**
- Create: `frontend/src/components/product/draft-flow/step-props.ts`
- Modify: `frontend/src/components/product/draft-flow/DraftWorkspaceClient.tsx:214-238`
- Modify: `frontend/src/components/product/draft-flow/draft-shell.tsx:13-32`
- Modify: `frontend/src/components/product/draft-flow/IntakeStep.tsx:31-43`
- Modify: `frontend/src/components/product/draft-flow/BodyStep.tsx:42-55`
- Modify: `frontend/src/components/product/draft-flow/{SenderStep,RecipientStep,AttachmentsStep,SubjectStep,LogisticsStep}.tsx`
- Test: `frontend/tests/draft-workspace-navigation.test.ts`
- Test: `frontend/tests/workspace-layout.test.ts`

- [ ] **Step 1: Add failing source assertions for the cleanup**

In `frontend/tests/draft-workspace-navigation.test.ts`, add a new test after the existing destination-based navigation assertions:

```typescript
  it("routes preview props only to steps that render preview controls", () => {
    expect(draftWorkspaceClientSource).toContain("const previewProps = {");
    expect(draftWorkspaceClientSource).not.toMatch(
      /const commonProps = \{[\s\S]*onTogglePreview[\s\S]*isPreviewPanelVisible/,
    );
    expect(draftWorkspaceClientSource).not.toContain("furthestUnlockedStepIndex,");
    expect(draftWorkspaceClientSource).toContain('<IntakeStep key="intake" {...commonProps} {...previewProps} />');
    expect(draftWorkspaceClientSource).toContain('<BodyStep key="body" {...commonProps} {...previewProps} />');
  });
```

In `frontend/tests/workspace-layout.test.ts`, add a new assertion inside `"keeps the draft shell overflow-safe on narrow screens"`:

```typescript
    expect(draftShellSource).not.toContain("onTogglePreview?:");
    expect(draftShellSource).not.toContain("isPreviewPanelVisible?:");
```

- [ ] **Step 2: Run the focused tests — expect failure**

Run:

```bash
cd /home/sam/dev/swiss-mail && npx vitest run frontend/tests/draft-workspace-navigation.test.ts frontend/tests/workspace-layout.test.ts
```

Expected:

```text
FAIL  frontend/tests/draft-workspace-navigation.test.ts
FAIL  frontend/tests/workspace-layout.test.ts
```

because `DraftWorkspaceClient` still threads preview props through `commonProps`, and `DraftShellProps` still declares unused preview props.

- [ ] **Step 3: Create the shared step prop module**

Add `frontend/src/components/product/draft-flow/step-props.ts`:

```typescript
export interface DraftWorkspaceStepShellProps {
  draftId: string;
  onStepClick: () => void;
  isStepMenuOpen?: boolean;
  isCompactViewport?: boolean;
  isNavigating?: boolean;
  onPrevious?: (() => void) | undefined;
  previousStepLabel?: string | undefined;
  onInputFocusChange?: (focused: boolean) => void;
  beginNavigation?: () => void;
  navigateToStep?: (step: DraftWorkspaceStepSlug) => void;
}

export interface DraftWorkspacePreviewToggleProps {
  onTogglePreview?: (() => void) | undefined;
  isPreviewPanelVisible?: boolean | undefined;
}
```

Add the supporting type import at the top:

```typescript
import type { DraftWorkspaceStepSlug } from "./steps";
```

- [ ] **Step 4: Remove stale preview props from shared shell code**

In `frontend/src/components/product/draft-flow/draft-shell.tsx`, delete the two legacy preview props from `DraftShellProps`:

```typescript
  onTogglePreview?: (() => void) | undefined;
  isPreviewPanelVisible?: boolean | undefined;
```

In `frontend/src/components/product/draft-flow/DraftWorkspaceClient.tsx`, split preview-only props out of `commonProps`:

```typescript
  const commonProps = {
    draftId,
    onNext: handleNext,
    onPrevious: previousStepSlug ? handlePrevious : undefined,
    onStepClick: handleStepClick,
    previousStepLabel,
    isStepMenuOpen: showSteps,
    isCompactViewport,
    onInputFocusChange: handleInputFocusChange,
    isNavigating,
    beginNavigation,
    navigateToStep,
  };

  const previewProps = {
    onTogglePreview: isWideViewport ? handleTogglePreview : undefined,
    isPreviewPanelVisible,
  };
```

Then apply `previewProps` only to the steps that actually render preview controls:

```tsx
    <IntakeStep key="intake" {...commonProps} {...previewProps} />,
    <SenderStep key="sender" {...commonProps} />,
    <RecipientStep key="recipient" {...commonProps} />,
    <BodyStep key="body" {...commonProps} {...previewProps} />,
    <AttachmentsStep key="attachments" {...commonProps} />,
    <SubjectStep key="subject" {...commonProps} />,
    <LogisticsStep key="logistics" {...commonProps} />,
```

- [ ] **Step 5: Replace duplicated local `StepProps` declarations with shared imports**

Use the new shared types in the step files instead of redeclaring the same shell contract.

For example, in `frontend/src/components/product/draft-flow/BodyStep.tsx`:

```typescript
import type {
  DraftWorkspacePreviewToggleProps,
  DraftWorkspaceStepShellProps,
} from "./step-props";

interface StepProps
  extends DraftWorkspaceStepShellProps,
    DraftWorkspacePreviewToggleProps {
  onNext: () => void;
}
```

In files that do not render preview controls, do **not** extend `DraftWorkspacePreviewToggleProps`.
Also remove the unused `furthestUnlockedStepIndex` prop from local step interfaces and destructuring where it no longer contributes anything.

- [ ] **Step 6: Run the focused tests — expect pass**

Run:

```bash
cd /home/sam/dev/swiss-mail && npx vitest run frontend/tests/draft-workspace-navigation.test.ts frontend/tests/workspace-layout.test.ts
```

Expected:

```text
PASS  frontend/tests/draft-workspace-navigation.test.ts
PASS  frontend/tests/workspace-layout.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add \
  frontend/src/components/product/draft-flow/step-props.ts \
  frontend/src/components/product/draft-flow/DraftWorkspaceClient.tsx \
  frontend/src/components/product/draft-flow/draft-shell.tsx \
  frontend/src/components/product/draft-flow/IntakeStep.tsx \
  frontend/src/components/product/draft-flow/BodyStep.tsx \
  frontend/src/components/product/draft-flow/SenderStep.tsx \
  frontend/src/components/product/draft-flow/RecipientStep.tsx \
  frontend/src/components/product/draft-flow/AttachmentsStep.tsx \
  frontend/src/components/product/draft-flow/SubjectStep.tsx \
  frontend/src/components/product/draft-flow/LogisticsStep.tsx \
  frontend/tests/draft-workspace-navigation.test.ts \
  frontend/tests/workspace-layout.test.ts
git commit -m "refactor: centralize workspace step props and trim stale preview plumbing

Move repeated step-shell types into a shared module, stop threading preview
props through DraftShell and unrelated steps, and keep preview props scoped
to the components that actually render preview controls.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Lock the sticky body-toolbar intent

**Files:**
- Modify: `frontend/src/components/product/draft-flow/BodyStep.tsx:428-440`
- Modify: `frontend/tests/action-spacing.test.ts:46-55`

- [ ] **Step 1: Add a failing regression that documents the intent**

In `frontend/tests/action-spacing.test.ts`, extend the existing body-step assertion block:

```typescript
    expect(bodyStepSource).toContain(
      "// Keep preview in the sticky toolbar so it never widens the dock CTA row.",
    );
    expect(bodyStepSource).not.toContain('isCompactViewport ? "px-1"');
```

- [ ] **Step 2: Run the focused test — expect failure**

Run:

```bash
cd /home/sam/dev/swiss-mail && npx vitest run frontend/tests/action-spacing.test.ts
```

Expected:

```text
FAIL  frontend/tests/action-spacing.test.ts
```

because the source comment and the explicit compact-branch guard do not exist yet.

- [ ] **Step 3: Add the source comment next to the toolbar constant**

In `frontend/src/components/product/draft-flow/BodyStep.tsx`, place this comment directly above `bodyModeToolbarClassName`:

```typescript
  // Keep preview in the sticky toolbar so it never widens the dock CTA row.
  const bodyModeToolbarClassName =
    "sticky top-0 z-10 -mx-4 bg-[var(--app-surface-muted)] px-5 pb-3 pt-1 lg:-mx-6 lg:px-7";
```

- [ ] **Step 4: Run the focused test — expect pass**

Run:

```bash
cd /home/sam/dev/swiss-mail && npx vitest run frontend/tests/action-spacing.test.ts
```

Expected:

```text
PASS  frontend/tests/action-spacing.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/product/draft-flow/BodyStep.tsx frontend/tests/action-spacing.test.ts
git commit -m "test: document sticky body preview toolbar intent

Lock the preview-toolbar placement with an explicit source comment and a
regression so future cleanup does not move preview back into the bottom CTA row.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: Restore clearer high-stakes fallback subtitles while staying short

**Files:**
- Modify: `frontend/src/messages/en-CH.json:597-601`
- Modify: `frontend/src/messages/de-CH.json:597-601`
- Modify: `frontend/src/messages/fr-CH.json:597-601`
- Modify: `frontend/src/messages/it-CH.json:596-600`
- Modify: `frontend/tests/page-subtitles.test.ts:136-153`

- [ ] **Step 1: Add failing exact-value expectations for the fallback strings**

In `frontend/tests/page-subtitles.test.ts`, add a new test block after the word-count assertions:

```typescript
describe("confirmation fallback subtitles", () => {
  it("keeps rejected and payment-failed fallbacks short but action-oriented", () => {
    expect(enCH.confirmation.rejectedSubtitle).toBe("We'll review manually");
    expect(enCH.confirmation.paymentFailedSubtitle).toBe("Return to checkout");

    expect(deCH.confirmation.rejectedSubtitle).toBe("Wir prüfen manuell");
    expect(deCH.confirmation.paymentFailedSubtitle).toBe("Zur Kasse zurück");

    expect(frCH.confirmation.rejectedSubtitle).toBe("Nous vérifions manuellement");
    expect(frCH.confirmation.paymentFailedSubtitle).toBe("Retour au paiement");

    expect(itCH.confirmation.rejectedSubtitle).toBe("Ora verifichiamo manualmente");
    expect(itCH.confirmation.paymentFailedSubtitle).toBe("Torna alla cassa");
  });
});
```

- [ ] **Step 2: Run the copy test — expect failure**

Run:

```bash
cd /home/sam/dev/swiss-mail && npx vitest run frontend/tests/page-subtitles.test.ts
```

Expected:

```text
FAIL  frontend/tests/page-subtitles.test.ts
```

because the locale files still contain the older shortened fallback strings.

- [ ] **Step 3: Update the four locale files**

Change only these keys:

```json
// frontend/src/messages/en-CH.json
"rejectedSubtitle": "We'll review manually",
"paymentFailedSubtitle": "Return to checkout"
```

```json
// frontend/src/messages/de-CH.json
"rejectedSubtitle": "Wir prüfen manuell",
"paymentFailedSubtitle": "Zur Kasse zurück"
```

```json
// frontend/src/messages/fr-CH.json
"rejectedSubtitle": "Nous vérifions manuellement",
"paymentFailedSubtitle": "Retour au paiement"
```

```json
// frontend/src/messages/it-CH.json
"rejectedSubtitle": "Ora verifichiamo manualmente",
"paymentFailedSubtitle": "Torna alla cassa"
```

- [ ] **Step 4: Run the copy test — expect pass**

Run:

```bash
cd /home/sam/dev/swiss-mail && npx vitest run frontend/tests/page-subtitles.test.ts
```

Expected:

```text
PASS  frontend/tests/page-subtitles.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add \
  frontend/src/messages/en-CH.json \
  frontend/src/messages/de-CH.json \
  frontend/src/messages/fr-CH.json \
  frontend/src/messages/it-CH.json \
  frontend/tests/page-subtitles.test.ts
git commit -m "fix: tighten confirmation fallback subtitles for production

Keep the 3-4 word subtitle rule, but restore clearer rejection and payment
failure guidance in the four locale files and lock the copy in tests.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: Run the affected suites and full repo verification

**Files:**
- No code changes
- Test: `frontend/tests/action-spacing.test.ts`
- Test: `frontend/tests/workspace-layout.test.ts`
- Test: `frontend/tests/draft-workspace-navigation.test.ts`
- Test: `frontend/tests/page-subtitles.test.ts`
- Test: `frontend/tests/button-system.test.ts`

- [ ] **Step 1: Run the affected frontend suites**

Run:

```bash
cd /home/sam/dev/swiss-mail && npx vitest run \
  frontend/tests/action-spacing.test.ts \
  frontend/tests/workspace-layout.test.ts \
  frontend/tests/draft-workspace-navigation.test.ts \
  frontend/tests/page-subtitles.test.ts \
  frontend/tests/button-system.test.ts
```

Expected:

```text
Test Files  5 passed
```

- [ ] **Step 2: Run repository verification**

Run:

```bash
cd /home/sam/dev/swiss-mail && npm run typecheck && npm test && npm run lint
```

Expected:

```text
typecheck: PASS
test: PASS
lint: FAIL only if unrelated backend warnings remain
```

If `lint` reports any new frontend warnings from this cleanup, fix them before continuing.

- [ ] **Step 3: Commit any final verification-only fixes**

```bash
git status --short
```

Expected:

```text
no new files beyond the planned cleanup changes
```

- [ ] **Step 4: Final cleanup commit (if Task 4 required follow-up edits)**

```bash
git add -A
git commit -m "chore: finish pre-production workspace cleanup verification

Re-run the focused frontend suites and full repository verification after the
workspace cleanup pass. Keep the remaining lint baseline limited to unrelated
backend warnings.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

If Task 4 required no code changes, skip this commit.
