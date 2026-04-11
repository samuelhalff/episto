# Signature Canvas Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing typed-only + image-upload signature system with a clean two-mode signature: typed (Allura cursive font) and drawn (on-screen canvas via `react-signature-canvas`). The drawn signature is exported as a trimmed PNG and uploaded through the existing file-asset pipeline.

**Architecture:** Signature stays inside the Logistics step (no new route step). The `signatureMode` enum gains a `"drawn"` value. Drawn signatures flow through the existing file-asset upload pipeline (`kind: "signature"`) — canvas exports a trimmed PNG blob, uploads it, and the draft stores `signatureAssetId`. The backend PDF renderer embeds drawn-signature PNGs as base64 `<img>` tags. The frontend LetterPreview renders the asset image for drawn mode instead of Allura text.

**Tech Stack:** `react-signature-canvas` (wraps `signature_pad`), existing file-asset upload pipeline, Puppeteer PDF renderer, Next.js + Tailwind frontend.

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `frontend/src/components/product/SignatureCanvas.tsx` | Canvas drawing component wrapping react-signature-canvas. Handles responsive sizing, devicePixelRatio, trimmed export, clear/redo, dark-mode-safe canvas background. ~180 lines. |
| `frontend/src/components/product/SignatureSection.tsx` | Mode picker (typed/drawn) + renders either Allura preview or SignatureCanvas. Lives inside LogisticsStep. Replaces old SignaturePicker.tsx and the inline signature card. ~200 lines. |
| `frontend/tests/signature-canvas.test.ts` | Unit tests for SignatureSection and canvas integration |

### Modified files
| File | Changes |
|------|---------|
| `shared/src/schemas/index.ts` | Add `"drawn"` to signatureMode enum in DraftLetterSchema and SnapshotDataSchema |
| `shared/src/contracts/index.ts` | Add `"drawn"` to signatureMode in update contract |
| `frontend/src/hooks/use-letter-preview.ts` | Add `"drawn"` to signatureMode type |
| `frontend/src/lib/letter-content.ts` | Update `hasConcreteSignature` to handle `"drawn"` |
| `frontend/src/components/product/LetterPreview.tsx` | Render drawn/image signatures as `<img>` from asset URL instead of always rendering Allura text |
| `frontend/src/components/product/draft-flow/LogisticsStep.tsx` | Replace inline signature card with `<SignatureSection>`, remove signature bootstrap logic |
| `frontend/src/components/product/review/ReviewPageReady.tsx` | Add "drawn" to signature display logic |
| `backend/src/modules/rendering/render.service.ts` | For drawn mode: load signature asset from S3, embed as base64 `<img>` in HTML. Keep typed mode unchanged. |
| `frontend/src/messages/en-CH.json` | Add drawn-mode i18n keys, remove image-upload keys |
| `frontend/src/messages/de-CH.json` | Same |
| `frontend/src/messages/fr-CH.json` | Same |
| `frontend/src/messages/it-CH.json` | Same |
| `docs/04-product/signatures-and-attachments.md` | Rewrite signature scope: typed + drawn (image upload removed) |
| `docs/08-guardrails/open-decisions.md` | Update signature decision record |

### Deleted files
| File | Reason |
|------|--------|
| `frontend/src/components/product/SignaturePicker.tsx` | Replaced by SignatureSection.tsx |
| `frontend/tests/signature-flow.test.ts` | Replaced by signature-canvas.test.ts |

---

## Task 1: Install react-signature-canvas

**Files:**
- Modify: `package.json` (root)
- Modify: `frontend/package.json`

- [ ] **Step 1: Install dependency**

```bash
npm install react-signature-canvas --workspace=frontend
```

The library includes TypeScript types. Verify:

```bash
ls node_modules/react-signature-canvas/dist/index.d.ts || ls node_modules/@types/react-signature-canvas/index.d.ts
```

- [ ] **Step 2: Check types are available**

```bash
cd /home/sam/dev/swiss-mail && grep -r "react-signature-canvas" frontend/package.json
```

Expected: dependency listed in frontend/package.json.

Note: `react-signature-canvas` depends on `signature_pad` which will be installed automatically as a transitive dependency.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json frontend/package.json
git commit -m "chore: install react-signature-canvas for drawn signature support"
```

---

## Task 2: Update shared schemas — add "drawn" to signatureMode

**Files:**
- Modify: `shared/src/schemas/index.ts` (lines with signatureMode enum)
- Modify: `shared/src/contracts/index.ts` (line 33)
- Test: `shared/tests/letter-layout.test.ts` (add schema validation test)

- [ ] **Step 1: Write the failing test**

Add to the end of `shared/tests/letter-layout.test.ts`:

```typescript
describe("signatureMode enum", () => {
  it("accepts 'drawn' as a valid signatureMode", () => {
    const { DraftLetterSchema } = await import("../src/schemas/index.js");
    const partial = DraftLetterSchema.pick({ signatureMode: true });
    expect(partial.parse({ signatureMode: "drawn" })).toEqual({ signatureMode: "drawn" });
  });

  it("accepts 'drawn' in SnapshotDataSchema", () => {
    const { SnapshotDataSchema } = await import("../src/schemas/index.js");
    // signatureMode is one field among many; just check the enum accepts "drawn"
    const partial = SnapshotDataSchema.pick({ signatureMode: true });
    expect(partial.parse({ signatureMode: "drawn" })).toEqual({ signatureMode: "drawn" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run shared/tests/letter-layout.test.ts -v
```

Expected: FAIL — "drawn" not in enum.

- [ ] **Step 3: Update DraftLetterSchema**

In `shared/src/schemas/index.ts`, change:
```typescript
signatureMode: z.enum(["typed", "image"]).nullable(),
```
to:
```typescript
signatureMode: z.enum(["typed", "drawn"]).nullable(),
```

Do this in **both** places: the DraftLetterSchema (~line 148) and the SnapshotDataSchema (~line 196).

- [ ] **Step 4: Update contracts**

In `shared/src/contracts/index.ts`, change:
```typescript
signatureMode: z.enum(["typed", "image"]).nullable().optional(),
```
to:
```typescript
signatureMode: z.enum(["typed", "drawn"]).nullable().optional(),
```

- [ ] **Step 5: Rebuild shared and run tests**

```bash
npm run build -w shared && npx vitest run shared/tests/letter-layout.test.ts -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add shared/
git commit -m "feat(shared): add 'drawn' to signatureMode enum, drop 'image'"
```

---

## Task 3: Update frontend types and helpers

**Files:**
- Modify: `frontend/src/hooks/use-letter-preview.ts` (line 42)
- Modify: `frontend/src/lib/letter-content.ts` (lines 131-140)
- Modify: `frontend/src/components/product/review/ReviewPageReady.tsx` (lines 120-127)

- [ ] **Step 1: Update LetterPreviewData type**

In `frontend/src/hooks/use-letter-preview.ts`, change line 42:
```typescript
signatureMode: "typed" | "image" | null;
```
to:
```typescript
signatureMode: "typed" | "drawn" | null;
```

- [ ] **Step 2: Update hasConcreteSignature helper**

In `frontend/src/lib/letter-content.ts`, replace the `hasConcreteSignature` function (lines 131-140):

```typescript
export function hasConcreteSignature(
  signatureMode: string | null | undefined,
  signatureFileId: string | null | undefined,
): boolean {
  if (signatureMode === "typed") return true;
  return signatureMode === "drawn" && Boolean(signatureFileId);
}
```

- [ ] **Step 3: Update ReviewPageReady signature display**

In `frontend/src/components/product/review/ReviewPageReady.tsx`, replace the signature summary item (lines 120-127):

```typescript
{
  label: t("signature"),
  value: hasSignature
    ? signatureMode === "drawn"
      ? t("drawnSignature")
      : t("typedSignature")
    : t("noSignature"),
  helperText: !hasSignature ? t("signatureMissingHelp") : undefined,
},
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS (or only pre-existing errors unrelated to signature)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/use-letter-preview.ts frontend/src/lib/letter-content.ts frontend/src/components/product/review/ReviewPageReady.tsx
git commit -m "feat(frontend): update signature types and helpers for drawn mode"
```

---

## Task 4: Build SignatureCanvas component

**Files:**
- Create: `frontend/src/components/product/SignatureCanvas.tsx`

This is the core canvas wrapper. It:
- Wraps `react-signature-canvas` in a responsive container
- Handles devicePixelRatio for crisp rendering
- Always uses a white canvas background (dark-mode-safe — the canvas simulates paper)
- Exports a **trimmed** PNG blob on save (not the full canvas with empty margins)
- Provides clear button
- Calls `onSignatureReady(blob)` when the user finishes a stroke

- [ ] **Step 1: Create the component**

Create `frontend/src/components/product/SignatureCanvas.tsx`:

```tsx
"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import SignaturePad from "react-signature-canvas";
import { useTranslations } from "next-intl";
import { Eraser } from "lucide-react";

interface SignatureCanvasProps {
  penColor?: string;
  onSignatureReady: (blob: Blob) => void;
  onClear: () => void;
  disabled?: boolean;
}

const CANVAS_ASPECT = 3;
const MIN_CANVAS_HEIGHT = 120;
const MAX_DEVICE_PIXEL_RATIO = 2;

export function SignatureCanvas({
  penColor = "#222222",
  onSignatureReady,
  onClear,
  disabled = false,
}: SignatureCanvasProps) {
  const t = useTranslations("signature");
  const containerRef = useRef<HTMLDivElement>(null);
  const padRef = useRef<SignaturePad>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const resizeCanvas = useCallback(() => {
    const container = containerRef.current;
    const pad = padRef.current;
    if (!container || !pad) return;

    const canvas = pad.getCanvas();
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
    const width = container.offsetWidth;
    const height = Math.max(Math.round(width / CANVAS_ASPECT), MIN_CANVAS_HEIGHT);

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      // White background for paper-like feel and clean PNG export
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }

    pad.clear();
    setIsEmpty(true);
  }, []);

  useEffect(() => {
    resizeCanvas();
    const observer = new ResizeObserver(() => resizeCanvas());
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [resizeCanvas]);

  function handleStrokeEnd() {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) {
      setIsEmpty(true);
      return;
    }
    setIsEmpty(false);

    const trimmed = pad.getTrimmedCanvas();
    trimmed.toBlob(
      (blob) => {
        if (blob) onSignatureReady(blob);
      },
      "image/png",
      1.0,
    );
  }

  function handleClear() {
    const pad = padRef.current;
    if (!pad) return;

    const canvas = pad.getCanvas();
    const ctx = canvas.getContext("2d");
    pad.clear();
    if (ctx) {
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
      ctx.scale(ratio, ratio);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    }
    setIsEmpty(true);
    onClear();
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl border border-[var(--app-border)] bg-white"
      >
        <SignaturePad
          ref={padRef}
          penColor={penColor}
          minWidth={0.5}
          maxWidth={2.5}
          velocityFilterWeight={0.7}
          onEnd={handleStrokeEnd}
          canvasProps={{
            className: `w-full touch-none ${disabled ? "pointer-events-none opacity-50" : "cursor-crosshair"}`,
          }}
        />
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-zinc-300">{t("draw.placeholder")}</span>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleClear}
          disabled={isEmpty || disabled}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <Eraser className="h-3.5 w-3.5" />
          {t("draw.clear")}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/product/SignatureCanvas.tsx
git commit -m "feat(frontend): add SignatureCanvas component wrapping react-signature-canvas"
```

---

## Task 5: Build SignatureSection component

**Files:**
- Create: `frontend/src/components/product/SignatureSection.tsx`

This replaces the old read-only signature card in LogisticsStep AND the old SignaturePicker.tsx. It shows a mode toggle (typed vs drawn) and renders the appropriate sub-component.

- [ ] **Step 1: Create the component**

Create `frontend/src/components/product/SignatureSection.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, PenLine, Type } from "lucide-react";
import { LETTER_COLORS } from "@swiss-mail/shared";
import type { FileAsset } from "@swiss-mail/shared";
import { SignatureCanvas } from "./SignatureCanvas";
import { getApiUrl } from "../../lib/api";

type SignatureMode = "typed" | "drawn";

interface SignatureSectionProps {
  currentMode: SignatureMode | null;
  signerName: string;
  signatureAsset: FileAsset | null;
  isUploading: boolean;
  isCompactViewport: boolean;
  onModeChange: (mode: SignatureMode) => Promise<void>;
  onDrawnSignatureReady: (blob: Blob) => Promise<void>;
  onClearDrawnSignature: () => Promise<void>;
}

export function SignatureSection({
  currentMode,
  signerName,
  signatureAsset,
  isUploading,
  isCompactViewport,
  onModeChange,
  onDrawnSignatureReady,
  onClearDrawnSignature,
}: SignatureSectionProps) {
  const t = useTranslations("signature");
  const [switchingTo, setSwitchingTo] = useState<SignatureMode | null>(null);

  const resolvedMode = currentMode ?? "typed";
  const isSwitching = switchingTo !== null;

  const handleModeSwitch = useCallback(
    async (next: SignatureMode) => {
      if (next === resolvedMode || isSwitching) return;
      setSwitchingTo(next);
      try {
        await onModeChange(next);
      } finally {
        setSwitchingTo(null);
      }
    },
    [resolvedMode, isSwitching, onModeChange],
  );

  const signatureImageUrl =
    signatureAsset && resolvedMode === "drawn"
      ? getApiUrl(`/v1/files/${signatureAsset.id}/download`)
      : null;

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-3">
        <ModeCard
          mode="typed"
          icon={<Type className="h-4 w-4" />}
          label={t("mode.typed.label")}
          description={t("mode.typed.description")}
          isSelected={resolvedMode === "typed"}
          isSwitching={switchingTo === "typed"}
          onClick={() => void handleModeSwitch("typed")}
          disabled={isSwitching}
        />
        <ModeCard
          mode="drawn"
          icon={<PenLine className="h-4 w-4" />}
          label={t("mode.drawn.label")}
          description={t("mode.drawn.description")}
          isSelected={resolvedMode === "drawn"}
          isSwitching={switchingTo === "drawn"}
          onClick={() => void handleModeSwitch("drawn")}
          disabled={isSwitching}
        />
      </div>

      {/* Typed preview */}
      {resolvedMode === "typed" && (
        <div
          className="rounded-[28px] border border-[var(--app-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,249,240,0.92)_100%)] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:bg-[linear-gradient(180deg,rgba(21,28,37,0.96)_0%,rgba(16,22,31,0.92)_100%)]"
        >
          <p className="signature-script text-zinc-700 dark:text-zinc-100">
            {signerName || t("preview.placeholder")}
          </p>
          <p className="signature-name mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {signerName || t("preview.placeholder")}
          </p>
        </div>
      )}

      {/* Drawn canvas */}
      {resolvedMode === "drawn" && (
        <div className="space-y-3">
          {signatureImageUrl && !isUploading ? (
            <div className="rounded-[28px] border border-[var(--app-border)] bg-white px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
              <img
                src={signatureImageUrl}
                alt={t("draw.savedAlt")}
                className="mx-auto max-h-20 object-contain"
              />
              <p className="signature-name mt-2 text-center text-sm text-zinc-500">
                {signerName}
              </p>
            </div>
          ) : null}

          <SignatureCanvas
            penColor={LETTER_COLORS.signatureScript}
            onSignatureReady={onDrawnSignatureReady}
            onClear={() => void onClearDrawnSignature()}
            disabled={isUploading}
          />

          {isUploading && (
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("draw.saving")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModeCard({
  mode,
  icon,
  label,
  description,
  isSelected,
  isSwitching,
  onClick,
  disabled,
}: {
  mode: SignatureMode;
  icon: React.ReactNode;
  label: string;
  description: string;
  isSelected: boolean;
  isSwitching: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onClick}
      disabled={disabled}
      className={[
        "relative rounded-xl border px-4 py-3 text-left transition-all",
        isSelected
          ? "border-amber-300 bg-amber-50/50 ring-1 ring-amber-200 dark:border-amber-400/40 dark:bg-amber-400/10 dark:ring-amber-400/20"
          : "border-[var(--app-border)] bg-[var(--app-surface)] hover:border-amber-200 hover:bg-amber-50/30 dark:hover:border-amber-400/30 dark:hover:bg-amber-400/5",
        disabled && !isSelected ? "opacity-50" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span className={isSelected ? "text-amber-600 dark:text-amber-300" : "text-zinc-400"}>
          {isSwitching ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        </span>
        <span className="text-sm font-semibold">{label}</span>
        {isSelected && !isSwitching && (
          <Check className="ml-auto h-4 w-4 text-amber-500 dark:text-amber-300" />
        )}
      </div>
      <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">{description}</p>
    </button>
  );
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/product/SignatureSection.tsx
git commit -m "feat(frontend): add SignatureSection with typed/drawn mode toggle"
```

---

## Task 6: Wire SignatureSection into LogisticsStep

**Files:**
- Modify: `frontend/src/components/product/draft-flow/LogisticsStep.tsx`

Remove: old signature bootstrap useEffect, old read-only signature card.
Add: `<SignatureSection>` with proper callbacks that upload drawn signatures via the existing file-asset pipeline.

- [ ] **Step 1: Update LogisticsStep**

Replace the signature section in LogisticsStep. Key changes:

1. Remove the `signatureBootstrapRef` and its `useEffect` (lines 47, 78-92)
2. Remove the old read-only signature card section (lines 311-334)
3. Import and wire `SignatureSection`

In the imports section, add:
```typescript
import { SignatureSection } from "../SignatureSection";
```

Remove from imports: the `signatureBootstrapRef` declaration and the bootstrap `useEffect`.

Replace the signature `<section>` block (lines 311-334) with:

```tsx
<section className="space-y-5">
  <div
    className={
      isCompactViewport
        ? "flex items-center gap-4 px-2"
        : "sticky top-0 z-10 -mx-4 flex items-center gap-4 bg-[var(--app-surface-muted)] px-5 pb-3 pt-1 lg:-mx-6 lg:px-7"
    }
  >
    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
      {t("signatureLabel")}
    </h3>
  </div>

  <Card isCompactViewport={isCompactViewport} density="thin">
    <SignatureSection
      currentMode={(draft.data?.signatureMode as "typed" | "drawn" | null) ?? "typed"}
      signerName={signatureDisplayName}
      signatureAsset={files.signature}
      isUploading={files.isUploading}
      isCompactViewport={isCompactViewport}
      onModeChange={async (mode) => {
        if (mode === "typed") {
          // Clear any drawn signature asset when switching to typed
          if (files.signature) {
            await files.removeFile(files.signature.id);
          }
        }
        await updateDraft.mutateAsync({
          signatureMode: mode,
          signatureAssetId: mode === "typed" ? null : undefined,
        });
      }}
      onDrawnSignatureReady={async (blob) => {
        // Remove previous signature asset before uploading new one
        if (files.signature) {
          await files.removeFile(files.signature.id);
        }
        const file = new File([blob], "signature.png", { type: "image/png" });
        const asset = await files.uploadFile(file, "signature");
        await updateDraft.mutateAsync({
          signatureMode: "drawn",
          signatureAssetId: asset.id,
        });
      }}
      onClearDrawnSignature={async () => {
        if (files.signature) {
          await files.removeFile(files.signature.id);
        }
        await updateDraft.mutateAsync({ signatureAssetId: null });
      }}
    />
  </Card>
</section>
```

Also update `handleReview` to remove the forced "typed" override (lines 120-126). Remove:
```typescript
if (draft.data?.signatureMode !== "typed") {
  reviewUpdates.signatureMode = "typed";
}
if ((draft.data?.signatureAssetId ?? null) !== null) {
  reviewUpdates.signatureAssetId = null;
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/product/draft-flow/LogisticsStep.tsx
git commit -m "feat(frontend): wire SignatureSection into LogisticsStep, remove old bootstrap"
```

---

## Task 7: Update LetterPreview to render drawn signatures

**Files:**
- Modify: `frontend/src/components/product/LetterPreview.tsx` (lines 95-99, 349-371)

Currently `shouldShowGeneratedSignature` is true for any non-null signatureMode, and it always renders Allura text. We need to branch: typed → Allura text, drawn → `<img>` from asset URL.

- [ ] **Step 1: Update LetterPreview**

Add `signatureUrl` prop and update signature rendering. Add import:
```typescript
import { getSignatureFileUrl } from "../../lib/letter-content";
```

After `resolvedSignatureMode` (line 96), add:
```typescript
const signatureAssetUrl = getSignatureFileUrl(
  draft.signatureAssetId,
);
const isDrawnSignature = resolvedSignatureMode === "drawn" && Boolean(signatureAssetUrl);
```

Replace the signature rendering block (lines 349-371) with:

```tsx
{shouldShowGeneratedSignature ? (
  <div style={{ marginTop: mmToPageCqw(LETTER_LAYOUT_MM.signature.marginTop) }}>
    {isDrawnSignature ? (
      <>
        <img
          src={signatureAssetUrl!}
          alt=""
          style={{
            maxHeight: ptToPageCqw(LETTER_LAYOUT_PT.signatureScript * 1.5),
            maxWidth: "50%",
            objectFit: "contain",
          }}
        />
        <p
          className="signature-name"
          style={{
            marginTop: mmToPageCqw(LETTER_LAYOUT_MM.signatureName.marginTop),
            fontSize: ptToPageCqw(LETTER_LAYOUT_PT.signatureName),
            color: LETTER_COLORS.signatureName,
          }}
        >
          {signatureDisplayName}
        </p>
      </>
    ) : (
      <>
        <p
          className="signature-script"
          style={{
            fontSize: ptToPageCqw(LETTER_LAYOUT_PT.signatureScript),
            lineHeight: 0.9,
            transform: "rotate(-1.5deg)",
            color: LETTER_COLORS.signatureScript,
          }}
        >
          {signatureDisplayName}
        </p>
        <p
          className="signature-name"
          style={{
            marginTop: mmToPageCqw(LETTER_LAYOUT_MM.signatureName.marginTop),
            fontSize: ptToPageCqw(LETTER_LAYOUT_PT.signatureName),
            color: LETTER_COLORS.signatureName,
          }}
        >
          {signatureDisplayName}
        </p>
      </>
    )}
  </div>
) : null}
```

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/product/LetterPreview.tsx
git commit -m "feat(frontend): render drawn signature as image in LetterPreview"
```

---

## Task 8: Update backend PDF renderer for drawn signatures

**Files:**
- Modify: `backend/src/modules/rendering/render.service.ts` (lines 237-244, 343-362)

For drawn mode, the renderer must:
1. Load the signature file asset from S3
2. Convert to base64 data URL
3. Embed as `<img>` in the signature block HTML
4. Add CSS for the signature image

- [ ] **Step 1: Update renderLetterHtml to accept optional signature image**

The function signature is `renderLetterHtml(data: SnapshotData)`. SnapshotData already has `signatureAssetId`. But the render function currently doesn't have access to the S3 file. We need to make the HTML generation accept an optional base64 image parameter.

Add a new function in `render.service.ts` near the existing `getSenderSignatureName`:

```typescript
async function loadSignatureImageBase64(
  signatureAssetId: string | null,
): Promise<string | null> {
  if (!signatureAssetId) return null;

  const db = getDb();
  const [asset] = await db
    .select()
    .from(schema.fileAssets)
    .where(eq(schema.fileAssets.id, signatureAssetId))
    .limit(1);

  if (!asset || asset.kind !== "signature") return null;

  try {
    const { buffer, contentType } = await downloadObjectBuffer(asset.storageKey);
    const mime = contentType || asset.mimeType || "image/png";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch (err) {
    logger.warn({ signatureAssetId, err }, "Failed to load signature image for PDF render");
    return null;
  }
}
```

Add the import at the top:
```typescript
import { downloadObjectBuffer } from "../files/adapters/s3.adapter.js";
```

- [ ] **Step 2: Update renderLetterHtml to accept signature image**

Change the function signature:
```typescript
export function renderLetterHtml(data: SnapshotData, signatureImageBase64?: string | null): string {
```

Replace the signatureBlock construction (lines 238-244):

```typescript
const signatureName = getSenderSignatureName(sender);
let signatureBlock = "";
if (data.signatureMode && signatureName) {
  if (data.signatureMode === "drawn" && signatureImageBase64) {
    signatureBlock = `<div class="signature-block">
  <img class="signature-image" src="${signatureImageBase64}" alt="" />
  <div class="signature-name">${escapeHtml(signatureName)}</div>
</div>`;
  } else {
    signatureBlock = `<div class="signature-block">
  <div class="signature-script">${escapeHtml(signatureName)}</div>
  <div class="signature-name">${escapeHtml(signatureName)}</div>
</div>`;
  }
}
```

- [ ] **Step 3: Add CSS for signature image**

After the `.signature-name` CSS rule (around line 362), add:

```css
    .signature-image {
      max-height: 25mm;
      max-width: 60mm;
      object-fit: contain;
    }
```

- [ ] **Step 4: Update renderSnapshotToPdf to load signature image**

In `renderSnapshotToPdf` (line 636), change:
```typescript
const html = renderLetterHtml(snapshotData);
```
to:
```typescript
const signatureImageBase64 = await loadSignatureImageBase64(snapshotData.signatureAssetId);
const html = renderLetterHtml(snapshotData, signatureImageBase64);
```

- [ ] **Step 5: Rebuild shared, run backend tests**

```bash
npm run build -w shared && npx vitest run backend/tests/render-service.test.ts backend/tests/regression-pdf-template.test.ts -v
```

Expected: PASS (existing tests use typed mode, so they're unaffected)

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/rendering/render.service.ts
git commit -m "feat(backend): render drawn signature as embedded image in PDF"
```

---

## Task 9: Delete old SignaturePicker and update tests

**Files:**
- Delete: `frontend/src/components/product/SignaturePicker.tsx`
- Delete: `frontend/tests/signature-flow.test.ts`
- Create: `frontend/tests/signature-canvas.test.ts`

- [ ] **Step 1: Delete old files**

```bash
rm frontend/src/components/product/SignaturePicker.tsx
rm frontend/tests/signature-flow.test.ts
```

- [ ] **Step 2: Verify no remaining imports of SignaturePicker**

```bash
grep -rn "SignaturePicker" frontend/src/ --include="*.tsx" --include="*.ts"
```

Expected: no results (it was not imported in LogisticsStep or elsewhere in the current code)

- [ ] **Step 3: Write new signature tests**

Create `frontend/tests/signature-canvas.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const signatureSectionSource = readFileSync(
  resolve(__dirname, "../src/components/product/SignatureSection.tsx"),
  "utf-8",
);

const signatureCanvasSource = readFileSync(
  resolve(__dirname, "../src/components/product/SignatureCanvas.tsx"),
  "utf-8",
);

const logisticsStepSource = readFileSync(
  resolve(__dirname, "../src/components/product/draft-flow/LogisticsStep.tsx"),
  "utf-8",
);

const letterPreviewSource = readFileSync(
  resolve(__dirname, "../src/components/product/LetterPreview.tsx"),
  "utf-8",
);

const renderServiceSource = readFileSync(
  resolve(__dirname, "../../backend/src/modules/rendering/render.service.ts"),
  "utf-8",
);

const globalsSource = readFileSync(
  resolve(__dirname, "../src/app/globals.css"),
  "utf-8",
);

describe("signature canvas integration", () => {
  it("ships Allura handwriting font for typed signatures", () => {
    expect(globalsSource).toContain("@font-face");
    expect(globalsSource).toContain('font-family: "Allura Signature"');
    expect(globalsSource).toContain(".signature-script");
  });

  it("SignatureSection supports typed and drawn modes", () => {
    expect(signatureSectionSource).toContain('"typed"');
    expect(signatureSectionSource).toContain('"drawn"');
    // Should NOT contain image upload mode
    expect(signatureSectionSource).not.toContain('mode === "image"');
  });

  it("SignatureCanvas uses react-signature-canvas", () => {
    expect(signatureCanvasSource).toContain("react-signature-canvas");
    expect(signatureCanvasSource).toContain("getTrimmedCanvas");
  });

  it("SignatureCanvas exports trimmed PNG", () => {
    expect(signatureCanvasSource).toContain("toBlob");
    expect(signatureCanvasSource).toContain('"image/png"');
  });

  it("LogisticsStep uses SignatureSection instead of old inline card", () => {
    expect(logisticsStepSource).toContain("SignatureSection");
    // Old bootstrap pattern should be gone
    expect(logisticsStepSource).not.toContain("signatureBootstrapRef");
  });

  it("LetterPreview handles drawn signatures as images", () => {
    expect(letterPreviewSource).toContain("isDrawnSignature");
    expect(letterPreviewSource).toContain("<img");
  });

  it("PDF renderer supports drawn signature image embedding", () => {
    expect(renderServiceSource).toContain("signature-image");
    expect(renderServiceSource).toContain("loadSignatureImageBase64");
  });

  it("PDF renderer keeps typed signature with Allura font", () => {
    expect(renderServiceSource).toContain("signature-script");
    expect(renderServiceSource).toContain("Allura Signature");
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run frontend/tests/signature-canvas.test.ts -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test(frontend): replace old signature tests with canvas integration tests"
```

---

## Task 10: Update i18n messages

**Files:**
- Modify: `frontend/src/messages/en-CH.json`
- Modify: `frontend/src/messages/de-CH.json`
- Modify: `frontend/src/messages/fr-CH.json`
- Modify: `frontend/src/messages/it-CH.json`

- [ ] **Step 1: Update en-CH.json**

Replace the `signature` block with:

```json
"signature": {
  "prompt": "How would you like to sign your letter?",
  "mode": {
    "typed": {
      "label": "Type name",
      "description": "Rendered in elegant cursive"
    },
    "drawn": {
      "label": "Draw signature",
      "description": "Sign with finger or stylus"
    }
  },
  "preview": {
    "label": "Preview on letter",
    "placeholder": "Your name"
  },
  "draw": {
    "placeholder": "Sign here",
    "clear": "Clear",
    "saving": "Saving…",
    "savedAlt": "Your drawn signature"
  }
}
```

Add to the `review` section:
```json
"drawnSignature": "Drawn signature"
```

Remove the old image-upload keys (`imageAlt`, `remove`, `uploading`, `uploadPrompt`, `uploadHint`, `error.unsupportedType`, `error.tooLarge`, `mode.image.*`).

- [ ] **Step 2: Update de-CH.json**

```json
"signature": {
  "prompt": "Wie möchten Sie Ihren Brief unterschreiben?",
  "mode": {
    "typed": {
      "label": "Name eintippen",
      "description": "In eleganter Schreibschrift dargestellt"
    },
    "drawn": {
      "label": "Unterschrift zeichnen",
      "description": "Mit Finger oder Stift unterschreiben"
    }
  },
  "preview": {
    "label": "Vorschau auf dem Brief",
    "placeholder": "Ihr Name"
  },
  "draw": {
    "placeholder": "Hier unterschreiben",
    "clear": "Löschen",
    "saving": "Wird gespeichert…",
    "savedAlt": "Ihre gezeichnete Unterschrift"
  }
}
```

Add `"drawnSignature": "Gezeichnete Unterschrift"` to review section.

- [ ] **Step 3: Update fr-CH.json**

```json
"signature": {
  "prompt": "Comment souhaitez-vous signer votre lettre ?",
  "mode": {
    "typed": {
      "label": "Saisir le nom",
      "description": "Rendu en écriture cursive élégante"
    },
    "drawn": {
      "label": "Dessiner la signature",
      "description": "Signez avec le doigt ou un stylet"
    }
  },
  "preview": {
    "label": "Aperçu sur la lettre",
    "placeholder": "Votre nom"
  },
  "draw": {
    "placeholder": "Signez ici",
    "clear": "Effacer",
    "saving": "Enregistrement…",
    "savedAlt": "Votre signature dessinée"
  }
}
```

Add `"drawnSignature": "Signature dessinée"` to review section.

- [ ] **Step 4: Update it-CH.json**

```json
"signature": {
  "prompt": "Come desidera firmare la lettera?",
  "mode": {
    "typed": {
      "label": "Digitare il nome",
      "description": "Reso in elegante corsivo"
    },
    "drawn": {
      "label": "Disegnare la firma",
      "description": "Firmi con il dito o lo stilo"
    }
  },
  "preview": {
    "label": "Anteprima sulla lettera",
    "placeholder": "Il suo nome"
  },
  "draw": {
    "placeholder": "Firmi qui",
    "clear": "Cancella",
    "saving": "Salvataggio…",
    "savedAlt": "La sua firma disegnata"
  }
}
```

Add `"drawnSignature": "Firma disegnata"` to review section.

- [ ] **Step 5: Verify typecheck and lint**

```bash
npm run typecheck && npm run lint
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/messages/
git commit -m "i18n: add drawn signature messages in all 4 locales, remove image upload keys"
```

---

## Task 11: Update docs

**Files:**
- Modify: `docs/04-product/signatures-and-attachments.md`
- Modify: `docs/08-guardrails/open-decisions.md`

- [ ] **Step 1: Rewrite signatures-and-attachments.md signature section**

Replace lines 9-25 of `docs/04-product/signatures-and-attachments.md` with:

```markdown
## Signature scope — LOCKED: typed name + drawn on-screen signature

**Locked choice: two signature modes.**

1. **Typed** — sender name rendered in cursive handwriting font (Allura). Always available.
2. **Drawn** — user draws signature on-screen via canvas pad (uses `react-signature-canvas`).
   Exported as trimmed PNG, uploaded via the file-asset pipeline, and embedded in the final PDF.

Both modes show sender's printed name below the signature in the final letter.

Signature is optional. Users who skip signature receive a help hint but can proceed.

**Why this is locked:**

- Typed-only was too weak for the perceived trust level of formal Swiss letters
- On-screen drawing via `signature_pad` (wrapped by `react-signature-canvas`) is the industry
  standard approach — smooth Bézier curves, mobile/touch support, minimal implementation overhead
- Image upload was dropped — drawn signature covers the handwritten use case with better UX
  and without file management complexity. Can be re-added if customers request it.
```

- [ ] **Step 2: Update open-decisions.md**

Replace the signature scope section (~lines 36-45):

```markdown
### Signature scope — LOCKED: typed name + drawn on-screen signature

**Locked choice:** Two modes: typed (cursive font) and drawn (on-screen canvas).

See [`../04-product/signatures-and-attachments.md`](../04-product/signatures-and-attachments.md).

**Option A (typed only) rejected** — too weak for the perceived trust level.
**Option B (typed + upload) superseded** — drawn signature is higher quality than upload for most users.
**Option C (typed + upload + drawn) rejected** — image upload adds complexity without enough value when drawn is available. Can be re-added if requested.
```

- [ ] **Step 3: Commit**

```bash
git add docs/
git commit -m "docs: update signature scope to typed + drawn, drop image upload"
```

---

## Task 12: Full verification

- [ ] **Step 1: Rebuild shared**

```bash
npm run build -w shared
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: PASS

- [ ] **Step 5: Final commit if any uncommitted changes**

```bash
git add -A && git status
# Only commit if there are changes
git diff --cached --quiet || git commit -m "chore: final cleanup for signature canvas redesign"
```
