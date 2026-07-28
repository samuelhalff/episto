# A4 Letter Template Specification

**Project**: episto  
**Status**: Draft — open decisions listed in §12  
**Last updated**: 2026-07-28  
**Scope**: Physical layout, typography, zone map, rendering rules, and validation for the single A4 letter template used in MVP.

This file mixes settled geometry with still-open typography and rendering choices. Implement only
the settled constraints as hard requirements. Any item still marked open must remain configurable or
blocked until explicitly locked elsewhere.

> **Implementation lock — 2026-04-08:** The canonical episto geometry for both `LetterPreview`
> and the backend-rendered letter PDF is now: sender block top-left, recipient block on the right,
> and place/date directly underneath on the right. This lock overrides older sender-right /
> recipient-left notes elsewhere in this draft until a production postal-template sign-off explicitly
> replaces it. Do not change one surface without changing the other and updating this file in the
> same commit.

> **Reversal of locked geometry — 2026-07-28.** This document previously locked a **left-hand**
> recipient window block and a 20/20/25/20 `@page` margin, and described fold marks, continuation-page
> headers and an address-bounds check as requirements. The shipped code implements a **right-hand**
> address block, `@page { margin: 0 }` with absolute positioning, and none of those three features.
> Rather than leave the divergence silent, the affected sections below have been rewritten to the
> implemented geometry, with the superseded locked values quoted in place. The single source of truth
> for coordinates is now [`shared/src/letter-layout.ts`](../../shared/src/letter-layout.ts), consumed
> by both `backend/src/modules/rendering/render-template.ts` and
> `frontend/src/components/product/LetterPreview.tsx`. Superseded sections are marked
> **Superseded 2026-07-28**. This closes Finding 4 of
> [`implementation-status.md`](implementation-status.md); the unresolved parts are restated in §4.1.

---

## 1. Swiss Postal Standards Reference

episto uses the Swiss standard C5/6 (DL) window envelope, the dominant format in Swiss business correspondence. The governing standard is **SN 010130** (Swiss standard for window envelopes and address placement).

### Standard Envelope: C5/6 (DL)

| Property           | Value                                        |
| ------------------ | -------------------------------------------- |
| Envelope format    | C5/6 (DL), 220mm × 110mm                     |
| Folding            | Letter folded in thirds (trifold)            |
| Window type        | Right window — see the 2026-07-28 note below |
| Window position    | Unverified — see below                       |
| Window size        | Unverified — see below                       |
| Governing standard | SN 010130 (cited, not held in this repo)     |

> **⚠️ Unverified figures — 2026-07-28**: the window figures previously tabulated here (~45mm from
> the left edge, ~50mm from the top of the folded letter, ~90mm × 45mm) were never sourced from a copy
> of SN 010130 held in this repository, and no other document in `docs/` records confirmed
> envelope-window coordinates. They are **unverified** and have been removed rather than restated as
> if measured. Position and size **must be verified against the specific envelope supplier** before
> production — a ±2mm difference misaligns the address — and the confirmed measurements recorded in an
> envelope-supplier configuration record. OD-T7 (§12); still a production blocker.

> **Window side — 2026-07-28**: the implemented address block sits on the **right** of the sheet
> (§3, Zone 3) — the Swiss right-window convention, a legitimate alternative to the left-window layout
> this document originally assumed. The left-window figures are retained only as superseded reference.
> Which supplier envelope is actually purchased is unresolved and belongs to OD-T7.

### How the fold determines window alignment

A DL envelope receives a trifold letter. The letter is folded:

- **First fold**: at 99mm from top (bottom third folds up)
- **Second fold**: at 198mm from top (top third folds down over bottom)

When folded and inserted, the **middle third of the A4 sheet** (from 99mm to 198mm from the top) faces
outward through the window.

> **Superseded 2026-07-28.** The paragraph here previously required the recipient block to begin at
> "approximately **57mm from the top of the page** (= 50mm window offset from folded-letter top + 7mm
> of envelope-to-letter clearance)" and to "sit left-aligned at **25mm from the left margin**". The
> implementation places it at 52mm from the top and 121mm from the left
> ([`shared/src/letter-layout.ts:17-22`](../../shared/src/letter-layout.ts)) — above the 99mm first
> fold, so it is the top third of the sheet, not the middle third, that carries the address. The fold
> arithmetic in this section describes the superseded left-window layout and has not been re-derived
> for the right-window one; doing so requires a physical envelope (§4.1).

---

## 2. A4 Page Layout — Exact Dimensions

### Page Size

| Property    | Value         |
| ----------- | ------------- |
| Standard    | ISO 216 A4    |
| Width       | 210mm         |
| Height      | 297mm         |
| Orientation | Portrait only |

### Margins

> **Superseded 2026-07-28.** This section previously locked a single page margin of
> 20mm top / 20mm bottom / 25mm left / 20mm right, giving a 165mm × 257mm printable area. No such
> `@page` margin exists in the renderer. Two independent mechanisms are in play instead, and the
> honest description is that they compose:

**1 — The letter HTML has no page margin.** All white space is produced by the coordinates
themselves: absolutely positioned blocks inside a `.letter-layout-shell`, plus padding on the body
flow region (114mm top, 20mm right, 20mm bottom, 25mm left), which is what gives the body its 165mm
measure and the 25mm left edge the original lock intended.

**2 — Puppeteer applies its own margin box on top.** The letter render path calls
`renderPdfBufferFromHtml(html)` with no `margins` option (`render-snapshot-pipeline.ts:87`), so the
defaults apply. Only the confirmation cover page overrides them (`pdf-access.ts:330-333`).

| Property              | Implemented value                             | Source                       |
| --------------------- | --------------------------------------------- | ---------------------------- |
| `@page` (letter HTML) | `size: A4; margin: 0`                         | `render-template.ts:191-194` |
| Layout shell          | 210mm × 297mm, `position: relative`           | `render-template.ts:211-216` |
| Fixed blocks          | `position: absolute`, mm from `letter-layout` | `render-template.ts:217-223` |
| Body flow padding     | 114 / 20 / 20 / 25mm (top/right/bottom/left)  | `letter-layout.ts:28-33`     |
| Puppeteer margin box  | 25mm top, 25mm right, 30mm bottom, 25mm left  | `render-pdf.ts:35-40`        |
| Puppeteer page format | A4, `printBackground: true`                   | `render-pdf.ts:52-56`        |

**The interaction is not resolved from source.** A 210mm-wide shell is being laid out inside a
Puppeteer content box of 160mm × 242mm. Whether Chromium offsets the shell's origin by the margin
box, clips it, or reflows it onto further pages determines whether a coordinate of "52mm from the
top" in `letter-layout.ts` is 52mm or 77mm from the physical paper edge. There is no test in
`backend/src/modules/rendering/` that settles this, and this document does not assert an answer. It
is the first item in §4.1.

---

## 3. Zone Map

Coordinates are from the **top-left corner of the A4 page** (origin = 0, 0).  
All values in mm.

Coordinates below are the implemented ones, read from
[`shared/src/letter-layout.ts:6-33`](../../shared/src/letter-layout.ts), and are stated as
`left,top` of the absolutely positioned block within the 210 × 297mm shell.

```
0mm  ┌─────────────────────────────────────────┐ 210mm
20mm │  [SENDER BLOCK] 25,20  80mm wide        │
40mm │                  [DISPATCH LINE] 121,40 │
52mm │                  ╔══════════════════╗   │
     │                  ║ RECIPIENT BLOCK  ║   │
     │                  ║ 121,52  59×≥31mm ║   │
83mm │                  ╚══════════════════╝   │
87mm │                  [RIGHT META] 121,87    │
99mm ├ · · first fold — NOT RENDERED · · · · · ┤
114mm│  [BODY FLOW] padding 114/20/20/25mm     │
     │  subject, salutation, body, closing,    │
     │  signature, enclosure — normal flow     │
198mm├ · · second fold — NOT RENDERED · · · · ·┤
297mm└─────────────────────────────────────────┘
      + Puppeteer margin box 25/25/30/25mm (§2)
```

### Zone Definitions

#### Zone 1 — Sender Block

| Property  | Value                                                     |
| --------- | --------------------------------------------------------- |
| Left, top | 25mm, 20mm (`letter-layout.ts:7-11`)                      |
| Width     | 80mm                                                      |
| Alignment | Left                                                      |
| Content   | Name, street + number, PLZ + city                         |
| Lines     | 3 lines maximum                                           |
| Font size | 8.75pt (`LETTER_LAYOUT_PT.sender`, `letter-layout.ts:59`) |

Current product lock: the sender stays in the top-left. Do not move it to the right unless preview, backend rendering, and this specification are all updated together.

#### Zone 2 — Dispatch Line (formerly "Return Address Line")

| Property  | Value                                                       |
| --------- | ----------------------------------------------------------- |
| Left, top | 121mm, 40mm (`letter-layout.ts:12-16`)                      |
| Width     | 59mm                                                        |
| Content   | Single line: dispatch/return line above the recipient block |
| Font size | 8.25pt (`LETTER_LAYOUT_PT.dispatch`, `letter-layout.ts:60`) |

> **Superseded 2026-07-28.** Previously specified at 25mm, 48mm, 85mm × 6mm, 6–7pt, i.e. on the
> left. It moved to the right with the address block.

#### Zone 3 — Recipient Block _(postal window alignment — right-hand block)_

> **Reversal of a locked decision — 2026-07-28.** This zone was marked **CRITICAL** and locked to a
> **left-hand** block: "Top-left **25mm, 55mm**", "Size **85mm × 45mm**", "Alignment: Left-aligned,
> no indentation", derived in §1 from a left-window DL envelope. That is not what is built, and has
> not been for some time. The implemented block is **right-hand**. A right-window envelope is a
> legitimate and common Swiss convention, so this is recorded as a deliberate design change that was
> never written back, not as a defect — but it is a reversal of a locked value and is dated as one.
> The previous numbers above are retained only as the superseded record.

Implemented values (`shared/src/letter-layout.ts:17-22`, applied at `render-template.ts:245-249`
and mirrored in the preview at `LetterPreview.tsx:217-221`):

| Property    | Value                                                                        |
| ----------- | ---------------------------------------------------------------------------- |
| Left, top   | **121mm, 52mm**                                                              |
| Width       | **59mm**                                                                     |
| Min height  | **31mm** (`minHeight`, not a maximum — the block grows with line count)      |
| Alignment   | Left-aligned text within a right-hand block, no indentation                  |
| Content     | 4–6 lines: name, optional c/o, street + number, PLZ + city, optional country |
| Font size   | 10.5pt (`LETTER_LAYOUT_PT.recipient`, `letter-layout.ts:61`)                 |
| Decorations | NONE — no borders, no background, no icons                                   |

At the minimum height the block occupies 52–83mm from the top of the shell. Because `minHeight` is a
floor rather than a ceiling, a six-line address extends further down; nothing in the code caps it
(§9).

Line count guide:

```
Line 1: Company name or recipient full name  (required)
Line 2: c/o or department                   (optional)
Line 3: Street and number                   (required)
Line 4: PLZ + city                          (required)
Line 5: Country                             (optional — omit for Swiss addresses)
Line 6: (reserved / rarely used)
```

> **Constraint, unenforced**: the bottom of the recipient block should not exceed 100mm from the top
> of the page, since below 99mm (the first fold line) the address would be hidden or cut by the fold.
> This was previously written as a hard "validate before generating the final PDF" requirement. **No
> such validation exists** anywhere in the render path — see §4.1. It is restated here as a design
> intent, not as an implemented guarantee.

#### Zone 4 — Place / Date Block (`rightMeta`)

| Property  | Value                                                 |
| --------- | ----------------------------------------------------- |
| Left, top | 121mm, 87mm (`letter-layout.ts:23-27`)                |
| Width     | 59mm                                                  |
| Alignment | Left-aligned within the right-hand column             |
| Content   | Place and date (e.g., "Zürich, 15. März 2026")        |
| Font size | 10pt (`LETTER_LAYOUT_PT.date`, `letter-layout.ts:62`) |

> **Superseded 2026-07-28.** Previously specified at 130mm, 105mm, 55mm × 20mm, right-aligned.

> **Zones 5–10 are not absolutely positioned — corrected 2026-07-28.** Subject, salutation, body,
> closing, signature and enclosure all sit in **normal document flow** inside the body region, which
> is a single padded block: 114mm top, 20mm right, 20mm bottom, 25mm left
> (`letter-layout.ts:28-33`, `render-template.ts:263`). The absolute `25mm, 120mm` style coordinates
> in the tables below are therefore approximate outcomes of the flow, not settings. The real controls
> are the inter-block gaps in `letter-layout.ts:34-55` (subject 6mm, salutation 5mm, body paragraphs
> 8mm, closing 8mm, signature 10mm, signature name 2mm, enclosure 12mm + 3mm padding) and the point
> sizes in `LETTER_LAYOUT_PT` (`letter-layout.ts:58-71`). Where a table below disagrees with those
> constants, the constants win.

#### Zone 5 — Subject Line

First block of the body flow (≈120mm from the top), 165mm wide, left-aligned, bold, 11.25pt
(`letter-layout.ts:64`), 6mm below-gap, single line preferred and maximum 200 characters.

#### Zone 6 — Salutation

"Sehr geehrte Damen und Herren," / "Madame, Monsieur," etc., directly below the subject (6mm gap,
`letter-layout.ts:34-36`) and followed by a 5mm gap before the body (`letter-layout.ts:37-39`), set
at the body size.

#### Zone 7 — Body Text

| Property      | Value                                                     |
| ------------- | --------------------------------------------------------- |
| Top-left      | 25mm, ~148mm (below salutation + blank line)              |
| Width         | 165mm                                                     |
| Max bottom    | ~252mm (leaving ~25mm for closing)                        |
| Font size     | 10–11pt, regular                                          |
| Line height   | 14–16pt                                                   |
| Paragraph gap | One blank line (~11pt)                                    |
| Alignment     | Left (ragged right) — do NOT justify Swiss formal letters |

#### Zone 8 — Closing

"Freundliche Grüsse" / "Avec nos meilleures salutations" etc., at the body size, with an 8mm gap
above (`letter-layout.ts:43-45`).

#### Zone 9 — Signature Zone

Signature image (optional, max 60mm × 20mm, PNG/SVG, transparent background) or script rendering,
plus the typed name below it. Gaps: 10mm above the signature and 2mm above the name
(`letter-layout.ts:46-51`); sizes 26pt script and 9.5pt name (`letter-layout.ts:69-70`).

#### Zone 10 — Enclosure Note _(optional)_

"Beilage(n): [filename list]" or "Anhang: …", below the signature zone, separated by a 12mm top
margin and 3mm of padding above a hairline rule (`letter-layout.ts:52-55`,
`render-template.ts:355-358`), set at the sender size in `LETTER_COLORS.enclosure` `#666666`.

---

## 4. Fold Marks

| Fold   | Distance from top | Purpose                                |
| ------ | ----------------- | -------------------------------------- |
| First  | **99mm**          | Bottom edge of top third; fold up      |
| Second | **198mm**         | Bottom edge of middle third; fold down |

**Not implemented (2026-07-28).** No fold mark is rendered. There is no fold-mark element, class or
coordinate anywhere in `backend/src/modules/rendering/` or in
`frontend/src/components/product/LetterPreview.tsx`. The intended design, if built, remains:

- Small horizontal tick marks at the **left margin** (2mm wide, 0.2mm stroke)
- Colour: light grey (#CCCCCC) or dashed line — subtle, not intrusive
- These are printed on the final letter

### 4.1 Open items — stated as unbuilt, not as behaviour

These were previously written in the imperative, which read as if they existed. Items 3 and 4 now do (2026-07-28); items 1, 2, 5 and 6 do not.

| #   | Item                                                                                                                                | State                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Physical envelope verification.** The implemented geometry has never been checked against a physical Swiss right-window envelope. | **Outstanding.** Cannot be established from source. Blocks OD-T7. Until one printed letter is held against a real envelope, nothing in this document may be read as a guarantee that the address sits in the window.                                                                                                                                                                                                                                                                                                                                    |
| 2   | **Effective page offset.** The composition of `@page { margin: 0 }` with Puppeteer's margin box (§2) is not measured.               | **Measured 2026-07-28, still untested.** The CSS `@page` margin wins: page 1 renders at true paper coordinates (fold marks land at 99.0mm / 197.7mm measured off an 80dpi raster of a real render), so Puppeteer's margin box does not offset the shell. No automated test asserts it.                                                                                                                                                                                                                                                                  |
| 3   | Fold marks at 99mm and 198mm                                                                                                        | **Implemented 2026-07-28.** `.fold-mark` / `.fold-mark-1` / `.fold-mark-2` in `render-template.ts`, geometry in `letter-continuation.ts` (`LETTER_FOLD_MARKS_MM`), page 1 only. Covered by `backend/tests/regression-letter-page-furniture.test.ts`.                                                                                                                                                                                                                                                                                                    |
| 4   | Continuation-page headers ("Page X of Y") and page numbering                                                                        | **Implemented 2026-07-28.** Pages 2+ carry `recipient · date` left and a localised page counter right (de/fr/it/en-CH), at 8pt, in a 20mm band reserved by `@page` with `@page :first { margin: 0 }` keeping page 1 unmoved. Delivered as a Chromium `headerTemplate` (the only mechanism that knows the page number); page 1 is taken from a second, header-free render and spliced in by `composeLetterWithContinuationHeader`. Single-page letters are rendered once and carry nothing.                                                              |
| 5   | Automated address-bounds check (recipient block must stay above the first fold)                                                     | **Not implemented.** No such check in `render-snapshot-pipeline.ts` or elsewhere in the render path.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 6   | Follow-ups opened by items 3 and 4                                                                                                  | **Partly closed 2026-07-28.** The confirmation bundle no longer diverges: `pdf-access.ts` renders through the same `renderLetterPdf()` the dispatch pipeline uses, so the archived copy is paginated and headed exactly like the letter Swiss Post delivered. Still outstanding: this table is authoritative, but §4, §5, §6, §7 and OD-T5 continue to call fold marks and the page-2+ header unbuilt and need a correcting pass; and that path still re-renders with a fresh date rather than the letter's own — a pre-existing divergence, unchanged. |

No envelope-window coordinates are asserted anywhere in this document, because none are recorded in
this repository. SN 010130 is cited by name only; the standard itself is not held here, and the
figures once tabulated in §1 were not verified against it.

---

## 5. Typography Specification

### Font Stack

| Role               | Font           | Fallback              |
| ------------------ | -------------- | --------------------- |
| Letter body        | Source Serif 4 | Georgia, serif        |
| UI / preview shell | Inter          | system-ui, sans-serif |

**Rationale for Source Serif 4**: Free (Google Fonts / SIL OFL), excellent Latin Extended character support (handles all Swiss-language diacritics), clean and neutral for formal documents, well-hinted for screen and print.

Alternative choices were reviewed but rejected for MVP:

- **Georgia** — acceptable fallback only; too dependent on system rendering differences
- **Lora** — too decorative relative to the required Swiss formal tone

**Locked choice:** Source Serif 4 for letter content in both preview and final render.

**Implemented 2026-07-28**, on both surfaces, and embedded rather than merely named: the PDF sets
`font-family: "Source Serif 4", Georgia, "Times New Roman", serif` on `body`
(`render-template.ts:206`) and injects `EMBEDDED_FONTS_CSS` — the base64 `@font-face` payload from
`backend/src/modules/rendering/fonts.css.ts` — at `render-template.ts:189`, with the renderer
awaiting `document.fonts.ready` before printing (`render-pdf.ts:44-49`); the preview uses
`var(--font-serif)` (`LetterPreview.tsx:163`), bound to `Source_Serif_4` in
`frontend/src/app/layout.tsx:20-24`. This closes the earlier gap in which the letter named
`"Helvetica Neue", Helvetica, Arial, sans-serif` and embedded nothing, so headless Chromium — which
has no brand fonts installed — substituted Arial. The signature script face (`"Allura Signature"`,
`render-template.ts:56`, `:289`) is a separate, deliberate exception.

### Type Scale

Implemented sizes live in `LETTER_LAYOUT_PT` (`shared/src/letter-layout.ts:58-71`) and are the
authority: sender 8.75pt, dispatch line 8.25pt, recipient 10.5pt, date 10pt, body 10.5pt, subject
11.25pt, headings 15 / 12.5 / 10.5pt, tables 9.5pt, signature script 26pt, signature name 9.5pt. The
enclosure note reuses the sender size (`render-template.ts:355`). Weights and emphasis follow the
template CSS; the earlier ranges (8–9pt, 10–11pt and so on) are superseded by these fixed values, and
the "Page header (p2+) 8pt" row is removed because no page header is rendered (§4.1 item 4).

---

## 6. Multi-Page Handling

### Policy

Multi-page letters are supported. The letter body may overflow to additional pages.

| Rule                                   | Behaviour                                                                |
| -------------------------------------- | ------------------------------------------------------------------------ |
| Page 2+ header                         | **Not implemented** (§4.1 item 4) — intended: "Page X of Y" top-right    |
| Signature placement                    | Always on the last page                                                  |
| Orphan/widow control                   | `orphans: 2; widows: 2` — minimum 2 lines on either side of a page break |
| Closing block splitting                | Closing + signature + name kept together (`page-break-inside: avoid`)    |
| Tables and lists                       | Prefer keeping together; break between rows if necessary                 |
| Maximum letter pages                   | 5 (soft limit; configurable at render time)                              |
| Maximum total pages (with attachments) | 20 (provisional; configurable)                                           |

### Pricing implication

The rendering pipeline must report final letter and attachment page counts to the pricing engine
before charge confirmation. Whether additional letter pages or attachment pages create surcharges at
launch is governed by [`pricing-structure.md`](pricing-structure.md), not by the renderer itself.

### Overflow prevention

- The pre-render estimation step must calculate an approximate page count and surface it to the user before payment.
- At render time, if actual page count exceeds the reviewed and accepted count or the configured
  allowed maximum, the render job must fail gracefully with a `rendering_overflow` error (not
  silently truncate).

---

## 7. HTML/CSS Implementation Notes

### Page setup

As implemented (`render-template.ts:191-216`, abridged):

```css
@page {
  size: A4;
  margin: 0; /* the Puppeteer margin box does the trimming — see §2 */
}

body {
  font-family: "Source Serif 4", Georgia, "Times New Roman", serif;
  color: #1a1a1a; /* LETTER_COLORS.text, letter-layout.ts:74 */
}

.letter-layout-shell {
  position: relative;
  width: 210mm;
  min-height: 297mm;
}
```

> **Superseded 2026-07-28.** The block previously printed here specified
> `@page { size: 210mm 297mm; margin: 20mm 20mm 20mm 25mm }` and `body { width: 165mm; ... }`.
> Neither the page margin nor the fixed body width is in the code.

### Zone positioning

Use **absolute positioning** for fixed zones (sender, recipient, fold marks) where pixel-perfect placement is required. Use **normal document flow** for body text to support overflow and page breaks naturally.

```css
/* Recipient block — right-hand, from LETTER_LAYOUT_MM.recipient (2026-07-28) */
.recipient-block {
  position: absolute;
  top: 52mm;
  left: 121mm;
  width: 59mm;
  min-height: 31mm; /* floor, not a cap */
  font-size: 10.5pt;
}

/* Body text — normal flow for multi-page overflow.
   Implemented as padding on the body region: 114 / 20 / 20 / 25mm. */
.body-text {
  padding-top: 114mm; /* clears the address column on page 1 */
  orphans: 2;
  widows: 2;
}

/* Keep closing + signature together */
.closing-block {
  page-break-inside: avoid;
}
```

### Fold mark rendering — not implemented (§4.1 item 3)

The following is the design sketch only; no equivalent rule exists in the codebase.

```css
.fold-mark {
  position: absolute;
  left: 20mm;
  width: 3mm;
  height: 0;
  border-top: 0.3pt solid #cccccc;
}
.fold-mark-1 {
  top: 99mm;
}
.fold-mark-2 {
  top: 198mm;
}
```

### Print fidelity

- Use `mm` units throughout — not `px`, not `em`, not `rem`
- Avoid CSS transforms that may shift zones
- Test rendering at exact A4 dimensions; do not rely on browser zoom
- The screen preview and the PDF render must not diverge. As implemented (2026-07-28) they are two
  separate surfaces — React inline styles in `LetterPreview.tsx`, a CSS string in
  `render-template.ts` — kept in agreement by both importing the same constants from
  `shared/src/letter-layout.ts` (the preview converting mm to container-query units via
  `mmToPageCqw`, `letter-layout.ts:85-91`). There is no shared CSS file, and no test enforces the
  agreement; it is held by convention and review.

---

## 8. HTML-to-PDF Library

### Options evaluated

| Option                            | Pros                                                                 | Cons                                                          |
| --------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------- |
| **A — Puppeteer** _(recommended)_ | Best CSS support, reliable mm rendering, battle-tested, good Unicode | Heavy (~300MB + Chrome), high memory (512MB–1GB per instance) |
| **B — WeasyPrint**                | Lightweight, Python, good CSS Paged Media support                    | Incomplete CSS (no flexbox/grid), Python in Node.js stack     |
| **C — Paged.js + Puppeteer**      | CSS Paged Media polyfill, fine-grained page control                  | More complexity, still needs Puppeteer underneath             |

### Locked choice: Option A (Puppeteer) — implemented

Despite the memory footprint, Puppeteer (headless Chrome) gives the most reliable CSS rendering for
document layouts: it interprets `@page`, `mm` units, absolute positioning and `page-break-inside`
correctly. Deployment: isolated container with Chrome and a dedicated memory limit; render jobs are
queued and processed there (`backend/src/modules/rendering/render-pdf.ts`).

---

## 9. Validation Rules

### Pre-render validation

| Field                 | Rule                                                                |
| --------------------- | ------------------------------------------------------------------- |
| Recipient name        | Non-empty, max 80 characters                                        |
| Recipient street      | Non-empty, max 80 characters                                        |
| Recipient PLZ         | If Swiss address: exactly 4 digits (`/^\d{4}$/`)                    |
| Recipient city        | Non-empty, max 80 characters                                        |
| Recipient total lines | 2–6 non-empty lines                                                 |
| Sender name           | Non-empty                                                           |
| Sender city           | Non-empty                                                           |
| Subject               | Non-empty, max 200 characters                                       |
| Body text             | Non-empty, max ~10,000 characters (soft limit before page overflow) |
| Estimated page count  | Calculated pre-render; shown to user; must be ≤ configured max      |

### Post-render validation

| Check                 | Rule                                                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| PDF page count        | Must match pre-render estimate ±1 page                                                                            |
| File size             | Must be within configured limit (provisional: 10MB)                                                               |
| Recipient zone bounds | Rendered recipient block must not exceed 100mm from top (above first fold) — **not implemented**, §4.1 item 5     |
| Character encoding    | PDF must embed fonts; no glyph substitution fallbacks — **implemented for the letter body** as of 2026-07-28 (§5) |

---

## 10. Supported Character Set

The template and chosen font must fully support:

| Category        | Characters                                                    |
| --------------- | ------------------------------------------------------------- |
| German (Swiss)  | ä ö ü Ä Ö Ü — note: ß is rare in Swiss German but must render |
| French (Swiss)  | é è ê ë à â î ï ô ù û ç œ æ                                   |
| Italian (Swiss) | à è ì ò ù                                                     |
| Punctuation     | Swiss quotation marks: «» and „" — both forms                 |
| Currency        | CHF (text only — not the ₣ symbol)                            |
| Digits          | 0–9, including superscripts for footnotes if needed           |
| Common symbols  | – (en-dash), — (em-dash), © ® ™ (rare but must not break)     |

The HTML-to-PDF renderer must embed the chosen font fully — no system font substitution.

---

## 11. Attachments and Multi-Document Assembly

Attachments are supporting assets associated with the reviewed letter flow. Their exact
provider-bound packaging is not yet locked.

| Rule                       | Behaviour                                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Internal association       | Attachments remain separate from the editable letter body                                                               |
| Review surface             | Attachment names and counts appear in review/receipt UI                                                                 |
| Provider packaging         | **Open** — do not assume appended merged PDF, separate multi-part upload, or other shape until provider docs confirm it |
| Maximum total pages        | 20 (provisional, including any provider-supported supporting pages; configurable)                                       |
| Oversized attachment pages | Rejected at upload time if would exceed total configured limit                                                          |

---

## 12. Open Decisions

| ID     | Decision                                          | Status                              | Recommendation                                                          |
| ------ | ------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------- |
| OD-T1  | Final body font family                            | Locked — **implemented 2026-07-28** | Source Serif 4, embedded (§5)                                           |
| OD-T2  | HTML-to-PDF library                               | Locked — implemented                | Puppeteer (Option A)                                                    |
| OD-T3  | Maximum letter pages                              | Provisional                         | 5 letter pages                                                          |
| OD-T4  | Maximum total pages (with attachments)            | Provisional                         | 20 pages                                                                |
| OD-T5  | Fold mark rendering in final PDF                  | Locked — **not implemented**        | Yes, subtle grey marks (§4.1 item 3)                                    |
| OD-T6  | Sender block position (left vs right)             | Locked — implemented                | Left, Swiss convention (`letter-layout.ts:7-11`)                        |
| OD-T6b | Recipient block position (left vs right)          | **Reversed 2026-07-28**             | Right-hand block, 121mm/52mm — was locked left at 25mm/55mm (§3 Zone 3) |
| OD-T7  | Envelope supplier and confirmed window dimensions | **Blocking for production**         | Must verify SN 010130 dimensions against actual envelope before go-live |
| OD-T8  | Separator page for attachments                    | Locked                              | No separator page in MVP                                                |
| OD-T9  | Attachment submission packaging                   | **Blocking for provider adapter**   | Must be confirmed from Swiss Post onboarding docs                       |

> **OD-T7 is a hard production blocker**. No letter may be sent to physical mail until the envelope
> supplier has confirmed exact window dimensions and a sample physical test has been performed. As of
> 2026-07-28 neither has happened, and the confirmed dimensions are not recorded anywhere in this
> repository (§1, §4.1 item 1).
>
> **OD-T9 is a hard provider-integration blocker.** Do not implement merged attachment assembly or
> claim attachment availability for the launch provider path until provider docs confirm the
> accepted submission model.

---

## 13. Relation to Other Documents

| Document                                     | Relation                                                           |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `docs/04-product/document-template.md`       | Rendering rules, validation, anti-drift policy                     |
| `docs/05-architecture/stack-decisions.md`    | Confirms HTML/CSS to PDF as locked rendering approach              |
| `docs/05-architecture/system-contracts.md`   | Rendering state machine                                            |
| `docs/08-guardrails/provider-certainties.md` | Postal provider unknowns; envelope dimensions are an open question |
