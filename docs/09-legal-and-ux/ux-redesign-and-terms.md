# Swiss Mail — UX Redesign & Terms and Conditions

**Prepared by:** Product & Legal Advisory  
**Date:** 2026-04-05  
**Status:** Advisory draft — requires Swiss counsel validation before publication  
**Entity:** West Bay SA

---

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

1. **Platform positioning.** Swiss Mail must be clearly positioned as a software/service platform that purchases downstream postal services from Swiss Post/ePost on its own account. The user contracts with West Bay SA. West Bay SA contracts with Swiss Post. The user does not become a direct counterparty of Swiss Post. This distinction is critical for avoiding characterization as an independent postal operator under Swiss postal law (Postgesetz, PG).

2. **Service boundary clarity.** The Terms must draw a clean line between what West Bay SA delivers (drafting assistance, PDF generation, submission orchestration, confirmation records) and what Swiss Post/ePost delivers (printing, enveloping, transport, delivery). Users must understand this distinction without being confused by it.

3. **Consumer protection.** Swiss consumer-facing Terms must comply with Swiss consumer protection standards (UWG, OR, DSG), including clear pricing, fair refund provisions, and reasonable liability allocation. The Terms must be readable, not hostile — this is a premium consumer product, not an enterprise SaaS contract.

### Governing Design/Legal Principles

| Principle | Implication |
|---|---|
| **Single-column focus is the premium pattern** | Narrow the layout as the user progresses toward commitment. Never split attention unnecessarily. |
| **Layout consistency across the flow** | Draft → Review → Checkout → Confirmation should feel like one product with one visual language. |
| **Preview is not a sidebar — it is a moment** | Show the letter preview as a full-width, immersive experience when the user wants to see it, not as a permanently competing panel. |
| **Platform, not operator** | Every touchpoint (UX copy, Terms, emails) must reinforce that West Bay SA provides the service layer; Swiss Post handles physical execution. |
| **Honest status, honest language** | Never claim more than what is verifiable. "Submitted" ≠ "delivered." "Confirmation" ≠ "guarantee." |
| **10-day signed summary** | The post-transaction confirmation and signed PDF are the commercial trust anchor. They deserve a premium presentation. |

---

## PART 2 — UX Research Synthesis

### Findings from Leading Products

**1. Split-pane is justified only when both panes show the same content type (code diff, synchronised editing) or when one pane is genuinely static/short (Stripe checkout order summary).** When both panes have independent scroll contexts and unrelated content types (form fields vs. progress tracker), the pattern degrades the experience. GitHub, Canva, and Linear all abandon split-pane on mobile. Swiss Mail's current desktop sidebar does not contain enough value to justify its layout cost.

**2. The strongest checkout flows narrow the layout as commitment increases.** Apple, Aesop, Stripe Checkout, and NET-A-PORTER all transition from multi-column product pages to focused single-column checkout flows. The pattern is consistent: visual complexity decreases as stakes increase. Swiss Mail currently does the opposite — the checkout page introduces a different grid layout than review.

**3. One-thing-per-screen outperforms on desktop too.** GOV.UK's extensive research demonstrates that single-column, one-question-per-step forms outperform multi-field layouts even on wide viewports. Typeform, TurboTax, and Apple Checkout all follow this principle. Swiss Mail's step-based approach is correct; the bolt-on sidebar undermines it.

**4. Review before commitment is the gold standard.** GOV.UK's "Check your answers" pattern — showing all collected information in a summary list with edit links before final submission — is the most effective trust-building mechanism. Swiss Mail's review page partially implements this but uses a split layout when it should use a focused, full-width summary.

**5. Confirmation pages hero the reference number and next steps.** Swiss Air, Wise, Revolut, and DocuSign all follow the same structure: success icon → reference number (largest element) → summary → next steps → secondary actions. Motion is subtle. The reference/confirmation number is the emotional anchor.

**6. Document download should be primary CTA when the document is the goal; secondary when it is a byproduct.** For Swiss Mail's signed summary PDF, the download is the goal of the confirmation page — it should be the primary CTA, not buried below timeline steps.

### Patterns to Adopt

| Pattern | Source | Application |
|---|---|---|
| **Consistent single-column with max-width constraint** | Apple, GOV.UK, Typeform | All draft steps, review, checkout, and confirmation |
| **Sticky bottom dock for primary action** | Swiss Mail mobile (already implemented) | Extend to desktop with a full-width bottom bar |
| **Full-width immersive preview** | Canva presentation mode, Figma Present | Letter preview as a full-screen overlay or dedicated view, not a sidebar |
| **Summary-before-commit review** | GOV.UK "Check your answers" | Review page as a single-column summary with edit links |
| **Narrowing visual complexity** | Apple, Stripe, Aesop | Transition from `<AppLayout>` to `<MinimalLayout>` should be seamless, not jarring |
| **Confirmation hero + primary download CTA** | DocuSign, Swiss Air, Wise | Signed summary PDF download as the hero CTA on confirmation |
| **Download redundancy** | DocuSign, Adobe Sign | In-app download + email link + attached receipt |

### Patterns to Avoid

| Anti-Pattern | Why |
|---|---|
| Two independently scrolling columns | Creates cognitive split; user loses orientation |
| Different grid layouts per flow step | Breaks product coherence; feels like four products |
| Sidebar that repeats header information | Wastes 320px for information already available elsewhere |
| Preview as a permanent side panel when it is not WYSIWYG editing | Creates expectation of synchronized editing that does not exist |
| Confetti/celebration on confirmation | Tone-deaf for a formal letter product |

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

| # | Step | Route | Content |
|---|---|---|---|
| 1 | Intake | `/draft/:id` | Natural language input, use-case selection, dictation |
| 2 | Sender | `/draft/:id/sender` | Sender name + address form |
| 3 | Recipient | `/draft/:id/recipient` | Recipient name + address form, company search |
| 4 | Body | `/draft/:id/body` | AI-assisted body generation, refinement, inline preview trigger |
| 5 | Attachments | `/draft/:id/attachments` | Upload, manage, signature |
| 6 | Subject | `/draft/:id/subject` | Subject line, delivery type selection |
| 7 | Logistics | `/draft/:id/logistics` | Final summary, delivery confirmation |
| — | Review | `/draft/:id/review` | Full letter preview, completion checklist, edit links |
| — | Checkout | `/draft/:id/checkout` | Email, legal consent, payment |
| — | Confirmation | `/draft/:id/confirmation` | Success hero, signed PDF download, next steps |

### Desktop Layout — Detailed

**Draft Workspace Steps (1–7):**

```
┌───────────────────────────────────────────────────────┐
│  [Swiss Mail logo]  ● ● ○ ○ ○ ○ ○   Saved ✓   [≡]  │  ← FlowHeader (sticky, h-14)
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
│  [Swiss Mail logo]  ● ● ● ● ● ● ● ●   [← Back]     │  ← FlowHeader
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
│  [Swiss Mail logo]          Step 2 of 3   [← Review]  │  ← MinimalLayout header
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
│  [Swiss Mail logo]                          [≡ Menu]   │  ← MinimalLayout header
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
│          │   SM-4FD8704A           │                  │  ← reference number, font-mono
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
│  Reference:      SM-4FD8704A             │
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
│  the Swiss Mail platform operated by     │
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

- **Subject:** "Your Swiss Mail confirmation — SM-4FD8704A"
- **Body:**
  - Swiss Mail logo / header
  - "Your letter has been submitted for dispatch."
  - Reference: SM-4FD8704A
  - Date and time
  - Recipient name (no full address)
  - Delivery type
  - **Attached:** Payment receipt PDF (with matching reference SM-4FD8704A, linking receipt to letter)
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
2. Implement a backend endpoint to generate and serve the signed summary PDF.
3. Track 10-day expiry and show appropriate states (available, expiring soon, expired).
4. The download triggers a `GET /v1/drafts/:id/confirmation-pdf` with session authentication.

**State management for preview:**

The letter preview modal should be accessible from any step where a draft body exists. A context-level `canShowPreview` flag (true when body content exists) controls visibility of preview triggers. The preview always shows the latest server-rendered state.

**Error states:**

- Signed PDF not yet available (generation in progress): "Your confirmation document is being prepared. Refresh in a moment."
- Signed PDF expired: "This document is no longer available for download. Contact support@swissmail.ch if you need a copy."
- Signed PDF generation failed: "We couldn't generate your confirmation document. Contact support with reference SM-XXXXXXXX."

---

## PART 4 — Legal-Structuring Observations Before Drafting

### Key Legal-Structuring Choices

1. **Contractual counterparty is West Bay SA.** The user contracts solely with West Bay SA. Swiss Post/ePost is a downstream service provider used by West Bay SA. This is the foundational structural choice.

2. **"Platform service" not "postal service."** The Terms describe Swiss Mail as a platform providing document preparation and dispatch submission services. Physical postal execution is explicitly delegated to Swiss Post/ePost. This reduces the risk of Swiss Mail being characterized as a postal operator under Art. 2 PG.

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

# Terms and Conditions — Swiss Mail

**Effective date:** [insert date]  
**Last updated:** [insert date]  
**Service provider:** West Bay SA, [registered address], Switzerland (CHE-[UID number])  
**Contact:** support@swissmail.ch

---

## Key Points

Before you read the full terms, here is what matters most:

- **Your contract is with West Bay SA**, not with Swiss Post or any other postal provider.
- **We provide a software platform** for preparing and submitting letters. Physical printing, enveloping, and postal delivery are handled by Swiss Post / ePost infrastructure.
- **Submission through our platform is not the same as postal handover.** After you pay and we submit your letter, handover to Swiss Post may occur later — not instantly.
- **We do not guarantee compliance with statutory deadlines, legal notice periods, or formal delivery requirements** unless we explicitly state otherwise for a specific service tier.
- **You are responsible for content, sender identity, and recipient details.** We do not verify the factual accuracy of your letters.
- **We may refuse or suspend submissions** that appear suspicious, unlawful, or technically defective.
- **Delivery and return handling depend on Swiss Post / ePost processes**, which are outside our control.
- **Your signed confirmation document is available for download for 10 days** after your transaction is completed.

---

## 1. Scope of Service

1.1. Swiss Mail is a web-based platform operated by West Bay SA ("**we**", "**us**", "**our**") that enables users ("**you**", "**your**") to:

   (a) prepare formal letters using AI-assisted drafting tools;  
   (b) review and edit letters in a structured workflow;  
   (c) generate a final print-ready PDF document;  
   (d) optionally attach supporting documents to be included with the letter;  
   (e) submit the completed letter package for physical postal dispatch in Switzerland; and  
   (f) receive transaction confirmations and, where available, dispatch status updates.

1.2. The service is currently available for postal dispatch within Switzerland only.

1.3. Our service covers the entire process from letter preparation through dispatch submission. Once your letter has been submitted for dispatch, physical production, enveloping, transport, and delivery are performed by Swiss Post / ePost infrastructure (see Section 8).

1.4. We may update, modify, or expand the features and capabilities of the platform from time to time. Material changes that affect your rights or obligations will be communicated in accordance with Section 24.

---

## 2. Platform Nature — We Are Not a Postal Operator

2.1. Swiss Mail is a **software and service platform**. We provide technology, AI-assisted drafting, document formatting, and dispatch submission orchestration.

2.2. We are **not** a postal operator, postal service provider, or licensed carrier. We do not operate printing facilities, mail sorting centres, or delivery networks. We do not transport or deliver physical mail.

2.3. For the physical execution of postal dispatch, we use the services of Swiss Post / ePost and potentially other specialised service providers. We engage these providers on our own account as part of delivering our service to you. You do not enter into a separate contract with Swiss Post, ePost, or any other downstream provider by using Swiss Mail.

2.4. References to Swiss Post / ePost in these Terms, in our platform interface, or in our communications are provided for transparency about the operational execution of your dispatch. They do not constitute, and should not be understood as, a direct contractual relationship between you and Swiss Post / ePost or any sublicensing of Swiss Post / ePost services to you.

---

## 3. Account and User Eligibility

3.1. Swiss Mail is designed for use by individuals and legal entities with a valid postal address in Switzerland.

3.2. You must be at least 18 years old or have the legal capacity to enter into a binding contract under applicable Swiss law.

3.3. The current version of Swiss Mail operates on a **guest-first model**. You are not required to create a user account to use the service. A temporary session is created when you begin drafting a letter. Session duration is limited and communicated in the platform interface.

3.4. We reserve the right to introduce optional or mandatory account registration in future versions of the service.

3.5. You are responsible for maintaining the confidentiality of any session links, resume tokens, or access credentials associated with your use of the service.

---

## 4. Submission Workflow and Formation of Contract

4.1. The typical workflow consists of:

   (a) **Drafting**: You describe or compose your letter using our platform tools. AI-assisted drafting is available to help you prepare your letter.  
   (b) **Review**: You review the complete letter, verify all details, and confirm the content.  
   (c) **Checkout**: You provide your email address for confirmations, select a delivery type, review the price, accept these Terms, and authorise payment.  
   (d) **Payment**: You pay the applicable fee through our payment processor (currently Stripe).  
   (e) **Dispatch submission**: Upon confirmed payment, we generate the final print-ready PDF, prepare the dispatch metadata, and submit the letter package for physical dispatch through our provider infrastructure.

4.2. **A binding contract between you and West Bay SA is formed when your payment is successfully authorised or captured.** Prior to that point, your drafting session does not constitute a binding order, and either party may discontinue without obligation.

4.3. Successful payment does not guarantee that your letter has been physically handed over to Swiss Post. Handover occurs as part of the subsequent dispatch process and may take place after a delay depending on processing schedules and provider availability.

4.4. You will receive a transaction reference number upon successful payment. This reference is generated by Swiss Mail and may differ from any reference subsequently assigned by Swiss Post or the dispatch provider.

---

## 5. PDF and Document Requirements

5.1. The final letter PDF is generated by our system based on the content you have provided and confirmed during the drafting and review process. The PDF is generated server-side and constitutes the canonical version submitted for dispatch.

5.2. The client-side preview shown during drafting is provided for your convenience and confidence. It is not the source of truth for what is submitted for dispatch. Minor rendering differences between preview and the final server-generated PDF may occur.

5.3. Letters are limited to a maximum of 5 pages. Letters exceeding this limit cannot be submitted.

5.4. Where you upload attachments (supporting documents, images), these are included in the dispatch package subject to applicable file type, size, and page count limitations as communicated in the platform interface.

5.5. We reserve the right to reject documents that are technically defective, unrenderable, or incompatible with the dispatch provider's requirements.

---

## 6. Address Data and User Responsibility

6.1. You are solely responsible for providing accurate and complete sender and recipient address information.

6.2. Our platform may offer soft validation of Swiss postal codes and city names. This validation is an assistance tool and does not guarantee address correctness or deliverability.

6.3. We are not responsible for letters that are undeliverable, returned, or delayed due to incorrect, incomplete, or ambiguous address information provided by you.

6.4. The service is currently limited to recipient addresses in Switzerland. Non-Swiss recipient addresses cannot be processed.

---

## 7. Sender Identity and Authority

7.1. You may specify sender details (name, address, and other sender information) that appear on the letter. The sender details on the letter may be your own details or those of another person or entity on whose behalf you are acting.

7.2. **You warrant that you are authorised to use the sender identity you provide.** If you send a letter on behalf of another person or entity, you represent that you have obtained the necessary authorisation from that person or entity.

7.3. We do not verify the accuracy or legitimacy of sender identities provided by users. However, we reserve the right to refuse, suspend, or investigate submissions where sender identity misuse or impersonation is reasonably suspected (see Section 13).

7.4. You are solely responsible for any consequences arising from the use of a sender identity, whether your own or that of a third party. You indemnify West Bay SA against any claims, losses, or costs arising from unauthorised use of a sender identity (see Section 18).

---

## 8. Physical Dispatch via Swiss Post / ePost

8.1. Upon successful payment and completion of the dispatch submission process, we submit your letter package to Swiss Post / ePost infrastructure for physical production, enveloping, and postal delivery.

8.2. Swiss Post / ePost is responsible for the physical handling of your letter from the point of handover, including printing, enveloping, sorting, transport, and delivery to the recipient address. We do not control or operate any part of this physical process.

8.3. The operational framework, service categories, handling standards, delivery timeframes, and exclusions of Swiss Post / ePost apply to the physical dispatch of your letter. For reference, Swiss Post's general terms and service descriptions can be consulted at [Swiss Post / ePost Terms — insert final link].

8.4. We will communicate the dispatch status of your letter to the extent that information is made available to us by the dispatch provider. We cannot provide status information beyond what the provider supplies.

8.5. We may, at our discretion or as operationally necessary, use other specialised service providers for specific components of the dispatch process (such as printing or address processing), provided the overall quality and security of the service are not materially compromised.

---

## 9. No Guarantee of Deadline Compliance, Legal Effects, or Proof Effects

9.1. **Swiss Mail does not guarantee that your letter will arrive by a specific date, meet a statutory or contractual deadline, or produce a specific legal effect.** This applies to all delivery types, including registered mail.

9.2. If you are sending a letter to comply with a legal notice period, a contractual deadline, a statutory filing requirement, or any other time-sensitive obligation, you are solely responsible for ensuring that you submit your letter with sufficient time for processing, dispatch, transport, and delivery.

9.3. We do not provide legal advice, legal review, or opinions on the legal validity or sufficiency of your letters. AI-assisted drafting is a convenience tool, not a legal service.

9.4. The fact that a letter was submitted through Swiss Mail does not, by itself, constitute proof of delivery to the recipient, proof of receipt by the recipient, or proof of the content of the communication, unless the selected delivery type includes a provider-confirmed delivery record (such as registered mail with signature confirmation) and the provider has confirmed such delivery.

9.5. Our signed confirmation document (see Section 22) confirms that a letter was submitted by us for dispatch through Swiss Post / ePost infrastructure. It does not constitute proof of delivery to the intended recipient.

---

## 10. Delivery Times and Estimates

10.1. Any delivery time estimates shown in our platform or communications are indicative only and based on information provided by Swiss Post / ePost for typical processing under normal conditions.

10.2. Actual delivery times depend on factors outside our control, including Swiss Post processing schedules, recipient address accessibility, public holidays, service disruptions, and force majeure events.

10.3. We do not guarantee delivery within any specific timeframe.

---

## 11. Registered Mail and Special Delivery Types

11.1. Where available, our platform may offer registered mail (Einschreiben / Recommandé) and other enhanced delivery types. The availability of these options depends on the capabilities offered by our dispatch provider.

11.2. Registered mail is handled by Swiss Post according to its own service specifications. The characteristics, limitations, and tracking capabilities of registered mail are determined by Swiss Post, not by Swiss Mail. For details, see [Swiss Post / ePost Service Description — insert final link].

11.3. We do not guarantee the availability of delivery confirmation, tracking information, or recipient signature records for any delivery type. The availability of such features depends on the dispatch provider's capabilities and the specific service tier selected.

11.4. Even when registered mail is selected, delivery is subject to the limitations stated in Sections 9 and 10. Registered mail may offer enhanced tracking and delivery records, but does not eliminate the inherent uncertainties of physical postal delivery.

---

## 12. Returns, Undeliverables, and Failed Dispatches

12.1. If a letter cannot be delivered and is returned to the dispatch infrastructure, handling follows Swiss Post / ePost standard return procedures. See [Swiss Post / ePost Terms — insert final link] for details on return handling.

12.2. We will communicate return or undeliverable status to you to the extent that information is made available to us by the dispatch provider.

12.3. Where a dispatch fails due to a technical error in our submission process (not caused by incorrect information provided by you), we will either re-submit the letter or offer a refund in accordance with Section 16.

12.4. We are not responsible for letters that are undeliverable due to incorrect addresses, recipient unavailability, or other circumstances outside our control.

---

## 13. Prohibited Uses

13.1. You may not use Swiss Mail for any of the following purposes:

   (a) **Fraud or impersonation**: sending letters under a false identity, impersonating another person or entity, or using fabricated sender details without authorisation;  
   (b) **Harassment, threats, or intimidation**: sending letters whose primary purpose is to threaten, harass, intimidate, or cause distress to the recipient;  
   (c) **Defamation**: sending letters containing statements that you know to be false and that are intended to harm the reputation of another person or entity;  
   (d) **Deceptive or misleading communications**: sending letters that fraudulently misrepresent facts, fabricate claims, or simulate official or governmental correspondence;  
   (e) **Unlawful debt collection practices**: sending letters that simulate legal proceedings, fabricate legal authority, or misrepresent the legal status of a claim;  
   (f) **Distribution of unlawful content**: sending letters containing content that violates applicable Swiss or European law, including but not limited to content that incites violence, promotes hatred, or violates privacy rights;  
   (g) **Bulk or automated misuse**: using the platform for mass mailings, spam, unsolicited commercial communications, or automated submission of letters without genuine individual intent;  
   (h) **Any other unlawful purpose** under applicable Swiss or European law.

13.2. We do not proactively review or screen the content of every letter submitted through our platform. We are not responsible for verifying the factual accuracy, legal correctness, or appropriateness of user-submitted content.

13.3. However, we may act on red flags, complaints, abuse signals, law enforcement requests, or policy concerns. Where we reasonably believe that a submission may violate these Terms or applicable law, we may refuse, delay, suspend, or cancel the submission and, where appropriate, report the matter to relevant authorities.

---

## 14. Suspension, Refusal, and Cancellation

14.1. We reserve the right, at our reasonable discretion, to:

   (a) refuse to process a submission before dispatch;  
   (b) suspend dispatch of a letter pending investigation;  
   (c) cancel a submission and issue a refund; or  
   (d) suspend or terminate your access to the platform,

   in any of the following circumstances:

   (i) we reasonably suspect a violation of Section 13 (Prohibited Uses);  
   (ii) we receive a credible complaint or legal demand regarding a submission;  
   (iii) the submission is technically defective or incompatible with dispatch requirements;  
   (iv) payment is not confirmed, is reversed, or is suspected of being fraudulent;  
   (v) we are required to act by applicable law, regulatory authority, or court order; or  
   (vi) continued processing would pose a material risk to the platform, other users, or third parties.

14.2. Where we refuse or cancel a submission after payment, we will issue a refund of the amount paid in accordance with Section 16, unless the refusal is due to your breach of these Terms.

14.3. We will make reasonable efforts to notify you of a refusal or suspension, but we are not obligated to disclose specific reasons where doing so would compromise an investigation, security measures, or legal obligations.

---

## 15. Fees, Payment, and Taxes

15.1. The fees for using Swiss Mail are displayed in the platform interface before you authorise payment. The total price, including any applicable taxes, is shown at checkout before you confirm your order.

15.2. All prices are in Swiss Francs (CHF).

15.3. Payment is processed through our third-party payment processor (currently Stripe). We do not handle or store your payment card details. Payment processing is subject to the payment processor's own terms.

15.4. Prices may vary depending on the delivery type, page count, and other factors as communicated in the platform. The price confirmed at checkout is the price charged.

15.5. Prices are inclusive of applicable Swiss VAT where required. If our VAT status or obligations change, prices may be adjusted accordingly, with notice.

15.6. We reserve the right to change our pricing. Price changes apply to future transactions only and do not affect orders already confirmed and paid.

---

## 16. Refund Policy

16.1. **Before dispatch submission**: If we have not yet submitted your letter for dispatch, and the dispatch has not progressed beyond the initial queuing stage, you may request a cancellation and full refund by contacting support@swissmail.ch.

16.2. **After dispatch submission**: Once your letter has been submitted to the dispatch provider, the submission cannot be reversed or recalled. We cannot retrieve letters that are in the postal system.

16.3. **Dispatch failure due to our error**: If dispatch fails due to a technical error in our systems (not due to incorrect information you provided), we will offer a full refund or re-submission at your choice.

16.4. **Dispatch rejection by provider**: If the dispatch provider rejects your submission (for example, due to an address format that cannot be processed), we will issue a full refund.

16.5. **Undeliverable letters**: If a letter is returned as undeliverable due to an incorrect address that you provided, no refund is owed. We have fulfilled our obligation by submitting the letter for dispatch.

16.6. Refunds are processed to the original payment method. Processing times depend on your payment provider and are typically 5–10 business days.

16.7. We reserve the right to withhold refunds where the submission was refused due to a violation of Section 13 (Prohibited Uses) or Section 14.

---

## 17. Limitation of Liability

17.1. **To the maximum extent permitted by Swiss law**, West Bay SA's total aggregate liability for all claims arising out of or in connection with your use of Swiss Mail is limited to the amount you paid for the specific transaction giving rise to the claim.

17.2. We are **not** liable for:

   (a) indirect, consequential, incidental, or punitive damages;  
   (b) loss of business, revenue, contracts, or anticipated savings;  
   (c) delays, failures, or errors in postal delivery by Swiss Post, ePost, or any other provider;  
   (d) consequences of inaccurate, incomplete, or unlawful content submitted by you;  
   (e) consequences of incorrect sender or recipient information provided by you;  
   (f) failure to meet statutory, contractual, or regulatory deadlines;  
   (g) legal effects or lack thereof of letters sent through our platform;  
   (h) actions or omissions of third-party providers, including but not limited to Swiss Post, ePost, Stripe, and hosting providers; or  
   (i) service interruptions, technical failures, or data loss, except to the extent caused by our intentional misconduct or gross negligence.

17.3. Nothing in these Terms excludes or limits our liability for damages caused by intentional misconduct (Vorsatz) or gross negligence (grobe Fahrlässigkeit) on the part of West Bay SA or its officers, as required by Swiss law (Art. 100 OR).

17.4. Nothing in these Terms affects your statutory rights as a consumer under mandatory Swiss law.

---

## 18. User Indemnification

18.1. You agree to indemnify and hold harmless West Bay SA, its officers, employees, and agents from and against any claims, losses, costs, or damages (including reasonable legal fees) arising from:

   (a) your breach of these Terms;  
   (b) your use of a sender identity without proper authorisation;  
   (c) unlawful, fraudulent, or defamatory content submitted by you; or  
   (d) your violation of any applicable law in connection with your use of the service.

18.2. This indemnity does not apply to the extent that the claim results from our own intentional misconduct or gross negligence.

---

## 19. Third-Party Providers and Subcontractors

19.1. We use the following categories of third-party providers to deliver our service:

   (a) **Postal dispatch providers** (currently Swiss Post / ePost): for physical production, enveloping, transport, and delivery of letters;  
   (b) **Payment processor** (currently Stripe): for payment handling;  
   (c) **Hosting and infrastructure providers**: for platform hosting, data storage, and processing;  
   (d) **AI service providers**: for AI-assisted drafting capabilities;  
   (e) **Email delivery providers**: for transactional email delivery.

19.2. We select our providers with care and require them to meet appropriate standards of security, reliability, and data protection. However, we are not liable for the acts or omissions of third-party providers beyond our reasonable control.

19.3. You acknowledge that the performance of certain aspects of the service depends on the availability, capacity, and proper functioning of third-party systems and services.

---

## 20. Data Protection and Processing

20.1. We process personal data in connection with your use of Swiss Mail in accordance with applicable Swiss data protection law (DSG) and, where applicable, the EU General Data Protection Regulation (GDPR).

20.2. Our Privacy Policy, available at [swissmail.ch/privacy], describes in detail what personal data we collect, how we use it, who we share it with, and your rights regarding your data.

20.3. By using Swiss Mail, you acknowledge that certain personal data (including sender and recipient address information) is necessarily shared with our dispatch provider for the purpose of fulfilling the postal dispatch. This sharing is an essential part of the service you request.

20.4. We retain personal data only for as long as necessary to fulfil the purposes for which it was collected, including transaction completion, dispute resolution, legal compliance, and fraud prevention. Specific retention periods are described in our Privacy Policy.

20.5. Email addresses collected at checkout are used solely for transactional communications (receipts, dispatch status, support) and are deleted in accordance with the retention policy. They are not used for marketing without your separate explicit consent.

---

## 21. Record-Keeping for Fraud Prevention and Disputes

21.1. We maintain logs of transactions, submission metadata, and system events for the purposes of fraud prevention, abuse detection, dispute resolution, and compliance with applicable legal obligations.

21.2. These logs may include: transaction references, timestamps, IP addresses, session identifiers, submission metadata, dispatch status records, and payment references. They do not include the content of your letters beyond what is needed for the signed confirmation document (see Section 22).

21.3. Log retention periods are determined by applicable legal requirements and our legitimate operational needs. Specific retention periods are described in our Privacy Policy.

---

## 22. Signed Confirmation Document and Availability

22.1. Upon successful dispatch submission, we generate a **signed confirmation document** ("Confirmation PDF") issued by West Bay SA. This document contains:

   (a) a confirmation record including: transaction reference, submission timestamp, dispatch status, sender and recipient information, delivery type, and a summary of the submitted content; and  
   (b) a copy of the final sent letter PDF and any attachments that were included in the dispatch package.

22.2. The Confirmation PDF is available for download through your confirmation page for a period of **10 days** from the date of transaction completion. After this period, the document is deleted from our systems and is no longer available for download.

22.3. A link to the Confirmation PDF is also included in the email confirmation sent to the email address you provided at checkout.

22.4. **It is your responsibility to download and save the Confirmation PDF within the 10-day availability window if you wish to retain it for your records.** We are not obligated to regenerate, extend access to, or provide copies of the Confirmation PDF after the availability period has expired, although we may do so at our discretion on a case-by-case basis for support purposes.

22.5. The Confirmation PDF confirms that a letter was submitted by West Bay SA for dispatch through the postal dispatch infrastructure. It does not constitute proof of delivery to the intended recipient.

---

## 23. Email Confirmation and Receipt

23.1. Upon successful payment, we send a **payment receipt** to the email address you provided at checkout. This receipt includes: the transaction reference, amount charged, delivery type, and a link to your order status.

23.2. The transaction reference on the receipt matches the reference on the signed Confirmation PDF, enabling you to cross-reference the receipt with the confirmed dispatch.

23.3. Additional email notifications may be sent to inform you of dispatch status updates (submission confirmation, provider acceptance, or dispatch issues). These notifications are sent to the extent that status information is available from the dispatch provider.

23.4. Email confirmations are sent as a convenience and record-keeping aid. Non-receipt of an email (due to spam filters, incorrect email address, or delivery failures) does not affect the validity of your transaction or our obligations under these Terms.

---

## 24. Changes to Services and Discontinuation

24.1. We may modify, update, or discontinue features of the Swiss Mail platform at any time. Where changes materially affect the core service (pricing, dispatch providers, data handling), we will provide reasonable notice through the platform or by email to users who have provided an email address in a recent transaction.

24.2. We may discontinue the Swiss Mail service entirely with at least 30 days' notice. In the event of discontinuation, all pending paid dispatches will be completed or refunded.

24.3. Changes to these Terms will be posted on our website with an updated effective date. Continued use of the service after the updated effective date constitutes acceptance of the revised Terms. For material changes, we will use reasonable efforts to notify active users.

---

## 25. Governing Law and Jurisdiction

25.1. These Terms are governed by and construed in accordance with the substantive laws of Switzerland, excluding the Swiss conflict-of-laws rules and the United Nations Convention on Contracts for the International Sale of Goods (CISG).

25.2. Any disputes arising out of or in connection with these Terms or your use of Swiss Mail shall be subject to the exclusive jurisdiction of the competent courts at the registered seat of West Bay SA, subject to any mandatory consumer forum provisions under Swiss law.

25.3. If you are a consumer domiciled in Switzerland, you may also bring proceedings at your place of domicile in accordance with Art. 32 ZPO (Swiss Code of Civil Procedure).

---

## 26. General Provisions

26.1. If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions shall remain in full force and effect. The invalid provision shall be replaced by a valid provision that most closely reflects the economic purpose of the invalid provision.

26.2. Our failure to enforce any right or provision of these Terms does not constitute a waiver of that right or provision.

26.3. These Terms, together with our Privacy Policy and any specific terms presented during the checkout process, constitute the entire agreement between you and West Bay SA regarding your use of Swiss Mail.

26.4. You may not assign or transfer your rights or obligations under these Terms without our prior written consent. We may assign our rights and obligations under these Terms to a successor entity in connection with a merger, acquisition, or sale of all or substantially all of our assets.

---

## 27. Contact and Complaints

27.1. For questions, support requests, or complaints regarding Swiss Mail:

   **West Bay SA**  
   [Registered address]  
   [City, postal code], Switzerland  

   **Email:** support@swissmail.ch  
   **Website:** swissmail.ch

27.2. We aim to respond to support requests within 2 business days. Complaints regarding dispatch issues will be investigated in coordination with our dispatch provider where necessary.

27.3. If you are not satisfied with our response to a complaint, you may exercise your rights under applicable Swiss law, including bringing proceedings before the competent courts as described in Section 25.

---

*These Terms and Conditions are provided in English. In the event of a discrepancy between language versions, [specify controlling language version once multilingual versions are published].*

---

## PART 6 — Red Flags / Follow-Up Issues

### Clauses to Validate with Swiss Counsel

1. **Section 2 (Platform nature):** The characterisation of West Bay SA as not being a postal operator should be reviewed against the Postgesetz (PG), particularly Art. 2 and Art. 4. Counsel should confirm that the described business model does not trigger licensing or notification requirements.

2. **Section 9 (No deadline guarantee):** The breadth of this exclusion should be validated for enforceability under Swiss consumer protection law. Art. 8 UWG (unfair terms in standard contracts) may limit the scope of certain disclaimers.

3. **Section 17 (Liability):** The per-transaction liability cap must be reviewed for reasonableness under Swiss law. Art. 100 OR prohibits exclusion of liability for intentional and grossly negligent acts — the current draft preserves this, but counsel should confirm the specific wording.

4. **Section 18 (Indemnification):** Consumer indemnification clauses may face enforceability challenges under Swiss law. Counsel should review whether this clause is proportionate and enforceable for consumer users.

5. **Section 25 (Jurisdiction):** The mandatory consumer forum provision (Art. 32 ZPO) is referenced, but counsel should confirm the exact scope and whether additional protective provisions are needed for consumer transactions.

6. **Section 22 (10-day availability):** Counsel should confirm that the 10-day document retention period is sufficient for any applicable record-keeping obligations, particularly regarding tax receipts and consumer rights.

### Points to Align with Swiss Post / ePost Contractual Setup

1. **Section 8.3 placeholder links:** The references to Swiss Post / ePost Terms and Service Descriptions need to be populated with actual URLs once the commercial relationship is formalised.

2. **Attachment handling (Section 5.4):** The Terms currently allow for attachments. The actual attachment capability at dispatch depends on Swiss Post's API and service specifications. If attachments cannot be supported at launch, the Terms should be adjusted or the relevant clauses deferred.

3. **Registered mail specifics (Section 11):** The description of registered mail capabilities (tracking, delivery confirmation, recipient signature) must be validated against what Swiss Post actually provides through the ePost API, not assumed from general knowledge.

4. **Returns handling (Section 12):** The Terms reference Swiss Post return procedures. The actual mechanism for receiving return/undeliverable notifications from Swiss Post via the ePost API must be confirmed before these commitments are made.

5. **Status communication (Section 8.4):** The granularity of dispatch status updates depends entirely on what the Swiss Post / ePost API exposes. The Terms should only promise what can actually be delivered.

### Assumptions Made

1. **West Bay SA is the correct contracting entity.** The Terms are drafted assuming West Bay SA is the entity that will operate Swiss Mail and hold the Swiss Post / ePost commercial relationship.

2. **Swiss VAT applies.** The Terms assume West Bay SA is or will be VAT-registered in Switzerland. If not, the VAT language in Section 15 should be adjusted.

3. **No B2B-specific provisions.** The Terms are drafted for consumer use. If B2B customers are in scope, additional provisions may be needed (e.g., different liability regime, no consumer forum).

4. **English is the primary drafting language.** The Terms should be translated into de-CH, fr-CH, and it-CH before publication. Counsel should determine which language version controls in case of discrepancy.

5. **The signed summary PDF is generated by the backend, not a third-party signing service.** The "signed" quality refers to a West Bay SA–issued document with integrity verification (hash, metadata), not a qualified electronic signature under ZertES.

### Product/UX Wording That Should Match the Terms

| UX Element | Terms Clause | Alignment Needed |
|---|---|---|
| Checkout legal checkbox text | Section 4.2 + Section 9 | The checkbox wording must accurately reference the Terms and the non-legal-service disclaimer |
| "Submitted for dispatch" confirmation copy | Section 4.3 | Never say "sent" or "delivered" — use "submitted for dispatch" consistently |
| Signed PDF download card heading | Section 22 | Use "Signed confirmation document" in both UX and Terms |
| 10-day expiry notice | Section 22.2 | The UX must show both relative and absolute expiry dates, matching the Terms commitment |
| Email receipt subject line | Section 23 | The transaction reference format (SM-XXXXXXXX) must match between receipt, Confirmation PDF, and Terms |
| Dispatch status labels | Section 8.4, Section 9 | All status labels must align with the canonical `DispatchState` values and the honest-language rules in the Terms |
| "Not a legal service" disclaimer | Section 9.3 | The drafting workspace and checkout should include calm informational copy that mirrors Section 9.3 |
| Refund policy reference | Section 16 | The checkout flow should include a visible link or reference to the refund policy |
| Sender identity warning | Section 7.2 | If the user enters sender details that differ from their session identity, the UX should show a calm reminder consistent with Section 7 |
