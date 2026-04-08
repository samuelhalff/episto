# A4 Letter Template Specification

**Project**: Swiss Mail  
**Status**: Draft — open decisions listed in §10  
**Last updated**: 2026-03-15  
**Scope**: Physical layout, typography, zone map, rendering rules, and validation for the single A4 letter template used in MVP.

This file mixes settled geometry with still-open typography and rendering choices. Implement only
the settled constraints as hard requirements. Any item still marked open must remain configurable or
blocked until explicitly locked elsewhere.

> **Implementation lock — 2026-04-08:** The canonical Swiss Mail geometry for both `LetterPreview`
> and the backend-rendered letter PDF is now: sender block top-left, recipient block on the right,
> and place/date directly underneath on the right. This lock overrides older sender-right /
> recipient-left notes elsewhere in this draft until a production postal-template sign-off explicitly
> replaces it. Do not change one surface without changing the other and updating this file in the
> same commit.

---

## 1. Swiss Postal Standards Reference

Swiss Mail uses the Swiss standard C5/6 (DL) window envelope, the dominant format in Swiss business correspondence. The governing standard is **SN 010130** (Swiss standard for window envelopes and address placement).

### Standard Envelope: C5/6 (DL)

| Property           | Value                                                 |
| ------------------ | ----------------------------------------------------- |
| Envelope format    | C5/6 (DL), 220mm × 110mm                              |
| Folding            | Letter folded in thirds (trifold)                     |
| Window type        | Left window (standard Swiss business)                 |
| Window position    | ~45mm from left edge, ~50mm from top of folded letter |
| Window size        | ~90mm × 45mm                                          |
| Governing standard | SN 010130                                             |

> **⚠️ Verification required**: These measurements are based on publicly available Swiss postal standard SN 010130 and common Swiss business envelope specifications. Exact window position and size **must be verified against the specific envelope supplier** before production. A ±2mm tolerance difference in window position can cause address misalignment. The rendering system must include an envelope-supplier configuration record with confirmed measurements.

### How the fold determines window alignment

A DL envelope receives a trifold letter. The letter is folded:

- **First fold**: at 99mm from top (bottom third folds up)
- **Second fold**: at 198mm from top (top third folds down over bottom)

When folded and inserted, the **middle third of the A4 sheet** (from 99mm to 198mm from the top) faces outward through the window. The recipient address block must sit within this zone, positioned to align with the envelope window at approximately 45mm from the left edge and 50mm from the top of the folded portion.

On the unfolded A4, the recipient address block must begin at approximately **57mm from the top of the page** (= 50mm window offset from folded-letter top + 7mm of envelope-to-letter clearance) and sit left-aligned at **25mm from the left margin**.

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

| Margin               | Value     | Rationale                                             |
| -------------------- | --------- | ----------------------------------------------------- |
| Top                  | 20mm      | Allows header/sender block; clear of print zone edge  |
| Bottom               | 20mm      | Standard safe print zone                              |
| Left                 | 25mm      | Wider for binding clearance; aligns with address zone |
| Right                | 20mm      | Standard                                              |
| **Printable width**  | **165mm** | 210mm − 25mm − 20mm                                   |
| **Printable height** | **257mm** | 297mm − 20mm − 20mm                                   |

---

## 3. Zone Map

Coordinates are from the **top-left corner of the A4 page** (origin = 0, 0).  
All values in mm.

```
0mm ┌─────────────────────────────────────────┐ 210mm
    │                                         │
20mm├─── TOP MARGIN ──────────────────────────┤
    │                                         │
    │  [SENDER ZONE]          [DATE/REF ZONE] │
    │  25,20                  130,20          │
    │  80mm×25mm              60mm×20mm       │
    │                                         │
45mm├─────────────────────────────────────────┤
    │  [RETURN ADDRESS LINE]                  │
    │  25,48  — 6-7pt one-line sender         │
    │                                         │
50mm├─────────────────────────────────────────┤
    │  ╔═══════════════════╗                  │
    │  ║  RECIPIENT ZONE   ║  ← WINDOW AREA  │
    │  ║  25,55            ║                  │
    │  ║  85mm × 45mm      ║                  │
    │  ║  (4–6 lines)      ║                  │
    │  ╚═══════════════════╝                  │
    │                                         │
99mm├ · · fold mark · · · · · · · · · · · · · ┤
    │                                         │
    │  [REFERENCE/DATE block — right side]    │
    │  Position: 130,105  60mm×15mm           │
    │                                         │
    │  [SUBJECT LINE]                         │
    │  25,120  bold                           │
    │                                         │
    │  [SALUTATION]                           │
    │  25,132                                 │
    │                                         │
    │  [BODY ZONE]                            │
    │  25,145                                 │
    │  165mm wide, variable height            │
    │  extends to ~250mm                      │
    │                                         │
    │  [CLOSING + SIGNATURE ZONE]             │
    │  25,~252                                │
    │  ~35mm height                           │
    │                                         │
    │  [ENCLOSURE NOTE — optional]            │
    │  25,~268                                │
    │                                         │
198mm├ · · fold mark · · · · · · · · · · · · ·┤
    │                                         │
277mm└─────────────────────────────────────────┘
      bottom margin (20mm above 297mm edge)
```

### Zone Definitions

#### Zone 1 — Sender Block

| Property    | Value                                             |
| ----------- | ------------------------------------------------- |
| Top-left    | 25mm, 20mm                                        |
| Size        | 80mm × 25mm                                       |
| Alignment   | Left (or optionally right-aligned at 130mm, 20mm) |
| Content     | Name, street + number, PLZ + city                 |
| Lines       | 3 lines maximum                                   |
| Font size   | 8–9pt, regular weight                             |
| Line height | 13–14pt                                           |

Current product lock: the sender stays in the top-left. Do not move it to the right unless preview, backend rendering, and this specification are all updated together.

#### Zone 2 — Return Address Line

| Property  | Value                                                                    |
| --------- | ------------------------------------------------------------------------ |
| Top-left  | 25mm, 48mm                                                               |
| Size      | 85mm × 6mm                                                               |
| Content   | Single line: "Firstname Lastname, Street Nr, PLZ City"                   |
| Font size | 6–7pt, regular                                                           |
| Purpose   | Visible in envelope window above recipient block (standard Swiss format) |

This line appears directly above the recipient block inside the window zone. It is a Swiss business letter convention to include the sender's abbreviated address here.

#### Zone 3 — Recipient Block _(CRITICAL — postal window alignment)_

| Property    | Value                                                                        |
| ----------- | ---------------------------------------------------------------------------- |
| Top-left    | **25mm, 55mm**                                                               |
| Size        | **85mm × 45mm**                                                              |
| Alignment   | Left-aligned, no indentation                                                 |
| Content     | 4–6 lines: name, optional c/o, street + number, PLZ + city, optional country |
| Font size   | **10–11pt minimum** (readability requirement)                                |
| Line height | 14–15pt                                                                      |
| Decorations | NONE — no borders, no background, no icons                                   |

Line count guide:

```
Line 1: Company name or recipient full name  (required)
Line 2: c/o or department                   (optional)
Line 3: Street and number                   (required)
Line 4: PLZ + city                          (required)
Line 5: Country                             (optional — omit for Swiss addresses)
Line 6: (reserved / rarely used)
```

> **Critical constraint**: The bottom of the recipient block must not exceed 100mm from the top of the page. If the address block were to extend below 99mm (the first fold line), the address would be hidden or cut by the fold. Validate that the rendered address block stays within bounds before generating the final PDF.

#### Zone 4 — Reference / Date Block

| Property  | Value                                                                                    |
| --------- | ---------------------------------------------------------------------------------------- |
| Top-left  | 130mm, 105mm                                                                             |
| Size      | 55mm × 20mm                                                                              |
| Alignment | Right-aligned within zone                                                                |
| Content   | Place and date (e.g., "Zürich, 15. März 2026"); optional reference number on second line |
| Font size | 10pt, regular                                                                            |

#### Zone 5 — Subject Line

| Property  | Value                                  |
| --------- | -------------------------------------- |
| Top-left  | 25mm, 120mm                            |
| Width     | 165mm                                  |
| Alignment | Left                                   |
| Content   | Single line preferred; maximum 2 lines |
| Font size | 11–12pt, **bold**                      |
| Max chars | 200 characters                         |

#### Zone 6 — Salutation

| Property  | Value                                                       |
| --------- | ----------------------------------------------------------- |
| Top-left  | 25mm, 132mm (or directly below subject + 6mm gap)           |
| Content   | "Sehr geehrte Damen und Herren," / "Madame, Monsieur," etc. |
| Font size | 10–11pt, regular                                            |
| After     | One blank line (~11pt) before body                          |

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

| Property   | Value                                                           |
| ---------- | --------------------------------------------------------------- |
| Content    | "Freundliche Grüsse" / "Avec nos meilleures salutations" / etc. |
| Gap before | One blank line above                                            |
| Font size  | 10–11pt, regular                                                |

#### Zone 9 — Signature Zone

| Property      | Value                                            |
| ------------- | ------------------------------------------------ |
| Below closing | ~15mm gap                                        |
| Height        | 20–25mm for signature image, or typed name only  |
| Content       | Signature image (optional) + typed name below    |
| Font size     | 10–11pt, regular or semi-bold for name           |
| Image sizing  | Max 60mm × 20mm, PNG/SVG, transparent background |

#### Zone 10 — Enclosure Note _(optional)_

| Property  | Value                                                        |
| --------- | ------------------------------------------------------------ |
| Content   | "Beilage(n): [filename list]" or "Anhang: ..."               |
| Font size | 9pt, italic                                                  |
| Position  | Below signature zone, ~268mm from top on single-page letters |

---

## 4. Fold Marks

| Fold   | Distance from top | Purpose                                |
| ------ | ----------------- | -------------------------------------- |
| First  | **99mm**          | Bottom edge of top third; fold up      |
| Second | **198mm**         | Bottom edge of middle third; fold down |

Render fold marks as:

- Small horizontal tick marks at the **left margin** (2mm wide, 0.2mm stroke)
- Colour: light grey (#CCCCCC) or dashed line — subtle, not intrusive
- These are printed on the final letter

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

### Type Scale

| Element             | Size    | Weight               | Line Height |
| ------------------- | ------- | -------------------- | ----------- |
| Sender block        | 8–9pt   | Regular              | 13–14pt     |
| Return address line | 6–7pt   | Regular              | auto        |
| Recipient address   | 10–11pt | Regular              | 14–15pt     |
| Date / reference    | 10pt    | Regular              | 14pt        |
| Subject line        | 11–12pt | **Bold**             | 16pt        |
| Salutation          | 10–11pt | Regular              | 14–15pt     |
| Body text           | 10–11pt | Regular              | 14–16pt     |
| Closing             | 10–11pt | Regular              | 14–15pt     |
| Signature name      | 10–11pt | Regular or Semi-Bold | 14pt        |
| Enclosure note      | 9pt     | Italic               | 13pt        |
| Page header (p2+)   | 8pt     | Regular              | auto        |

---

## 6. Multi-Page Handling

### Policy

Multi-page letters are supported. The letter body may overflow to additional pages.

| Rule                                   | Behaviour                                                                |
| -------------------------------------- | ------------------------------------------------------------------------ |
| Page 2+ header                         | "Page X of Y" top-right, same margins, no sender/recipient repeat        |
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

```css
@page {
  size: 210mm 297mm;
  margin: 20mm 20mm 20mm 25mm;
}

body {
  width: 165mm;
  font-family: "Source Serif 4", Georgia, serif;
  font-size: 10.5pt;
  line-height: 15pt;
  color: #000000;
}
```

### Zone positioning

Use **absolute positioning** for fixed zones (sender, recipient, fold marks) where pixel-perfect placement is required. Use **normal document flow** for body text to support overflow and page breaks naturally.

```css
/* Example: recipient block — absolute positioned on page */
.recipient-block {
  position: absolute;
  top: 55mm;
  left: 25mm;
  width: 85mm;
  max-height: 45mm;
  font-size: 10.5pt;
  line-height: 14.5pt;
}

/* Body text — normal flow for multi-page overflow */
.body-text {
  margin-top: 148mm; /* positions below salutation on page 1 */
  orphans: 2;
  widows: 2;
}

/* Keep closing + signature together */
.closing-block {
  page-break-inside: avoid;
}
```

### Fold mark rendering

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
- The screen preview and the PDF render must use the **same CSS file** — no separate print stylesheet with divergent layout

---

## 8. HTML-to-PDF Library

### Options evaluated

| Option                            | Pros                                                                 | Cons                                                          |
| --------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------- |
| **A — Puppeteer** _(recommended)_ | Best CSS support, reliable mm rendering, battle-tested, good Unicode | Heavy (~300MB + Chrome), high memory (512MB–1GB per instance) |
| **B — WeasyPrint**                | Lightweight, Python, good CSS Paged Media support                    | Incomplete CSS (no flexbox/grid), Python in Node.js stack     |
| **C — Paged.js + Puppeteer**      | CSS Paged Media polyfill, fine-grained page control                  | More complexity, still needs Puppeteer underneath             |

### Locked choice: Option A (Puppeteer)

Despite the memory footprint, Puppeteer (headless Chrome) provides the most reliable CSS rendering for complex document layouts. It correctly interprets `@page`, `mm` units, absolute positioning, and `page-break-inside` rules — all of which are critical for this template.

Deployment: isolated Docker container with Chrome, dedicated memory limit. Render jobs are queued via BullMQ and processed by this container.

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

| Check                 | Rule                                                                       |
| --------------------- | -------------------------------------------------------------------------- |
| PDF page count        | Must match pre-render estimate ±1 page                                     |
| File size             | Must be within configured limit (provisional: 10MB)                        |
| Recipient zone bounds | Rendered recipient block must not exceed 100mm from top (above first fold) |
| Character encoding    | PDF must embed fonts; no glyph substitution fallbacks                      |

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

| ID    | Decision                                          | Status                            | Recommendation                                                          |
| ----- | ------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------- |
| OD-T1 | Final body font family                            | Locked                            | Source Serif 4                                                          |
| OD-T2 | HTML-to-PDF library                               | Locked                            | Puppeteer (Option A)                                                    |
| OD-T3 | Maximum letter pages                              | Provisional                       | 5 letter pages                                                          |
| OD-T4 | Maximum total pages (with attachments)            | Provisional                       | 20 pages                                                                |
| OD-T5 | Fold mark rendering in final PDF                  | Locked                            | Yes, subtle grey marks                                                  |
| OD-T6 | Sender block position (left vs right)             | Locked                            | Left, Swiss convention                                                  |
| OD-T7 | Envelope supplier and confirmed window dimensions | **Blocking for production**       | Must verify SN 010130 dimensions against actual envelope before go-live |
| OD-T8 | Separator page for attachments                    | Locked                            | No separator page in MVP                                                |
| OD-T9 | Attachment submission packaging                   | **Blocking for provider adapter** | Must be confirmed from Swiss Post onboarding docs                       |

> **OD-T7 is a hard production blocker**. No letter may be sent to physical mail until the envelope supplier has confirmed exact window dimensions and a sample physical test has been performed.
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
