# Episto — UX Redesign & Terms and Conditions — Part 1

> Split from [ux-redesign-and-terms.md](ux-redesign-and-terms.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- PART 1 — Executive Diagnosis
- PART 2 — UX Research Synthesis
- PART 3 — Refactored UX Proposal
- PART 4 — Legal-Structuring Observations Before Drafting
- PART 5 — Full Draft Terms and Conditions

## PART 1 — Executive Diagnosis

### The UX Problem

The current desktop implementation (`DraftShell.tsx`) creates a **two-column layout** with an independent left content area (760px max, containing all step content) and a right sidebar (320px, containing step progress and context cards). Both areas scroll independently. This creates several structural problems:

1. **Dual-scroll disorientation.** The user must mentally track two scroll contexts. The content column scrolls with step content, while the sidebar has its own sticky-then-scrollable behavior. On tall steps (body editing, recipient collection), the sidebar becomes disconnected from what the user is doing.

2. **Sidebar content is redundant.** The right sidebar repeats the step title, shows progress steps (already visible in the overlay), and provides a static hint card. This is not worth a permanent 320px reservation. The information density of the sidebar does not justify the layout complexity it creates.

3. **Layout mode discontinuity.** The draft workspace uses `DraftShell` (two-column), the review page uses a different grid (`lg:grid-cols-[minmax(0,1fr)_360px]`), checkout uses yet another grid (`lg:grid-cols-[340px_minmax(0,1fr)]` — reversed!), and confirmation uses centered single-column. Each page feels like a different product. The user crosses four distinct layout paradigms in one linear flow.

4. **The split-pane does not serve preview.** Unlike the original documentation's "conversation + preview" split, the actual implementation is "step form + progress sidebar." The letter preview is not persistently visible on desktop — it is accessed through a modal (`LetterPreviewModal`). So the split layout exists without its only justification: a visible letter preview.

5. **Mobile is the real product; desktop is an extension.** The mobile implementation (`isCompactViewport` branch) is clean: full-width, single-column, dock at bottom. But the desktop version bolts on a sidebar that adds visual weight without proportional value.

### The Legal-Structuring Problem

The core legal challenge is threefold:

1. **Platform positioning.** Episto must be clearly positioned as a software/service platform that purchases downstream postal services from Swiss Post/ePost on its own account. The user contracts with West Bay SA. West Bay SA contracts with Swiss Post. The user does not become a direct counterparty of Swiss Post. This distinction is critical for avoiding characterization as an independent postal operator under Swiss postal law (Postgesetz, PG).

2. **Service boundary clarity.** The Terms must draw a clean line between what West Bay SA delivers (drafting assistance, PDF generation, submission orchestration, confirmation records) and what Swiss Post/ePost delivers (printing, enveloping, transport, delivery). Users must understand this distinction without being confused by it.

3. **Consumer protection.** Swiss consumer-facing Terms must comply with Swiss consumer protection standards (UWG, OR, DSG), including clear pricing, fair refund provisions, and reasonable liability allocation. The Terms must be readable, not hostile — this is a premium consumer product, not an enterprise SaaS contract.

### Governing Design/Legal Principles

| Principle                                      | Implication                                                                                                                                  |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single-column focus is the premium pattern** | Narrow the layout as the user progresses toward commitment. Never split attention unnecessarily.                                             |
| **Layout consistency across the flow**         | Draft → Review → Checkout → Confirmation should feel like one product with one visual language.                                              |
| **Preview is not a sidebar — it is a moment**  | Show the letter preview as a full-width, immersive experience when the user wants to see it, not as a permanently competing panel.           |
| **Platform, not operator**                     | Every touchpoint (UX copy, Terms, emails) must reinforce that West Bay SA provides the service layer; Swiss Post handles physical execution. |
| **Honest status, honest language**             | Never claim more than what is verifiable. "Submitted" ≠ "delivered." "Confirmation" ≠ "guarantee."                                           |
| **10-day signed summary**                      | The post-transaction confirmation and signed PDF are the commercial trust anchor. They deserve a premium presentation.                       |

---

## PART 2 — UX Research Synthesis

### Findings from Leading Products

**1. Split-pane is justified only when both panes show the same content type (code diff, synchronised editing) or when one pane is genuinely static/short (Stripe checkout order summary).** When both panes have independent scroll contexts and unrelated content types (form fields vs. progress tracker), the pattern degrades the experience. GitHub, Canva, and Linear all abandon split-pane on mobile. Episto's current desktop sidebar does not contain enough value to justify its layout cost.

**2. The strongest checkout flows narrow the layout as commitment increases.** Apple, Aesop, Stripe Checkout, and NET-A-PORTER all transition from multi-column product pages to focused single-column checkout flows. The pattern is consistent: visual complexity decreases as stakes increase. Episto currently does the opposite — the checkout page introduces a different grid layout than review.

**3. One-thing-per-screen outperforms on desktop too.** GOV.UK's extensive research demonstrates that single-column, one-question-per-step forms outperform multi-field layouts even on wide viewports. Typeform, TurboTax, and Apple Checkout all follow this principle. Episto's step-based approach is correct; the bolt-on sidebar undermines it.

**4. Review before commitment is the gold standard.** GOV.UK's "Check your answers" pattern — showing all collected information in a summary list with edit links before final submission — is the most effective trust-building mechanism. Episto's review page partially implements this but uses a split layout when it should use a focused, full-width summary.

**5. Confirmation pages hero the reference number and next steps.** Swiss Air, Wise, Revolut, and DocuSign all follow the same structure: success icon → reference number (largest element) → summary → next steps → secondary actions. Motion is subtle. The reference/confirmation number is the emotional anchor.

**6. Document download should be primary CTA when the document is the goal; secondary when it is a byproduct.** For Episto's signed summary PDF, the download is the goal of the confirmation page — it should be the primary CTA, not buried below timeline steps.

### Patterns to Adopt

| Pattern                                                | Source                                 | Application                                                                        |
| ------------------------------------------------------ | -------------------------------------- | ---------------------------------------------------------------------------------- |
| **Consistent single-column with max-width constraint** | Apple, GOV.UK, Typeform                | All draft steps, review, checkout, and confirmation                                |
| **Sticky bottom dock for primary action**              | Episto mobile (already implemented)    | Extend to desktop with a full-width bottom bar                                     |
| **Full-width immersive preview**                       | Canva presentation mode, Figma Present | Letter preview as a full-screen overlay or dedicated view, not a sidebar           |
| **Summary-before-commit review**                       | GOV.UK "Check your answers"            | Review page as a single-column summary with edit links                             |
| **Narrowing visual complexity**                        | Apple, Stripe, Aesop                   | Transition from `<AppLayout>` to `<MinimalLayout>` should be seamless, not jarring |
| **Confirmation hero + primary download CTA**           | DocuSign, Swiss Air, Wise              | Signed summary PDF download as the hero CTA on confirmation                        |
| **Download redundancy**                                | DocuSign, Adobe Sign                   | In-app download + email link + attached receipt                                    |

### Patterns to Avoid

| Anti-Pattern                                                     | Why                                                             |
| ---------------------------------------------------------------- | --------------------------------------------------------------- |
| Two independently scrolling columns                              | Creates cognitive split; user loses orientation                 |
| Different grid layouts per flow step                             | Breaks product coherence; feels like four products              |
| Sidebar that repeats header information                          | Wastes 320px for information already available elsewhere        |
| Preview as a permanent side panel when it is not WYSIWYG editing | Creates expectation of synchronized editing that does not exist |
| Confetti/celebration on confirmation                             | Tone-deaf for a formal letter product                           |

---

## PART 3 — Refactored UX Proposal

### Information Architecture

The flow is a single forward-moving experience through seven phases. Each phase uses the same layout framework. The layout never changes between phases — only the content inside it changes.

```
Marketing → Draft Entry → Draft Workspace → Review → Checkout → Confirmation → Status
              │                │                │         │            │            │
              └── AppLayout ───┴── AppLayout ───┘         │            │            │
                  (full)           (focused)        MinimalLayout  MinimalLayout  MinimalLayout
```

### Layout Framework: One Column, One Scroll, One Focus

**All flow pages** (draft workspace through confirmation) use a single layout:

```
┌──────────────────────────────────────────────────────────────┐
│  FlowHeader: logo · step indicator · save status · menu     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│              max-w-[760px] mx-auto                           │
│                                                              │
│    ┌──────────────────────────────────────────────┐          │
│    │  Step Content                                │          │
│    │  (single column, scrollable)                 │          │
│    │                                              │          │
│    │  • title + subtitle                          │          │
│    │  • step-specific forms/cards                 │          │
│    │  • inline preview trigger when relevant      │          │
│    │                                              │          │
│    └──────────────────────────────────────────────┘          │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  Bottom Dock: secondary action · primary CTA · step nav     │
└──────────────────────────────────────────────────────────────┘
```

**Key rules:**

1. **No sidebar on any flow page.** The right sidebar is removed entirely from the draft workspace, review, and checkout.
2. **Max-width of 760px** for content on both mobile and desktop. Desktop gets generous side margins, creating a focused reading column — like a premium form or a well-set letter.
3. **One scroll context.** The entire page is a single vertical scroll. The header is sticky. The bottom dock is sticky. Everything between them scrolls naturally.
4. **The bottom dock is present on all flow pages** — desktop and mobile. On mobile it contains the primary CTA and step trigger. On desktop it contains the primary CTA, secondary action, and optionally the step trigger. It replaces the previous `StatusStrip` and the various per-page sticky bars.
5. **Letter preview** is accessed via a full-screen modal overlay (already implemented as `LetterPreviewModal`), triggered by a persistent "Preview letter" button in the bottom dock or inline in the content. On desktop, the modal presents the A4 preview at comfortable scale. On mobile, it is a full-screen sheet.

### Step Flow

| #   | Step         | Route                     | Content                                                         |
| --- | ------------ | ------------------------- | --------------------------------------------------------------- |
| 1   | Intake       | `/draft/:id`              | Natural language input, use-case selection, dictation           |
| 2   | Sender       | `/draft/:id/sender`       | Sender name + address form                                      |
| 3   | Recipient    | `/draft/:id/recipient`    | Recipient name + address form, company search                   |
| 4   | Body         | `/draft/:id/body`         | AI-assisted body generation, refinement, inline preview trigger |
| 5   | Attachments  | `/draft/:id/attachments`  | Upload, manage, signature                                       |
| 6   | Subject      | `/draft/:id/subject`      | Subject line, delivery type selection                           |
| 7   | Logistics    | `/draft/:id/logistics`    | Final summary, delivery confirmation                            |
| —   | Review       | `/draft/:id/review`       | Full letter preview, completion checklist, edit links           |
| —   | Checkout     | `/draft/:id/checkout`     | Email, legal consent, payment                                   |
| —   | Confirmation | `/draft/:id/confirmation` | Success hero, signed PDF download, next steps                   |

### Desktop Layout — Detailed

**Draft Workspace Steps (1–7):**

```
┌───────────────────────────────────────────────────────┐
│  [Episto logo]  ● ● ○ ○ ○ ○ ○   Saved ✓   [≡]  │  ← FlowHeader (sticky, h-14)
├───────────────────────────────────────────────────────┤
│                                                       │
│          ┌─────────────────────────┐                  │
│          │  Step 4 of 7            │                  │  ← eyebrow
│          │  Letter content         │                  │  ← title (h1)
│          │  Describe what you'd    │                  │  ← subtitle
│          │  like your letter to    │                  │
│          │  say.                   │                  │
│          │                         │                  │
│          │  ┌───────────────────┐  │                  │
│          │  │ AI composer area  │  │                  │  ← step-specific content
│          │  │ or form fields    │  │                  │
│          │  │                   │  │                  │
│          │  └───────────────────┘  │                  │
│          │                         │                  │
│          │  [Preview letter ↗]     │                  │  ← inline preview trigger
│          │                         │                  │
│          └─────────────────────────┘                  │
│                                                       │
├───────────────────────────────────────────────────────┤
│  [← Back]  [Steps]          [Preview]  [Continue →]   │  ← Bottom Dock (sticky)
└───────────────────────────────────────────────────────┘
```

**Review Page:**

```
┌───────────────────────────────────────────────────────┐
│  [Episto logo]  ● ● ● ● ● ● ● ●   [← Back]     │  ← FlowHeader
├───────────────────────────────────────────────────────┤
│                                                       │
│          ┌─────────────────────────┐                  │
│          │  Final check            │                  │
│          │  Review your letter     │                  │
│          │                         │                  │
│          │  ┌───────────────────┐  │                  │
│          │  │                   │  │                  │
│          │  │  Letter Preview   │  │                  │  ← Full-width A4 preview card
│          │  │  (paper card,     │  │                  │     centered, shadow-paper
│          │  │   max-w-680px)    │  │                  │
│          │  │                   │  │                  │
│          │  └───────────────────┘  │                  │
│          │                         │                  │
│          │  Completion Summary     │                  │
│          │  ┌─ Sender ✓ ── Edit ┐  │                  │  ← summary list with edit links
│          │  │  Recipient ✓  Edit│  │                  │     (GOV.UK "check your answers")
│          │  │  Subject ✓    Edit│  │                  │
│          │  │  Body ✓       Edit│  │                  │
│          │  │  Signature ⚠  Add │  │                  │
│          │  │  Attachments  Add │  │                  │
│          │  └───────────────────┘  │                  │
│          │                         │                  │
│          │  Delivery & Price       │                  │
│          │  ┌───────────────────┐  │                  │
│          │  │  Standard  │ Reg  │  │                  │  ← delivery selector inline
│          │  │  Total: CHF 6.90  │  │                  │
│          │  └───────────────────┘  │                  │
│          │                         │                  │
│          └─────────────────────────┘                  │
│                                                       │
├───────────────────────────────────────────────────────┤
│  [← Back to draft]              [Pay CHF 6.90 →]      │  ← Bottom Dock
└───────────────────────────────────────────────────────┘
```

**Checkout Page:**

```
┌───────────────────────────────────────────────────────┐
│  [Episto logo]          Step 2 of 3   [← Review]  │  ← MinimalLayout header
├───────────────────────────────────────────────────────┤
│                                                       │
│          ┌─────────────────────────┐                  │
│          │  Checkout               │                  │
│          │  Complete your order    │                  │
│          │                         │                  │
│          │  Order summary          │                  │
│          │  ┌───────────────────┐  │                  │
│          │  │  Letter: CHF 4.90 │  │                  │  ← collapsed summary card
│          │  │  Delivery: CHF 2  │  │                  │
│          │  │  Total: CHF 6.90  │  │                  │
│          │  └───────────────────┘  │                  │
│          │                         │                  │
│          │  Email address          │                  │
│          │  [________________]     │                  │
│          │                         │                  │
│          │  ☐ I agree to Terms     │                  │
│          │                         │                  │
│          │  [Continue to payment]  │                  │
│          │                         │                  │
│          │  --- or after intent ---│                  │
│          │                         │                  │
│          │  Payment details        │                  │
│          │  ┌───────────────────┐  │                  │
│          │  │  Stripe Element   │  │                  │
│          │  └───────────────────┘  │                  │
│          │                         │                  │
│          │  🔒 Stripe  🇨🇭 Swiss  │                  │  ← trust row
│          │                         │                  │
│          └─────────────────────────┘                  │
│                                                       │
├───────────────────────────────────────────────────────┤
│                  [Send my letter — CHF 6.90]           │  ← Bottom Dock (sticky)
└───────────────────────────────────────────────────────┘
```

### Confirmation Page — Detailed Concept

This is the critical new design.

```
┌───────────────────────────────────────────────────────┐
│  [Episto logo]                          [≡ Menu]   │  ← MinimalLayout header
├───────────────────────────────────────────────────────┤
│                                                       │
│          ┌─────────────────────────┐                  │
│          │                         │                  │
│          │       ✓ (48px, green)   │                  │  ← Success icon, scale-in animation
│          │                         │                  │
│          │   Letter submitted      │                  │  ← h1, text-2xl font-semibold
│          │   for dispatch          │                  │
│          │                         │                  │
│          │   Your letter has been  │                  │  ← subtitle, honest language
│          │   submitted to Swiss    │                  │
│          │   Post for processing.  │                  │
│          │                         │                  │
│          │   EP-4FD8704A           │                  │  ← reference number, font-mono
│          │   [copy]                │                  │     tap-to-copy
│          │                         │                  │
│          └─────────────────────────┘                  │
│                                                       │
│          ┌─────────────────────────┐                  │
│          │                         │                  │
│          │  📄 Your confirmation   │                  │  ← HERO CARD for signed PDF
│          │     is ready            │                  │
│          │                         │                  │
│          │  We've prepared a       │                  │
│          │  signed confirmation    │                  │
│          │  document containing    │                  │
│          │  your transaction       │                  │
│          │  record and a copy of   │                  │
│          │  your sent letter.      │                  │
│          │                         │                  │
│          │  ┌───────────────────┐  │                  │
│          │  │ Download signed   │  │                  │  ← PRIMARY CTA
│          │  │ confirmation PDF  │  │                  │     full-width, prominent
│          │  └───────────────────┘  │                  │
│          │                         │                  │
│          │  Available for 10 days  │                  │  ← expiry notice
│          │  until 15 April 2026    │                  │     with computed date
│          │                         │                  │
│          │  Issued by West Bay SA  │                  │  ← issuer attribution
│          │                         │                  │
│          └─────────────────────────┘                  │
│                                                       │
│          ┌─────────────────────────┐                  │
│          │  Dispatch status        │                  │  ← DispatchStatusCard
│          │  ○ Submitted ✓          │                  │
│          │  │ Accepted  ○          │                  │
│          │  │ Processing ○         │                  │
│          │  └ Updates    ○         │                  │
│          └─────────────────────────┘                  │
│                                                       │
│          ┌─────────────────────────┐                  │
│          │  ✉️ A payment receipt   │                  │  ← Email notice card
│          │  has been sent to       │                  │
│          │  anna@example.com       │                  │
│          │                         │                  │
│          │  You'll also receive a  │                  │
│          │  link to your signed    │                  │
│          │  confirmation document. │                  │
│          └─────────────────────────┘                  │
│                                                       │
│          [View letter PDF]  [Send another letter]     │  ← secondary actions
│                                                       │
├───────────────────────────────────────────────────────┤
│  (mobile only) [Send another letter]                   │  ← sticky CTA
└───────────────────────────────────────────────────────┘
```

**Confirmation page behavior:**

- **Hero area** (success icon + heading + reference) is visible above the fold on all viewport sizes including 390px mobile.
- **Signed PDF download card** is immediately below the hero, not below the timeline. This is the most important action on the page. It uses a distinct visual treatment: a card with a subtle document icon, clear heading, prominent download button, and expiry countdown.
- **Expiry communication:** Shows both a relative label ("Available for 10 days") and an absolute date ("until 15 April 2026"). After expiry, the card changes to: "This document is no longer available for download. Contact support if you need a copy."
- **Dispatch status card** is below the download card. It uses the existing `DispatchConfirmation` component.
- **Email notice** confirms what was sent and mentions the signed summary PDF link will also be in the email.
- **Secondary actions** (view letter, send another) are at the bottom. "Send another letter" is sticky on mobile.

### Signed Summary PDF — Structure

The PDF issued by West Bay SA contains:

**Cover / Part A — Confirmation Record**

```
┌──────────────────────────────────────────┐
│  WEST BAY SA                             │
│  Confirmation of Postal Submission       │
│                                          │
│  Reference:      EP-4FD8704A             │
│  Date:           5 April 2026, 14:32 CET │
│  Status:         Submitted to Swiss Post │
│                                          │
│  Sender:         Anna Meier              │
│                  Seestrasse 15           │
│                  8002 Zürich             │
│                                          │
│  Recipient:      Müller Immobilien AG    │
│                  Bahnhofstrasse 42       │
│                  8001 Zürich             │
│                                          │
│  Delivery type:  Standard                │
│  Provider ref:   [if available]          │
│  Pages:          2                       │
│  Attachments:    1 (contract-scan.pdf)   │
│                                          │
│  Subject:        Kündigung Mietvertrag   │
│                                          │
│  This document confirms that the above   │
│  letter was submitted to Swiss Post /    │
│  ePost infrastructure for physical       │
│  dispatch on behalf of the sender via    │
│  the Episto platform operated by     │
│  West Bay SA. This confirmation does     │
│  not constitute proof of delivery.       │
│                                          │
│  Issued by: West Bay SA                  │
│  [Digital signature / hash]              │
│                                          │
└──────────────────────────────────────────┘
```

**Part B — Document Bundle**

Following the confirmation record page(s):

- Full copy of the sent letter PDF (all pages)
- All uploaded attachments that were included in the sent package

### Email Confirmation — Structure

**Template: Transaction Confirmation (new, replaces or supplements existing payment receipt)**

- **Subject:** "Your Episto confirmation — EP-4FD8704A"
- **Body:**
  - Episto logo / header
  - "Your letter has been submitted for dispatch."
  - Reference: EP-4FD8704A
  - Date and time
  - Recipient name (no full address)
  - Delivery type
  - **Attached:** Payment receipt PDF (with matching reference EP-4FD8704A, linking receipt to letter)
  - **Link:** "Download your signed confirmation document" → deep link to confirmation page with download CTA
  - Expiry note: "This link is available for 10 days."
  - Link to order status page
  - Support contact

**What the email does NOT contain:**

- Full letter content
- Full recipient address
- The signed summary PDF itself (too large with attachments; user downloads from link)
- Marketing copy or upselling

### Mobile Logic

Mobile uses the exact same layout framework — the only difference is that the 760px max-width content column fills the viewport. The bottom dock becomes the primary navigation mechanism. Specific mobile adaptations:

1. **Step content** fills full width with `px-4` padding.
2. **Bottom dock** is fixed with safe-area insets.
3. **Letter preview** is a full-screen bottom sheet, not a sidebar.
4. **Checkout order summary** collapses into a compact card at the top.
5. **Confirmation page** stacks all cards vertically; signed PDF download card remains the most prominent element after the hero.

### Implementation Guidance

**Layout migration:**

1. Remove the `<aside>` from `DraftShell.tsx`. Remove the `!isCompactViewport` conditional that creates the sidebar. The DraftShell should render identically on mobile and desktop, with only max-width and padding differences.

2. Create a unified `<FlowDock>` component that replaces the current per-page sticky bars. It should accept: `primaryAction`, `secondaryAction`, `stepTrigger`, and `metadata` (price display). Used on all flow pages.

3. Move the step progress overview into the `<StepOverlay>` only (already exists). Remove it from the sidebar.

4. Ensure the `max-w-[760px] mx-auto` constraint is applied consistently on draft steps, review, checkout, and confirmation. No page should break to a wider grid.

5. The letter preview button should appear in two places: (a) inline within the body step content as a prominent card/button, and (b) in the bottom dock as a secondary action when a draft exists.

**Review page refactor:**

1. Replace the current `lg:grid-cols-[minmax(0,1fr)_360px]` grid with single-column.
2. Letter preview card renders inline, full-width, centered, with `max-w-[680px]`.
3. Completion summary renders below preview as a stacked list (not a sidebar).
4. Delivery selector and price summary render inline below the completion summary.
5. Single bottom dock with "Back to draft" and "Pay CHF X.XX →".

**Checkout page refactor:**

1. Replace the current `lg:grid-cols-[340px_minmax(0,1fr)]` grid with single-column.
2. Order summary card renders at the top, collapsible.
3. Email field, consent, and payment form render sequentially below.
4. Single bottom dock with payment CTA.

**Confirmation page:**

1. Build the signed PDF download hero card as a new component (`<SignedConfirmationCard>`).
2. Implement the backend download so `GET /v1/drafts/:id/pdf` and `GET /v1/orders/:orderToken/pdf` generate and serve the signed confirmation bundle. Page 1 must be the branded Episto confirmation record with logo, submission mode, provider reference, tracking number when present, and the other operational metadata required for support/email follow-up. The remaining pages must be the exact rendered letter PDF prepared for dispatch.
3. Track 10-day expiry and show appropriate states (available, expiring soon, expired).
4. If submission mode is `mock`, the card and the PDF must explicitly state that no fee-bearing ePost submission occurred. Mock mode must still surface the same provider-shaped fields expected from live ePost responses.
5. The current download trigger is `GET /v1/drafts/:id/pdf` with session authentication. The public order-status route uses `GET /v1/orders/:orderToken/pdf`.

**State management for preview:**

The letter preview modal should be accessible from any step where a draft body exists. A context-level `canShowPreview` flag (true when body content exists) controls visibility of preview triggers. The preview always shows the latest server-rendered state.

**Error states:**

- Signed PDF not yet available (generation in progress): "Your confirmation document is being prepared. Refresh in a moment."
- Signed PDF expired: "This document is no longer available for download. Contact support@swissmail.ch if you need a copy."
- Signed PDF generation failed: "We couldn't generate your confirmation document. Contact support with reference EP-XXXXXXXX."

---

## PART 4 — Legal-Structuring Observations Before Drafting

### Key Legal-Structuring Choices

1. **Contractual counterparty is West Bay SA.** The user contracts solely with West Bay SA. Swiss Post/ePost is a downstream service provider used by West Bay SA. This is the foundational structural choice.

2. **"Platform service" not "postal service."** The Terms describe Episto as a platform providing document preparation and dispatch submission services. Physical postal execution is explicitly delegated to Swiss Post/ePost. This reduces the risk of Episto being characterized as a postal operator under Art. 2 PG.

3. **No sublicensing language.** The Terms do not suggest that West Bay SA is sublicensing or extending Swiss Post rights to users. West Bay SA purchases services from Swiss Post on its own account and passes the benefit to users as part of its integrated service.

4. **Downstream operational framework reference.** The Terms reference Swiss Post/ePost operational terms where relevant (delivery categories, handling standards, returns) but explicitly state that these references are for transparency, not to create a direct contractual relationship between users and Swiss Post.

5. **10-day document retention.** The signed summary PDF availability window is a deliberate commercial choice: long enough to be useful, short enough to limit data retention obligations and operational complexity. The Terms make this explicit.

### Clauses Requiring Particular Care

- **Clause 2 (Platform nature):** Must clearly state we are not a postal operator without overstating the legal conclusion. Use factual language about what we do and do not do.
- **Clause 8 (Swiss Post/ePost execution):** Must reference downstream providers without creating an impression of direct contract. Careful wording about "operational framework" not "contractual terms."
- **Clause 9 (No deadline guarantee):** Critical for consumer protection. Must be prominent but not hostile.
- **Clause 7 (Sender identity):** Must impose responsibility on the user for sender identity without implying we verify it.
- **Clause 17 (Liability):** Must comply with Swiss OR Art. 100 (cannot exclude liability for intentional or grossly negligent breach). Consumer-facing caps must be reasonable.

### Consumer-Law Risk Areas

- Swiss law (OR Art. 8, UWG Art. 8) provides consumer protections against unfair terms. Overly broad exclusion clauses may be unenforceable.
- Data protection references must be consistent with DSG (Swiss Data Protection Act, revised version in force since 1 September 2023).
- Refund provisions should be fair — consumers expect refunds for unperformed services. The Terms should provide for refunds when dispatch fails due to our fault or provider rejection.

---

## PART 5 — Full Draft Terms and Conditions

---

# Terms and Conditions — Episto

**Effective date:** [insert date]  
**Last updated:** [insert date]  
**Service provider:** West Bay SA, [registered address], Switzerland (CHE-[UID number])  
**Contact:** support@swissmail.ch

---
