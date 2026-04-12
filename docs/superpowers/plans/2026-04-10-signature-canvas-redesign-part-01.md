# Signature Canvas Redesign — Implementation Plan — Part 1

> Split from [2026-04-10-signature-canvas-redesign.md](2026-04-10-signature-canvas-redesign.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- File Structure
- Task 1: Install react-signature-canvas
- Task 2: Update shared schemas — add "drawn" to signatureMode
- Task 3: Update frontend types and helpers
- Task 4: Build SignatureCanvas component

## File Structure

### New files

| File                                                   | Responsibility                                                                                                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/components/product/SignatureCanvas.tsx`  | Canvas drawing component wrapping react-signature-canvas. Handles responsive sizing, devicePixelRatio, trimmed export, clear/redo, dark-mode-safe canvas background. ~180 lines.      |
| `frontend/src/components/product/SignatureSection.tsx` | Mode picker (typed/drawn) + renders either Allura preview or SignatureCanvas. Lives inside LogisticsStep. Replaces old SignaturePicker.tsx and the inline signature card. ~200 lines. |
| `frontend/tests/signature-canvas.test.ts`              | Unit tests for SignatureSection and canvas integration                                                                                                                                |

### Modified files

| File                                                           | Changes                                                                                                   |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `shared/src/schemas/index.ts`                                  | Add `"drawn"` to signatureMode enum in DraftLetterSchema and SnapshotDataSchema                           |
| `shared/src/contracts/index.ts`                                | Add `"drawn"` to signatureMode in update contract                                                         |
| `frontend/src/hooks/use-letter-preview.ts`                     | Add `"drawn"` to signatureMode type                                                                       |
| `frontend/src/lib/letter-content.ts`                           | Update `hasConcreteSignature` to handle `"drawn"`                                                         |
| `frontend/src/components/product/LetterPreview.tsx`            | Render drawn/image signatures as `<img>` from asset URL instead of always rendering Allura text           |
| `frontend/src/components/product/draft-flow/LogisticsStep.tsx` | Replace inline signature card with `<SignatureSection>`, remove signature bootstrap logic                 |
| `frontend/src/components/product/review/ReviewPageReady.tsx`   | Add "drawn" to signature display logic                                                                    |
| `backend/src/modules/rendering/render.service.ts`              | For drawn mode: load signature asset from S3, embed as base64 `<img>` in HTML. Keep typed mode unchanged. |
| `frontend/src/messages/en-CH.json`                             | Add drawn-mode i18n keys, remove image-upload keys                                                        |
| `frontend/src/messages/de-CH.json`                             | Same                                                                                                      |
| `frontend/src/messages/fr-CH.json`                             | Same                                                                                                      |
| `frontend/src/messages/it-CH.json`                             | Same                                                                                                      |
| `docs/04-product/signatures-and-attachments.md`                | Rewrite signature scope: typed + drawn (image upload removed)                                             |
| `docs/08-guardrails/open-decisions.md`                         | Update signature decision record                                                                          |

### Deleted files

| File                                                  | Reason                               |
| ----------------------------------------------------- | ------------------------------------ |
| `frontend/src/components/product/SignaturePicker.tsx` | Replaced by SignatureSection.tsx     |
| `frontend/tests/signature-flow.test.ts`               | Replaced by signature-canvas.test.ts |

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
