# Signature Canvas Redesign — Implementation Plan — Part 3

> Split from [2026-04-10-signature-canvas-redesign.md](2026-04-10-signature-canvas-redesign.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- Task 8: Update backend PDF renderer for drawn signatures
- Task 9: Delete old SignaturePicker and update tests
- Task 10: Update i18n messages
- Task 11: Update docs
- Signature scope — LOCKED: typed name + drawn on-screen signature
- Task 12: Full verification

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
    logger.warn(
      { signatureAssetId, err },
      "Failed to load signature image for PDF render",
    );
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
const signatureImageBase64 = await loadSignatureImageBase64(
  snapshotData.signatureAssetId,
);
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

const globalsSource = readFileSync(resolve(__dirname, "../src/app/globals.css"), "utf-8");

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

See [`../../04-product/signatures-and-attachments.md`](../../04-product/signatures-and-attachments.md).

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
