# Blue signature rendering design

**Status:** Approved for implementation planning  
**Date:** 2026-04-15  
**Scope:** Drawn signature color normalization across app previews, final PDF generation, and confirmation-bundle PDF generation

## Problem

Drawn signatures currently render as the raw uploaded image in both the in-app preview and the backend PDF
template. That means the final appearance depends on the original stroke color, and any color change must be
patched in more than one place. The user requirement is to make all drawn signatures render as blue ink
everywhere the letter is shown, including the workspace preview, review preview, final PDF, and the PDF
included with the confirmation flow, without introducing parallel rendering logic or one-off hacks.

## Current context

- `frontend/src/components/product/LetterPreview.tsx` is the shared in-app A4 preview component used by the
  workspace pane, preview modal, and review page. It renders drawn signatures with a plain `<img src=...>`.
- `backend/src/modules/rendering/render-template.ts` is the shared backend HTML source for letter PDF
  generation. It also renders drawn signatures as a plain image element.
- `backend/src/modules/rendering/render-snapshot-pipeline.ts` uses `renderLetterHtml()` and
  `renderPdfBufferFromHtml()` to generate the stored rendered letter PDF from the reviewed snapshot.
- `backend/src/modules/rendering/pdf-access.ts` uses the same `renderLetterHtml()` output to build the
  letter PDF that is bundled into the confirmation document PDF.
- `backend/src/modules/rendering/signature-image.ts` currently returns only base64 bytes and drops MIME type
  information, while signature uploads allow both PNG and JPEG. The current backend template hardcodes
  `data:image/png`, which is not a safe long-term contract for JPEG signatures.
- The product docs already require preview and final render to share layout logic, and explicitly forbid
  hidden secondary templates (`docs/04-product/document-template.md`).

## Decision

Keep the existing centralized preview and PDF entry points, and centralize the **drawn-signature appearance
rule** behind one shared signature-rendering abstraction.

That abstraction should:

1. accept the original signature asset bytes plus MIME type
2. produce a render-safe, blue-ink representation without mutating the stored source asset
3. be consumable by both the frontend preview path and the backend HTML/PDF path
4. preserve transparent-background handwriting behavior so the signature still looks like ink, not a boxed image

The stored upload remains the source of truth. Blue is a render-time concern, not a storage-time rewrite.

## Recommended rendering shape

Use a shared helper that transforms a drawn signature asset into a **blue-ink render source**. The cleanest
shape is an SVG-based presentation layer that uses the original signature image as the alpha/mask source and
fills it with the canonical blue signature color.

Why this approach:

- it is deterministic and exact, unlike CSS filter tuning
- it keeps the original asset untouched
- it works for previously saved signatures as well as newly drawn ones
- it can be reused as a normal image source in both React preview code and backend HTML templates
- it keeps the blue-ink rule in one place rather than duplicating per-surface color math

This helper becomes the only place that knows how a drawn signature turns into “blue ink”.

## Architecture

### 1. Preview path

All app preview surfaces should continue to render through `LetterPreview`. No preview page or modal should
introduce its own drawn-signature styling logic.

Instead of passing a raw signature image URL directly to the final preview image element, the preview flow
should resolve a blue-ink render source through a shared helper and render that result consistently in:

- `frontend/src/components/product/draft-flow/WorkspacePreviewPane.tsx`
- `frontend/src/components/product/LetterPreviewModal.tsx`
- `frontend/src/components/product/review/ReviewPageReady.tsx`

These wrappers already converge on `LetterPreview`, so the implementation should keep that structure and only
change the signature rendering contract inside or just below that shared component.

### 2. PDF path

All server-generated letter PDFs should continue to originate from `renderLetterHtml()` and
`renderPdfBufferFromHtml()`.

That means two existing flows stay authoritative:

- snapshot render pipeline: `backend/src/modules/rendering/render-snapshot-pipeline.ts`
- confirmation bundle generation: `backend/src/modules/rendering/pdf-access.ts`

Both flows should consume the same blue-signature render source produced by the shared signature helper. No
second PDF template, no confirmation-specific signature styling branch, and no duplicated image tint logic.

### 3. Signature asset loading

The backend signature loader should stop returning only raw base64. It should return enough metadata to build
the blue render source correctly:

- MIME type
- base64 content (or raw bytes before encoding)

That makes JPEG and PNG equally safe inputs and removes the current hidden PNG assumption from the PDF path.

## Data and contract impact

No schema change is required.

- `signatureMode`
- `signatureAssetId`
- file storage keys
- file asset records

all remain unchanged.

The change is strictly about render representation and shared rendering contracts.

## Color rule

Drawn signatures should render in the same canonical blue everywhere. The implementation should reuse the
existing shared letter color tokens where possible; if no suitable token exists yet, add one shared token
rather than hardcoding blue separately in frontend and backend code.

Typed signatures are out of scope for this change and should keep their current styling.

## Backward compatibility

The blue-ink rule applies to **all drawn signatures**, including signatures saved before this change.

That is why the transformation must happen at render time. No migration, no object-storage rewrite, and no
best-effort recoloring job should be introduced.

## Error handling

If a signature asset is missing or unreadable:

- keep current behavior of omitting the drawn image rather than faking success
- do not silently replace the signature with a typed fallback
- preserve existing rendering-failure behavior where the broader PDF pipeline already surfaces an explicit error

The blue-ink transform must not introduce a new success-shaped fallback that hides broken signature assets.

## Testing

Add focused regressions at the shared boundaries:

1. frontend preview rendering test(s) that prove drawn signatures use the centralized blue-ink render source
   instead of the raw upload URL
2. backend rendering test(s) for `renderLetterHtml()` that prove drawn signatures emit the blue-ink render
   source and preserve the canonical signature color token
3. backend signature-loader or helper test(s) that prove PNG and JPEG signatures both round-trip correctly
4. confirmation-bundle coverage that proves the bundled letter PDF still comes from the same centralized letter
   render path

The tests should lock the centralization rule, not just the final color output. Future signature-style changes
should require edits in one shared helper, not multiple surfaces.

## Non-goals

- changing typed-signature styling
- changing signature capture UX or upload limits
- mutating stored signature files to blue on upload
- introducing a separate confirmation-letter template
- rewriting the whole preview system to server-rendered HTML
- changing dispatch, email, or provider behavior beyond the appearance of the generated letter PDF

## Success criteria

This design is successful when:

1. every in-app letter preview shows drawn signatures in blue
2. the stored final letter PDF shows drawn signatures in the same blue
3. the confirmation-bundle PDF includes the same blue letter rendering
4. PNG and JPEG drawn signatures both render correctly
5. the blue-ink rule is implemented once as a shared rendering concern instead of duplicated per surface
