# Document Template and PDF Rules

> This document covers rendering approach, validation, and anti-drift rules.
> For physical dimensions, zone coordinates, typography, and postal window constraints, see [`a4-template-specification.md`](a4-template-specification.md).

## Multi-page policy — LOCKED

Body text may span up to 5 pages. Pages 2–N carry a header with document title and page number. Signature block always on final page. Enclosure note (if present) immediately before signature on final page. Overflow beyond 5 pages is a hard validation error.

## MVP template rules

One A4 template. Fixed zones: sender, recipient, subject, body, signature, optional enclosure. All dimensions and zone coordinates defined in `a4-template-specification.md`.

## Formatting rules

No rich freeform formatting. Controlled typography only (font family/size locked per `a4-template-specification.md`). No arbitrary images except approved signature and attachment references. No layout elements that can move postal-address zones.

## Rendering approach

- Canonical source is structured draft state — never the PDF itself
- HTML/CSS to PDF (Puppeteer) is the approved rendering path
- Preview and final render must share the same layout logic; divergence = bug
- Rendered version hash stored and verified at dispatch time

## Validation rules

| Check | Action on failure |
|---|---|
| Required postal zones present | Block render |
| Address fields within character limits | Block render |
| Page count ≤ 5 | Block render, return overflow error |
| No unsupported asset types | Block render |
| Rendered content matches reviewed version hash | Block dispatch |
| Recipient address visible through window envelope | Block render |

## Anti-drift rule

No second hidden template may exist in code. If marketing preview, editor preview, and final PDF differ in zone placement or typography, the implementation is wrong.
