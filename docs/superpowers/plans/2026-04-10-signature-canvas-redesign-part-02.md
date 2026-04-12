# Signature Canvas Redesign — Implementation Plan — Part 2

> Split from [2026-04-10-signature-canvas-redesign.md](2026-04-10-signature-canvas-redesign.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- Task 5: Build SignatureSection component
- Task 6: Wire SignatureSection into LogisticsStep
- Task 7: Update LetterPreview to render drawn signatures

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
        <div className="rounded-[28px] border border-[var(--app-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,249,240,0.92)_100%)] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:bg-[linear-gradient(180deg,rgba(21,28,37,0.96)_0%,rgba(16,22,31,0.92)_100%)]">
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
        <span
          className={isSelected ? "text-amber-600 dark:text-amber-300" : "text-zinc-400"}
        >
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
const signatureAssetUrl = getSignatureFileUrl(draft.signatureAssetId);
const isDrawnSignature = resolvedSignatureMode === "drawn" && Boolean(signatureAssetUrl);
```

Replace the signature rendering block (lines 349-371) with:

```tsx
{
  shouldShowGeneratedSignature ? (
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
  ) : null;
}
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
