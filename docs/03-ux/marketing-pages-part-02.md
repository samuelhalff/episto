# episto Marketing Pages Specification — Part 2

> Split from [marketing-pages.md](marketing-pages.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- 3. Use-Case Landing Page Template
- 4. How It Works Page
- 5. Pricing Page
- 6. Conversion Optimization
- 7. Responsive Behavior
- 8. SEO & Structured Data
- 9. Component Inventory
- Scope — MVP Marketing Pages

## 3. Use-Case Landing Page Template

One page per use case. URL pattern: `/use-cases/{slug}` (e.g., `/use-cases/lease-cancellation`).

**Purpose:** Rank for long-tail Swiss-German search terms ("Mietvertrag kündigen Brief", etc.) and convert high-intent visitors directly.

---

### 3.1 Page Structure

| Section                   | Notes                                                |
| ------------------------- | ---------------------------------------------------- |
| **Hero**                  | Use-case-specific headline; accent on the pain point |
| **Pain block**            | Why this situation matters — emotional, not dramatic |
| **How it solves it**      | 3-step flow customized for this use case             |
| **Sample letter snippet** | Anonymized, formatted excerpt — builds trust         |
| **Pricing**               | Same card as homepage but with use-case framing      |
| **FAQ**                   | 4-6 questions specific to this use case              |
| **CTA**                   | Pre-selects this use case in the drafting flow       |

---

### 3.2 Hero (Use-Case)

| Element           | Spec                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Background        | Same navy gradient as homepage hero                                                                                                               |
| Headline template | "[Use case verb] letter — done properly."                                                                                                         |
| Example (DE)      | "Mietvertrag kündigen — richtig und rechtzeitig."                                                                                                 |
| Example (EN)      | "Cancel your lease — done properly."                                                                                                              |
| Subheadline       | "episto generates a compliant {useCaseLabel} letter prepared for postal delivery in Switzerland. No templates, no printer, no post office queue." |
| CTA               | "Draft my {useCaseLabel} letter" — links to `/draft/new?useCase={slug}`                                                                           |
| Trust micro-copy  | Same as homepage hero                                                                                                                             |

---

### 3.3 Pain Block

**Layout:** `max-w-2xl mx-auto text-center py-20`  
**Design:** White background, `text-4xl` headline, body text, no images

**Template structure:**

```
Why getting this right matters

[2-3 sentences describing the real pain:
 - Legal consequences of missing a deadline / wrong format
 - Swiss-specific requirements (registered mail, specific notice periods)
 - Common mistakes people make]
```

> **Important:** Do not provide legal advice. Do not state legal deadlines as fact unless explicitly verified by a legal source. Use softened language: "typically", "usually required", "check your specific contract". See `docs/01-vision/product-scope.md`.

---

### 3.4 How episto Solves It

Three cards, same layout as homepage "How It Works" but with use-case-specific step descriptions.

**Example for lease cancellation:**

| Step | Title                           | Description                                                                                                         |
| ---- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1    | Tell us about your lease        | "Enter your landlord's address, your tenancy end date, and any specific terms from your contract."                  |
| 2    | Review your cancellation letter | "See a properly formatted Swiss cancellation letter with all required elements. Edit anything before sending."      |
| 3    | Send by registered mail         | "We submit the finished letter for registered postal dispatch. Show a reference only if that service supports one." |

---

### 3.5 Sample Letter Snippet

**Purpose:** Show the output quality. Build trust by demonstration.

**Specs:**

| Element   | Spec                                                                 |
| --------- | -------------------------------------------------------------------- |
| Container | `bg-paper rounded-xl p-8 shadow-lg max-w-lg mx-auto font-serif`      |
| Content   | Short excerpt (5–8 lines) of a typical letter for this use case      |
| Data      | Fully anonymized: "Max Mustermann", "Musterstrasse 1", "8000 Zürich" |
| Badge     | "Sample only — not a real letter" overlay or footnote                |
| Purpose   | Demonstrate format and quality; do not present as legal template     |

**Sample (lease cancellation, DE):**

```
                                        Max Mustermann
                                        Musterstrasse 1
                                        8000 Zürich

Verwaltung Muster AG
Musterstrasse 100
8000 Zürich

Zürich, 15. März 2026

Kündigung des Mietverhältnisses
Objekt: Musterstrasse 1, 8000 Zürich

Sehr geehrte Damen und Herren,

hiermit kündige ich den oben genannten Mietvertrag ...
```

---

### 3.6 Use-Case Pricing

Same component as homepage `§2.6` but with a framing headline:

```
What does a {useCaseLabel} letter cost?

From {formattedBasePrice}
[Same card content]
```

---

### 3.7 Use-Case FAQ

4–6 questions specific to this use case. Example for lease cancellation:

| Question                                    | Answer guidance                                                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| What notice period do I need?               | Refer to the contract and local regulations. episto helps with the letter; the user determines the correct date. |
| Does it need to be sent by registered mail? | Many Swiss leases require registered mail. episto offers this option.                                            |
| What if I miss the deadline?                | The letter can still be drafted; we cannot advise on legal remedies for missed deadlines.                        |
| Can I cancel mid-lease?                     | Special termination clauses vary. We draft the letter; we don't advise on contract law.                          |

---

### 3.8 Use-Case CTA

```
Ready to draft your {useCaseLabel} letter?

[Draft my cancellation letter →]        ← links to /draft/new?useCase=lease-cancellation

No account needed · Takes 5 minutes · From {formattedBasePrice}
```

---

## 4. How It Works Page

URL: `/how-it-works`

An expanded, screenshot-heavy version of the homepage "How It Works" section. Helps high-consideration users who want to understand exactly what they're getting before starting.

### 4.1 Structure

| Section              | Content                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| **Hero**             | Simplified — title "How episto works", no app mockup needed              |
| **Step 1: Describe** | Screenshot of the guided conversation UI; caption each screen element    |
| **Step 2: Review**   | Screenshot of the letter preview; explain edit capabilities              |
| **Step 3: Send**     | Screenshot of checkout / delivery selection                              |
| **After you pay**    | What happens next — printing, dispatch, postal handoff                   |
| **Timeline**         | Expected delivery times (do not state exact days without confirmed data) |
| **FAQ**              | 6-8 questions focused on process                                         |
| **CTA band**         | Same as homepage final CTA                                               |

### 4.2 "After You Pay" Block

This section is critical for trust. Be honest about the flow.

```
What happens after you pay

1. episto renders your final letter as a print-ready PDF.
2. episto submits the final PDF and required metadata to the configured postal-provider path.
3. The provider handles any downstream production and postal processing.
4. episto reflects the provider response honestly in your status.

You will receive a dispatch confirmation once your letter has been
submitted to the postal system. Delivery confirmation is available
for registered mail.
```

> **Copy rule:** Never say "your letter has been delivered" at dispatch time. "Submitted to postal system" is the accurate state. See `docs/05-architecture/system-contracts.md` (`DispatchState` enum).

### 4.3 Timeline Block

```
Typical timeline (informational — subject to postal schedules)

─── You send ──────────────────────────────────────────────────────►
    │
    ├── Same day: Letter generated and submitted to dispatch
    │
    ├── [Timeline details depend on confirmed postal SLA data]
    │
    └── Delivery confirmation available for registered mail
```

> **Note:** Do not insert specific day counts until confirmed against provider SLA data. See `docs/08-guardrails/provider-certainties.md`.

---

## 5. Pricing Page

URL: `/pricing`

### 5.1 Structure

| Section                 | Content                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Hero**                | "Simple, honest pricing" with one sentence explaining that the page uses the same stored pricing source as the app |
| **Sync banner**         | Fresh/stale status, source label, and last synced timestamp                                                        |
| **Primary totals card** | Standard total, registered add-on, registered total                                                                |
| **Detail area**         | Composition card plus matrix-backed assumptions and page-count examples                                            |
| **Comparison**          | Standard vs registered, framed factually                                                                           |
| **FAQ**                 | Billing, refunds, receipts, CHF-only                                                                               |
| **CTA**                 | Final CTA band                                                                                                     |

### 5.2 Pricing Table

The `/pricing` route must no longer present itself as a static launch-fee card.

It should show:

1. a sync-status banner
2. one primary totals card with standard total, registered add-on, and registered total
3. one composition card with:
   - episto service fee (standard)
   - episto service fee (registered)
   - provider standard reference total
   - provider registered reference total
4. one matrix-backed assumptions/examples area with:
   - fixed provider-side assumptions currently proven by the stored matrix
   - page-count examples for standard and registered dispatch
   - source link / verified-date support copy

Do not show raw provider component rows that the stored matrix cannot actually prove.

### 5.3 Comparison Block

**Layout:** Two-column table. Left: "Standard". Right: "Registered".

|                               | Standard                          | Registered                                        |
| ----------------------------- | --------------------------------- | ------------------------------------------------- |
| Service level wording         | Standard postal delivery          | Registered postal delivery                        |
| Provider reference / tracking | Only if the provider supplies it  | Only if the provider supplies it                  |
| Confirmation wording          | Never implies tracking by default | Stronger wording only after provider confirmation |
| Reference price               | Stored standard total             | Stored registered total                           |

> **Note:** Keep this comparison factual. Do not fabricate competitor pricing, tracking promises, postal guarantees, or time-savings claims.

### 5.4 Pricing FAQ

| Question                        | Answer                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| What currency do you charge in? | CHF only.                                                                                  |
| Is VAT included?                | Yes, all prices include Swiss VAT.                                                         |
| Can I get a receipt?            | Yes — a receipt is emailed after successful payment.                                       |
| What if my payment fails?       | Your draft is preserved. You can retry payment without re-drafting.                        |
| Do you offer refunds?           | Letters already dispatched cannot be reversed. Contact support for issues before dispatch. |
| Is there a subscription?        | No. Pay-per-letter, no commitments.                                                        |

### 5.5 State behavior

- **Fresh:** show the stored prices normally with the sync timestamp.
- **Stale:** keep showing the last successful stored prices, but mark them clearly as stale.
- **Missing:** if no stored pricing snapshot exists at all, show the page-level unavailable notice and do not fabricate prices.

---

## 6. Conversion Optimization

### 6.1 Above-the-Fold Rules

- **Every page** must have at least one CTA button visible without scrolling.
- The CTA must use the warm accent color (`#B85C38`) — not a neutral or ghost style.
- CTA touch target minimum: `h-12` (48px height), `px-8` minimum horizontal padding.

### 6.2 Form Philosophy

- The drafting flow starts with **zero required fields on entry**. Users begin by describing their letter, not filling in a form.
- Never show a "register to continue" wall before at least one meaningful step has been completed.
- Email is required at checkout for receipt, status updates, and support. Explain this clearly when collecting it.

### 6.3 Pricing Visibility

- Show price (or "From {formattedBasePrice}") in:
  - Hero trust micro-copy
  - Pricing section
  - Checkout
- Never reveal the full price for the first time at the final checkout screen.

### 6.4 Progress and Trust During Flow

- Multi-step drafting flow shows a `StepIndicator` at top of each screen.
- Each step shows how many remain (e.g., "Step 2 of 4").
- Confirmation page shows: dispatch reference, delivery method, price paid, next steps — not just "Thank you!"

### 6.5 Abandonment Handling

No popups, no "Don't go!" overlays.

Instead:

- Draft auto-saves to server via the active session. User can resume via session cookie or emailed resume link.
- If user has provided email: send a draft-resume email with a secure time-limited link.
- If the user clears cookies and has no resume link, the draft is not recoverable. This is an intentional privacy tradeoff in MVP.

### 6.6 CTA Copy Rules

| Context        | Preferred copy                   | Avoid                                        |
| -------------- | -------------------------------- | -------------------------------------------- |
| Primary hero   | "Draft your letter"              | "Get started", "Sign up", "Try for free"     |
| Use-case hero  | "Draft my {useCaseLabel} letter" | Generic "Get started"                        |
| Pricing page   | "Start drafting"                 | "Buy now", "Purchase"                        |
| Final CTA band | "Draft your letter"              | "Subscribe", "Sign up now"                   |
| Post-FAQ       | "Start drafting"                 | "Contact us" (unless FAQ answer requires it) |

---

## 7. Responsive Behavior

### 7.1 Breakpoints

Follows Tailwind defaults (also defined in design system):

| Breakpoint | Width  | Layout shift                   |
| ---------- | ------ | ------------------------------ |
| `sm`       | 640px  | —                              |
| `md`       | 768px  | 2-col grids activate           |
| `lg`       | 1024px | 3-col grids, side-by-side hero |
| `xl`       | 1280px | Max content width cap          |

### 7.2 Section-by-Section Behavior

| Section            | Mobile                                        | Desktop                            |
| ------------------ | --------------------------------------------- | ---------------------------------- |
| Hero               | Text block, then image below; both full-width | Text left (50%), image right (50%) |
| Social proof strip | `flex-wrap`, 2 items per row                  | Horizontal single row              |
| How It Works       | Stacked cards, full-width                     | 3-column grid                      |
| AI Differentiator  | Image above text, full-width                  | Alternating 50/50                  |
| Use Cases Grid     | 2-column grid                                 | 3-column grid                      |
| Pricing card       | Full-width                                    | Centered, `max-w-md`               |
| Trust cards        | Stacked                                       | 3-column grid                      |
| FAQ                | Full-width accordion                          | `max-w-2xl` centered               |
| Final CTA          | Full-width button                             | Centered, max-width                |
| Footer             | 2-column grid, 2 rows                         | 4-column single row                |

### 7.3 Typography Scaling

No manual `clamp()` required — use Tailwind responsive prefixes consistently:

```
text-4xl lg:text-6xl   ← Hero headline
text-2xl lg:text-4xl   ← Section title
text-xl  lg:text-2xl   ← Card title
text-sm  lg:text-base  ← Body
```

### 7.4 Touch Target Compliance

All interactive elements on mobile:

- Minimum height: `h-11` (44px) — never smaller
- CTAs: `h-12` (48px)
- FAQ accordion triggers: `py-4` minimum (ensures 44px+ height)
- Use-case grid cards: minimum `h-28` with `p-5`
- Footer links: `py-2` minimum spacing

### 7.5 Image Handling

| Element             | Mobile                                | Desktop                                    |
| ------------------- | ------------------------------------- | ------------------------------------------ |
| Hero mockup         | Below text, `w-full max-w-xs mx-auto` | Right column, absolute/relative positioned |
| Feature screenshots | Full-width, `rounded-xl shadow-md`    | 50% column width                           |
| Sample letter       | `p-4 text-xs` (reduce padding/size)   | `p-8 text-sm`                              |
| Icon circles        | 40px diameter, 20px icon              | 48px diameter, 24px icon                   |

---

## 8. SEO & Structured Data

### 8.1 Page Titles and Meta Descriptions

| Page         | `<title>` template                              | Meta description                                                                                                  |
| ------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Homepage     | `episto — Formal Swiss letters from your phone` | "Draft and send formal letters in Switzerland in minutes. AI-assisted, Swiss postal delivery. No account needed." |
| Use case     | `[Use case title] letter — episto`              | Use-case-specific, ~140 chars                                                                                     |
| How It Works | `How episto works — Formal Swiss letters`       | Describe the 3-step flow                                                                                          |
| Pricing      | `Pricing — episto`                              | "Simple per-letter pricing. No subscription. From {formattedBasePrice}."                                          |

### 8.2 Structured Data

| Page           | Schema type                              |
| -------------- | ---------------------------------------- |
| Homepage       | `Organization`, `WebSite`                |
| FAQ sections   | `FAQPage` with all Q&A pairs             |
| Use-case pages | `Service` with `areaServed: Switzerland` |
| Pricing page   | `PriceSpecification` within `Offer`      |

### 8.3 Hreflang

All marketing pages must include `hreflang` tags for all four locales:

```html
<link rel="alternate" hreflang="de-CH" href="https://episto.ch/de/" />
<link rel="alternate" hreflang="fr-CH" href="https://episto.ch/fr/" />
<link rel="alternate" hreflang="it-CH" href="https://episto.ch/it/" />
<link rel="alternate" hreflang="en-CH" href="https://episto.ch/en/" />
<link rel="alternate" hreflang="x-default" href="https://episto.ch/de/" />
```

### 8.4 Performance Requirements

- Core Web Vitals target: LCP < 2.5s, CLS < 0.1, INP < 200ms
- Hero image (phone mockup) must have `priority` prop in Next.js `<Image>`
- All below-fold images: lazy-loaded
- No third-party scripts in `<head>` that block render
- Font: Inter loaded via `next/font` (zero layout shift)

---

## 9. Component Inventory

Components needed for marketing pages. All go in `frontend/components/marketing/`.

| Component             | File                     | Purpose                                                                                                      |
| --------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `SiteHeader`          | `site-header.tsx`        | Transparent → frosted nav                                                                                    |
| `HeroSection`         | `hero-section.tsx`       | Full-viewport hero                                                                                           |
| `TrustStrip`          | `trust-strip.tsx`        | Social proof strip                                                                                           |
| `HowItWorksSection`   | `how-it-works.tsx`       | 3-step cards                                                                                                 |
| `FeatureBlock`        | `feature-block.tsx`      | Alternating image/text. See [Component Library](component-library.md) for full `FeatureBlock` specification. |
| `UseCaseGrid`         | `use-case-grid.tsx`      | Use-case entry cards                                                                                         |
| `UseCaseCard`         | `use-case-card.tsx`      | Individual card                                                                                              |
| `PricingCard`         | `pricing-card.tsx`       | Single pricing card                                                                                          |
| `TrustPrivacySection` | `trust-privacy.tsx`      | Dark trust block                                                                                             |
| `FaqSection`          | `faq-section.tsx`        | Accordion FAQ with schema                                                                                    |
| `FaqItem`             | `faq-item.tsx`           | Single accordion item                                                                                        |
| `CtaBand`             | `cta-band.tsx`           | Final CTA band                                                                                               |
| `MarketingFooter`     | `marketing-footer.tsx`   | Full footer                                                                                                  |
| `SampleLetterCard`    | `sample-letter-card.tsx` | Anonymized letter snippet                                                                                    |
| `StepCard`            | `step-card.tsx`          | Numbered step card (reused in multiple sections)                                                             |
| `SectionLabel`        | `section-label.tsx`      | Small uppercase section label                                                                                |

All components must:

- Accept locale prop or read from i18n context — no hardcoded strings
- Be built from `components/ui/` primitives or plain HTML + Tailwind
- Be responsive by default (mobile-first Tailwind classes)
- Support the `prefers-reduced-motion` media query for animations

---

## Scope — MVP Marketing Pages

MVP includes these marketing pages only:

- `/` — Homepage
- `/how-it-works` — Detailed step-by-step
- `/pricing` — Transparent pricing
- `/use-cases/:slug` — Per-use-case landing pages (5 slugs)
- `/templates` — Template gallery (browsable grid)

**Not in MVP:** `/about`, `/blog`, `/contact`. These are post-MVP considerations.

**Legal pages** (`/privacy`, `/terms`, `/imprint`) are required for launch but specified separately in [Page Specifications](page-specifications.md).

---

_Document end._  
_Companion documents: `docs/02-brand/design-system.md`, `docs/05-architecture/i18n-rules.md`, `docs/05-architecture/system-contracts.md`_
