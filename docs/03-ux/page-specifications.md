# Swiss Mail — Page Specifications

> **Status:** Canonical wireframe-level specs. Implement from this document.  
> **Scope:** Current launch routes — marketing + guest application + admin. Future account surfaces stay out of this file until they enter scope.  
> **Stack:** Next.js · TypeScript · Tailwind CSS · shadcn/ui primitives + custom product components  
> **Last updated:** 2026-03  
> **Brand identity:** `Swiss Mail` on `swissmail.ch` (see `02-brand/naming-and-identity.md`)
> **Provider truth:** For any claim about dispatch timing, tracking, references, or Swiss Post
> behavior, also consult [`../08-guardrails/swiss-post-api-reference-map.md`](../08-guardrails/swiss-post-api-reference-map.md).

---

## Table of Contents

### Marketing Pages
1. [Homepage (`/`)](#1-homepage-)
2. [How It Works (`/how-it-works`)](#2-how-it-works-how-it-works)
3. [Pricing (`/pricing`)](#3-pricing-pricing)
4. [Use-Case Landing Pages (`/use-cases/:slug`)](#4-use-case-landing-pages-use-casesslug)

### Application Pages
5. [Draft Entry (`/draft/new`)](#5-draft-entry-draftnew)
6. [Draft Workspace (`/draft/:id`)](#6-draft-workspace-draftid)
7. [Review (`/draft/:id/review`)](#7-review-draftidreview)
8. [Checkout (`/draft/:id/checkout`)](#8-checkout-draftidcheckout)
9. [Confirmation (`/draft/:id/confirmation`)](#9-confirmation-draftidconfirmation)
10. [Guest Resume and Order Status Entry Points](#10-guest-resume-and-order-status-entry-points)

### Discovery Pages
11. [Templates Gallery (`/templates`)](#11-templates-gallery-templates)

### Utility Pages
12. [Error Pages (404, 500)](#12-error-pages-404-500)
13. [Legal Pages (`/privacy`, `/terms`, `/imprint`)](#13-legal-pages-privacy-terms-imprint)

### Admin
14. [Admin Dashboard (`/{locale}/admin/*`)](#14-admin-dashboard-localeadmin)

---

## Conventions Used in This Document

## Global Experience Bar

Every route in this document must feel like leverage, not administration. The user should feel
"how was I doing this manually before?" rather than "I am filling out a nicer form."

Global requirements for every core route:

- One obvious next action. No screen should make the user choose between multiple competing primary paths.
- Ask only for missing facts. Never make the user restate information the system already knows.
- Keep the preview or resulting artifact within immediate reach. Desktop: visible by default where relevant. Mobile: reachable in one clear gesture.
- Show progress immediately. Taps, submits, and transitions must acknowledge input right away; async steps must not leave the user staring at a blank wait state.
- Reduce legal and formatting burden. The product should absorb Swiss formal-letter structure, not push that cognitive work back onto the user.
- Preserve momentum. No avoidable dead ends, reset traps, or hidden state loss between draft, review, checkout, and confirmation.
- Respect stress. Error and warning states must be calm, specific, and solvable in one pass.
- **Dark mode is in MVP scope.** The product ships with an explicit user theme toggle and class-based dark mode. The toggle appears in the primary site chrome and in the draft workspace menu, persists per user on the current device, and respects system preference only as the first-load default. The letter preview remains visually light even when the rest of the UI is dark.

### Layout components
| Key | Description |
|-----|-------------|
| `<MarketingLayout>` | Full-width marketing shell: `<SiteHeader>` + content + `<SiteFooter>` |
| `<AppLayout>` | Application shell: minimal sticky header, no marketing footer |
| `<MinimalLayout>` | Stripped shell for checkout and confirmation — reduces distraction |
| `<AdminLayout>` | Sidebar + top bar, restricted to admin role |

### Component naming
Follows the conventions from `../05-architecture/frontend-architecture.md`:
- `components/ui/` — shadcn-derived primitives: `Button`, `Input`, `Textarea`, `Badge`, `Accordion`, `Card`, `Sheet`, `Dialog`, `Separator`, `Progress`, `Skeleton`, `Tooltip`
- `components/product/` — product flows: `DraftWorkspace`, `ConversationPanel`, `LetterPreview`, `ZoneEditor`, `DeliverySelector`, `PriceSummary`, `AttachmentUploader`, `SignaturePicker`, `DispatchStatusCard`, `DispatchConfirmation`, `StepIndicator`, `FieldExtractionCard`, `QuickReplyChips`
- `components/marketing/` — marketing: `HeroBlock`, `TrustStrip`, `HowItWorksSteps`, `UseCaseGrid`, `EntryCard`, `PricingCard`, `FAQAccordion`, `ConfidenceBlock`, `FinalCTABand`, `SiteHeader`, `SiteFooter`
- `components/icons/` — custom: `<LetterIcon>`, `<SwissCrossIcon>`

### Emotional intent shorthand
Each page documents the **emotional intent** — the feeling the user should have, not just the information they see.

---

## 1. Homepage (`/`)

### Route
`/`

### SEO
- **Title:** `Swiss Mail — Send formal Swiss letters from your phone`
- **Meta description:** `Draft, review, and send formal letters in Switzerland — in minutes. AI-assisted drafting, postal delivery, and careful data handling.`
- **OG image:** Hero mockup, navy background, product screenshot
- **Structured data:** `Organization`, `WebSite` with `SearchAction`, `FAQPage` (for FAQ section)
- **Canonical:** `https://swissmail.ch/`

### Layout
`<MarketingLayout>` — `<SiteHeader>` with transparent overlay on hero, transitions to solid on scroll.

### Emotional intent
**Wow, this is exactly what I needed.** First-time visitor must immediately understand the product, trust it, and feel an impulse to start. The page should feel premium and calm — not a startup pitch deck. The letter metaphor is present but not costume.

---

### Sections (top to bottom)

#### 1.1 `<SiteHeader>`
- Logo (`<LetterIcon>` + `Swiss Mail` wordmark) — left
- Nav links: "How it works", "Pricing", "Use cases" — desktop only, hidden mobile
- Right: Language selector (`de`, `fr`, `it`, `en`) + "Start writing" Button (primary, small)
- Mobile: Logo left, hamburger right; nav slides in as Sheet
- Transparent on hero, `surface` background + `border` bottom border on scroll (sticky)
- **Accessibility:** `role="banner"`, skip-to-main link hidden until focused

#### 1.2 Hero — `<HeroBlock>`
Full-viewport section (`min-h-screen`).

**Background:** Radial gradient — `primary` (#1E3A5F) at bottom-left, slate-900 at top-right. Subtle grid overlay (2px lines, 5% opacity white). No photography.

**Content — left column (desktop) / stacked (mobile):**
- Pre-headline badge: `<Badge variant="outline">` "New — AI-assisted drafting" in `accent-light` background
- Headline: `text-4xl md:text-6xl font-bold text-inverse` — "Send formal letters  
  from your phone — in minutes."
  - Line break after "letters" on desktop. Single block on mobile.
- Subheadline: `text-lg text-inverse/80` — "Describe what you need. Swiss Mail drafts it, formats it to Swiss standards, and prepares it for postal dispatch."
- CTA row:
  - Primary: `<Button size="lg">` "Draft your letter" → `/draft/new` — full width on mobile
  - Secondary: `<Button variant="outline" size="lg">` "See how it works" → `/how-it-works` — full width on mobile, ghost treatment on dark bg
- Trust micro-line: `text-sm text-inverse/60` — "No account required · Transparent pricing before payment"

**Content — right column (desktop only):**
- Floating `<LetterPreview>` mockup — static screenshot of a formatted letter card
- Slight rotation (-2deg), `shadow-paper` elevation, gentle float animation (`translateY` ±8px, 4s ease-in-out loop)
- Masked at bottom edge by gradient fade

**Mobile behaviour:**
- Right column (mockup) appears below CTA row, cropped to ~50% height
- Headline font: `text-4xl` (not 6xl)
- Both buttons stack vertically, full width

**Loading state:** None — hero is static/SSG, no skeleton needed  
**Error state:** Not applicable

#### 1.3 Trust Strip — `<TrustStrip>`
Horizontal bar, `surface` background, `border` top/bottom, `py-4`.

Items (left to right, `gap-8`, centered):
1. `<SwissCrossIcon>` + "Privacy-conscious infrastructure"
2. Envelope icon + "Postal delivery"
3. Lock icon + "Encrypted in transit and at rest"

**Mobile:** Items scroll horizontally with `overflow-x-auto`, faded edges. No wrapping.  
**Tone:** Muted `text-secondary`, not flashy. Reassurance, not celebration.

#### 1.4 How It Works — `<HowItWorksSteps>`
Section heading: `text-3xl font-semibold text-primary` "How it works"  
Subheading: `text-secondary` "Three steps. No paperwork knowledge required."

3-step cards in a horizontal row (desktop) / vertical stack (mobile):

| Step | Icon | Title | Body |
|------|------|-------|------|
| 1 | `MessageCircle` (Lucide) | "Describe your letter" | "Type or dictate what you need. Swiss Mail asks only what's missing." |
| 2 | `FileText` | "Review and customise" | "See your letter take shape in real time. Edit any section directly." |
| 3 | `Send` | "Pay and send" | "Choose standard or registered post. Pay by card. We handle the rest." |

Each card: `<Card>` with icon in `primary-light` circle, step number badge (`accent`), title `font-semibold`, body `text-secondary text-sm`.

**Connector line:** Dashed line between cards on desktop, hidden on mobile.

#### 1.5 Differentiator — `<ConfidenceBlock>`
Section heading: "Not just another mailing service"  
Two-column layout (desktop) / stacked (mobile).

Left: prose block explaining AI drafting, dictation input, guided process, and Swiss-standard formatting.  
Right: 3–4 feature highlights with checkmark icons:
- "Understands Swiss formal letter conventions"
- "Drafts from a sentence — not a blank page"
- "Dictate on the go, edit on desktop"
- "No account required to send your first letter"

**Tone:** Calm confidence. No competitor naming. No superlatives.

#### 1.6 Use Cases — `<UseCaseGrid>`
Section heading: "What people send"

Grid: 3 columns (desktop) / 2 columns (tablet) / 1 column (mobile)

`<EntryCard>` for each use case:

| Slug | Icon | Title | Subtext |
|------|------|-------|---------|
| `lease-cancellation` | `Home` | "Lease cancellation" | "End your rental agreement on the right legal footing" |
| `insurance-cancellation` | `Shield` | "Insurance cancellation" | "Cancel any policy with a compliant written notice" |
| `contract-termination` | `FileX` | "Contract termination" | "Terminate service contracts, subscriptions, or agreements" |
| `formal-complaint` | `Megaphone` | "Formal complaint" | "Lodge a complaint that gets taken seriously" |
| `official-correspondence` | `Stamp` | "Official correspondence" | "Write to authorities, municipalities, or government offices" |
| `demand-letter` | `AlertCircle` | "Demand letter" | "Request what you're owed — clearly, formally, in writing" |

Each card: icon in `accent-light` circle, title `font-medium`, subtext `text-secondary text-sm`, subtle "Write this letter →" link (`text-primary`).  
Clicking card → `/use-cases/{slug}`.

#### 1.7 Pricing — `<PricingCard>`
Section heading: "Simple, transparent pricing"  
Single card (max-width `lg`, centred):

- Headline price: "From **{formattedBasePrice}** per letter" — `text-4xl font-bold`
- `<Badge>` "No subscription" (accent colour)
- Line-item table:
  - Base service fee — {formattedBasePrice}
  - Standard delivery — included
  - Registered delivery — + {formattedRegisteredSurcharge}
- Note: `text-xs text-secondary` "Prices include VAT where applicable."
- CTA: `<Button size="lg" className="w-full">` "Start your letter" → `/draft/new`

> **Implementation note:** Do not hardcode prices. Read them from the backend pricing config and format them through the shared CHF formatter.

#### 1.8 Trust & Security — `<ConfidenceBlock variant="trust">`
Section heading: "Your documents. Your data."  
3-column icon+text blocks (desktop) / stacked (mobile):
1. Server icon — "Privacy-conscious infrastructure" — `text-secondary text-sm`
2. Lock icon — "Encrypted in transit and at rest"
3. Trash2 icon — "Automatically deleted after the approved retention period" — do not hardcode duration

Calm, reassuring. No fear language. `surface-subtle` background, `border` top/bottom.

#### 1.9 FAQ — `<FAQAccordion>`
Section heading: "Common questions"

6–8 questions. Suggested starters (final copy via i18n layer — see `../05-architecture/i18n-rules.md`):

1. "Is Swiss Mail legally valid?" — Answer: clarifies formal letter vs. legal service. Non-legal-service disclaimer (see `../01-vision/product-scope.md`).
2. "What happens after I pay?"
3. "Can I send registered mail?"
4. "Are my documents stored permanently?"
5. "What languages are supported?"
6. "What if my letter is returned or undeliverable?"
7. "Do I need an account?"
8. "Can I upload my own PDF?"

Structured data: `FAQPage` schema wrapping all items. Each `AccordionItem` maps to one `Question`/`Answer` pair.

#### 1.10 Final CTA Band — `<FinalCTABand>`
Full-width section, `primary` background, `text-inverse`.

- Headline: `text-3xl font-bold` — "Ready to send your letter?"
- Subtext: `text-inverse/80 text-lg` — "Draft it in minutes. Deliver it like a professional."
- `<Button size="xl" variant="accent">` "Draft your letter now" → `/draft/new`

**Mobile:** Stacked, button full width.

#### 1.11 `<SiteFooter>`
Multi-column grid (desktop) / stacked accordion (mobile):

| Column | Links |
|--------|-------|
| Product | How it works, Pricing, Use cases |
| Legal | Privacy policy, Terms of service, Imprint |
| Support | FAQ, Contact |
| Languages | de · fr · it · en |

Bottom row: Copyright line, `<SwissCrossIcon>` "Built for Switzerland" note, social links (if applicable).  
Background: `surface-subtle`, `border-strong` top border.

---

### Responsive Summary — Homepage

| Breakpoint | Hero | Steps | Use Cases | Pricing |
|------------|------|-------|-----------|---------|
| mobile (<768px) | Stacked, mockup below CTA | Vertical stack | 1 col | Full-width card |
| tablet (768–1024px) | 50/50 split | 3-col horizontal | 2 col | Centred card |
| desktop (>1024px) | 55/45 split + float mockup | 3-col with connectors | 3 col | Centred card |

---

### Accessibility — Homepage
- Skip-to-main link at top of `<body>`
- Hero headline is `<h1>`; all section headings follow logical `<h2>` / `<h3>` hierarchy
- Trust strip items: `aria-label` on each icon+text pair
- FAQ: `<Accordion>` uses `aria-expanded`, `aria-controls`, `role="region"`
- Floating mockup: `aria-hidden="true"` (decorative)
- All CTAs: descriptive text ("Draft your letter", not "Click here")
- Focus ring: visible at all interactive elements, uses `ring-primary` token

---

## 2. How It Works (`/how-it-works`)

### Route
`/how-it-works`

### SEO
- **Title:** `How Swiss Mail works — AI-assisted formal letters`
- **Meta description:** `See exactly how Swiss Mail drafts, formats, and sends your Swiss formal letters — step by step.`
- **Structured data:** `HowTo` schema

### Layout
`<MarketingLayout>`

### Emotional intent
**I understand exactly what happens — I'm ready to try it.** This page converts the curious into the committed. It should be more detailed than the homepage strip, but still light and readable.

---

### Sections

#### 2.1 `<SiteHeader>` (same as homepage, solid from the start)

#### 2.2 Page Hero
Narrower hero, no full-viewport. `py-20`.
- Breadcrumb: `Home > How it works`
- Heading `<h1>`: "How Swiss Mail works"
- Subheading: "From first word to letterbox — here's what happens at every step."

#### 2.3 Detailed Steps
Alternating two-column rows (icon/illustration left + text right, then flip):

**Step 1 — Start your letter**
- User types or dictates their intent ("I need to cancel my gym membership")
- Swiss Mail recognises the letter type and surfaces the right template logic
- System asks only for what's missing (recipient details, dates, contract reference)
- Illustration: chat-like interface mockup

**Step 2 — Review in real time**
- Letter preview updates as the user provides information
- User can click any zone to edit directly
- Attachments can be added (PDF pages, signature)
- Illustration: split-panel workspace mockup

**Step 3 — Choose delivery**
- Standard post or registered mail (brief explanation of each)
- Price shown clearly
- Illustration: delivery selector UI

**Step 4 — Pay**
- Stripe payment form
- Email provided for receipt and tracking updates
- No account required
- Illustration: checkout card

**Step 5 — We handle the rest**
- Swiss Mail renders the final PDF
- Submits to postal dispatch
- User receives reference number
- Status updates as available (honest: "We will show tracking information when the provider makes it available")
- Illustration: confirmation screen

#### 2.4 FAQ Strip
3–4 questions most relevant to the "how it works" context.

#### 2.5 CTA Band
"Start your first letter — takes about 5 minutes."  
`<Button>` → `/draft/new`

#### 2.6 `<SiteFooter>`

---

### Loading / Error / Empty States
- Page is fully static (SSG). No dynamic loading states.
- If illustrations fail to load: `alt` text describes the step clearly.

### Accessibility
- `<h1>` on page title, `<h2>` on each step number/title
- Illustrations: `role="img"` with descriptive `aria-label`
- Alternating layout does not break reading order in DOM — visual alternation is CSS-only

---

## 3. Pricing (`/pricing`)

### Route
`/pricing`

### SEO
- **Title:** `Pricing — Swiss Mail`
- **Meta description:** `Transparent per-letter pricing. No subscription, no surprise fees. Standard and registered postal delivery options.`
- **Structured data:** Could include `Offer` / pricing schema when prices are locked

### Layout
`<MarketingLayout>`

### Emotional intent
**No tricks. I know exactly what I'll pay.** Pricing anxiety is high in postal services. The page must preempt every question about cost.

---

### Sections

#### 3.1 Hero
- `<h1>` "Simple, honest pricing"
- Subheading: "One letter. One clear price. No surprise line items."
- Primary price badge: "From {formattedBasePrice}" — large, `accent` colour

#### 3.2 Pricing Breakdown Card
Full pricing card (same as homepage pricing section but expanded):

**Line items with explanatory tooltips:**
- Base service fee: {formattedBasePrice} — `<Tooltip>` "Includes drafting assistance, formatting, PDF generation, and standard delivery"
- Standard delivery: included
- Registered mail (Einschreiben / Recommandé): + {formattedRegisteredSurcharge} — `<Tooltip>` "Requires recipient signature. Show a reference only if the chosen provider supports it."
- VAT note

**Comparison table — Standard vs Registered:**

| Feature | Standard | Registered |
|---------|----------|------------|
| Service level wording | Standard postal delivery | Registered postal delivery |
| Provider reference / tracking | Only if the provider supplies it | Only if the provider supplies it |
| Confirmation language | Never imply tracking by default | Stronger wording only when the provider confirms it |
| Price | {formattedStandardPrice} | {formattedRegisteredPrice} |

> **Note:** Delivery estimates and tracking capability must not be fabricated. See `../08-guardrails/provider-certainties.md`. If the provider cannot supply deterministic wording, omit it.

#### 3.3 What's Included
Icon+text list:
- AI drafting assistance
- Swiss-standard letter formatting
- PDF render
- Printing and postal dispatch
- Reference number for your records
- Email confirmation

#### 3.4 What's Not Included
Honest section — builds trust:
- Legal advice or review
- Guaranteed delivery outcomes
- Translation (letters drafted in the language you write in)

#### 3.5 FAQ (Pricing-specific)
- "Do I pay if my letter is rejected?" (dispatch rejection scenario — honest answer)
- "Can I get a refund?"
- "Are there volume discounts?"
- "Is VAT included in the prices shown?"

#### 3.6 CTA Band
"Try it — you only pay when you're ready to send."  
→ `/draft/new`

#### 3.7 `<SiteFooter>`

---

### Loading State
Prices fetched from config/API: show `<Skeleton>` blocks in place of CHF amounts until loaded. Do not show CHF 0.00 as a fallback.

### Error State
If pricing data unavailable: show a muted notice "Pricing information is temporarily unavailable. Please try again shortly." Do not fabricate prices.

---

## 4. Use-Case Landing Pages (`/use-cases/:slug`)

### Route
`/use-cases/:slug`  
Valid slugs: `lease-cancellation`, `insurance-cancellation`, `contract-termination`, `formal-complaint`, `official-correspondence`, `demand-letter`

### SEO (template — populated per slug)
- **Title:** `{useCaseTitle} — Swiss Mail`
- **Meta description:** `Draft and send {useCaseDescription} in minutes with Swiss Mail. AI-assisted and ready for postal dispatch.`
- **Structured data:** `HowTo`, `FAQPage`
- **Canonical:** `https://swissmail.ch/use-cases/{slug}`

### Layout
`<MarketingLayout>`

### Emotional intent
**This is exactly my situation. I'm in the right place.** The user arrived from search or a specific link. The page must affirm their context and make the first step frictionless.

---

### Sections

#### 4.1 Hero (use-case specific)
- `<h1>` — e.g. "Cancel a subscription — fast, formal, correct."
- Subheading specific to this letter type
- Primary CTA: "Draft my {useCaseCtaLabel}" → `/draft/new?useCase={slug}`
- Illustration or mockup of a relevant letter (anonymised, no real data)

#### 4.2 "How this works for {useCaseTitle}"
Adapted step sequence with use-case-specific language:
- Step 1: "Tell us who you're cancelling with and when"
- Step 2: "Review your letter — formatted to Swiss standards"
- Step 3: "Send for postal dispatch in one flow"

#### 4.3 Sample Letter Snippet
A truncated, clearly anonymised excerpt of the type of letter produced.
- `<Card>` styled like `<LetterPreview>` — `paper` background, serif font
- Redacted fields shown as `████████` or `[Recipient Name]`
- Caption: `text-xs text-secondary` "Example only — your letter will be personalised."
- Not a full letter — just enough to establish trust and format recognition

#### 4.4 Pricing (same card as `/pricing`)

#### 4.5 FAQ (use-case specific)
3–5 questions specific to the letter type.

#### 4.6 CTA Band

#### 4.7 Related Use Cases
Horizontal scroll of `<EntryCard>` components linking to other slugs.

#### 4.8 `<SiteFooter>`

---

### Empty / Error States
- 404 for unknown slugs: redirect to `/` or custom 404 page with "Use case not found" and link to use-case grid
- If slug is valid but content not yet written: show generic use-case template, not a broken page

### Accessibility
- `<h1>` matches use-case name
- Sample letter snippet: `aria-label="Example letter — anonymised"`, `role="region"`

---

## 5. Draft Entry (`/draft/new`)

### Route
`/draft/new`  
Optional query param: `?useCase={slug}` — pre-fills context

### SEO
- `noindex` — application page, not for search indexing
- **Title:** `Draft a new letter — Swiss Mail`

### Layout
`<AppLayout>` — minimal. No marketing footer. Sticky header with logo and language selector only.

### Emotional intent
**This is easy. I know exactly what to do.** The user has committed to starting. The entry screen must be clear, focused, and low-friction. One primary action. No decision paralysis.

---

### Sections

#### 5.1 App Header
Logo left. Language selector right. No nav links.  
On mobile: same, compact.

#### 5.2 Entry Screen (full-screen, centred content)

If an unfinished guest draft exists within the current session TTL, this section switches to a recovery card before any new draft is created:
- Heading: "You have an unfinished letter"
- Supporting copy explains the user can continue where they left off or begin again without losing the older draft
- Primary CTA: "Continue draft" → `/draft/:id`
- Secondary CTA: "Start fresh" → creates a new guest session and new draft
- Optional metadata line: last updated timestamp in the current locale

The product must not silently redirect returning users into an old draft from `/draft/new`. Recovery is explicit and reversible.

**Primary path — text input:**
- Heading: `text-2xl font-semibold` "What kind of letter do you need?"
- Large `<Textarea>` or styled `<Input>` — placeholder: "e.g. I need to cancel my gym membership at Migros Sport from next month"
- `<Button size="lg">` "Start drafting" → submits, creates session, navigates to `/draft/:id`
- Dictation button: `<Button variant="ghost" size="icon">` with `Mic` icon — prominent on mobile, visible on desktop
  - On click: activates browser speech-to-text; fills the input
  - State: idle / listening (pulsing indicator) / processing

**Secondary path — quick-start cards:**
Section below input, `<Separator>` with "or choose a common type":
`<UseCaseGrid>` — compact card grid, 2 cols mobile / 3 cols tablet / 4 cols desktop
Clicking a card: sets `useCase` context, navigates directly to `/draft/:id` with pre-loaded context

**Tertiary path:**
Helper text only: `text-sm text-secondary` "Need to include supporting files? You can add attachments after your draft is ready."  
Do not offer a competing "upload a PDF instead" path here. The consumer MVP starts from guided drafting, not from document upload.

#### 5.3 Guest notice (if applicable)
`text-xs text-tertiary` at bottom: "No account needed. Your session is saved for {configuredSessionRetentionLabel}."  
`configuredSessionRetentionLabel` is a localized duration string derived from `SESSION_TTL_HOURS`
(locked default: 72 → displays as "72 hours" or equivalent locale form). Do not hardcode the
display string — compute from config. See [`open-decisions.md`](../08-guardrails/open-decisions.md)
§4 and [`i18n-rules.md`](../05-architecture/i18n-rules.md) for formatting conventions.

---

### Loading State
After "Start drafting" submit:
- Button shows spinner, disabled
- Navigates to `/draft/:id` once session created
- If session creation fails: inline error below button (validation error family)

### Error States
- Session creation failure: `<ErrorBanner>` "We couldn't start your draft. Please try again."
- Speech-to-text unavailable: keep the microphone affordance visible but disabled or explanatory, with clear copy such as "Voice input unavailable in this browser"
- Network offline: `<ErrorBanner>` "No connection. Please check your internet and try again."

### Empty State
The textarea starts empty and focused. Placeholder text provides guidance. No skeleton needed.

### Accessibility
- `<h1>` "Start your letter"
- `<Textarea>` has `aria-label="Describe the letter you need"`
- Dictation button: `aria-label="Start voice input"`, `aria-pressed` for active state
- Quick-start cards: keyboard navigable, `role="button"` or `<button>`, descriptive labels
- Focus is set to the textarea on page load (`autoFocus`)
- Recovery card buttons are reachable by keyboard and announced distinctly as "Continue draft" and "Start fresh"

---

## 6. Draft Workspace (`/draft/:id`)

### Route
`/draft/:id`  
`:id` — session/draft UUID

### SEO
- `noindex, nofollow`
- **Title:** `Drafting your letter — Swiss Mail`

### Layout
`<AppLayout>` — modified for workspace. No footer. Sticky header with step indicator and price summary.

### Emotional intent
**I'm in control. This is going exactly where I want.** The workspace is the core product experience. It must feel fluid, intelligent, and responsive. The user should feel guided without feeling railroaded. The letter preview must feel like the real thing.

---

### The First 30 Seconds

This is the most critical UX window in the entire product. The user has committed — they typed their intent and hit "Start drafting". The next 30 seconds determine whether this feels like magic or like another form wizard. Every millisecond of perceived latency, every word of the AI's first response, matters.

**Timeline:**

| Time | What happens | What the user sees |
|------|-------------|-------------------|
| 0s | Navigation starts | Instant route change. No full-page loading screen. |
| 0–0.3s | Layout renders | Skeleton conversation panel (left) + blank letter template outline (right). On mobile: skeleton conversation panel only. The letter template outline shows faint zone placeholders (sender, recipient, body) — it looks like an empty page waiting to be filled, not a loading state. |
| 0.3–1s | Session context loaded | If `?useCase=` param present: system message appears — `"Letter type: Lease cancellation"` — centered, `text-tertiary text-xs`. The AI's typing indicator starts (3-dot pulse). |
| 1–2.5s | AI first message arrives | The AI's welcome message fades in (200ms). The typing indicator is replaced. See "First AI Message" below. |
| 2.5–4s | Quick-reply chips appear | `<QuickReplyChips>` stagger in (50ms per chip, 200ms fade) below the AI message. These are contextual — see "First Quick Replies" below. |
| 4–8s | User responds (typical) | User either types, taps a chip, or uses voice. The moment user input is submitted, the AI typing indicator appears within 100ms. |
| 8–15s | First field extraction | `<FieldExtractionCard>` appears in conversation, showing what the AI understood. Fields animate in as key-value pairs. |
| 15–25s | **First draft appears in preview** | This is THE wow moment. See "First Draft Reveal" below. The letter preview transitions from blank template to populated content. On mobile, the Preview toggle gains a visible update signal so the user notices the letter is ready to inspect. |
| 25–30s | Refinement begins | AI sends a follow-up: "I've drafted your letter. Take a look — anything you'd like to change?" Quick-reply chips: "Looks good", "Make it more formal", "Change the tone", "I want to edit the [section]" |

**Perceived latency rule:** The user must never stare at an empty screen for more than 300ms. Skeletons appear instantly. The AI typing indicator must appear within 100ms of the user sending a message. If the AI response takes longer than 3 seconds, show a contextual "thinking" label below the typing indicator (e.g., "Drafting your letter…" or "Researching the right format…").

#### First AI Message

The AI's first message varies by entry path:

**Path A — Free-text entry** (user typed "I need to cancel my gym membership"):
> "Got it — a cancellation letter for your gym membership. I'll need a few details to get this right. First: **what's the name and address of the gym?**"

**Path B — Use-case entry** (user came from `/use-cases/lease-cancellation`):
> "Let's draft your lease cancellation letter. To get started: **what's the landlord's name and address?**"

**Path C — Empty entry** (user arrived at `/draft/new` without context, typed nothing specific):
> "What kind of letter do you need to send? Describe the situation in your own words — I'll take it from there."

Key rules for the AI's first message:
- **One question at a time.** Never ask for multiple unrelated fields in the first message. Exception: name + address can be grouped because they form a logical unit.
- **Bold the question.** The primary question in each AI message is wrapped in `**bold**` so it's visually scannable.
- **No preamble.** Don't start with "Hello! I'm here to help you..." — get to the point.
- **Acknowledge the user's input.** Mirror back what they said in 5 words or fewer before asking the first question.
- **Locale-appropriate.** The AI message language matches the user's selected locale. The greeting style follows the formality norms in `voice-and-tone.md` §5 (formal "Sie/Vous/Lei" in the AI's responses).

#### First Quick Replies

Contextual chips that appear after the AI's first message:

**After Path A/B** (context known):
- "I have the address ready" (pre-fill signal — opens address input inline)
- "I'm not sure of the address" (AI pivots to ask for the company/recipient name only)
- "I need something different" (resets context)

**After Path C** (no context):
- Quick-start chips matching the top use cases: "Cancel a subscription", "End a lease", "Send a formal complaint", "Write to an authority", "Something else"

Chip visual: `<Badge variant="outline" className="cursor-pointer hover:bg-primary-light">` — see component-library.md `QuickReplyChips` for full spec.

#### First Draft Reveal

This is the emotional climax of the drafting flow. When the AI has gathered enough information (typically after 2–3 exchanges), it generates a full letter draft. The reveal must feel like a moment of delight:

**Desktop:**
1. The LetterPreview panel, which has been showing a blank template outline, receives the content.
2. Content appears zone-by-zone from top to bottom: sender block → recipient block → date → subject → body → closing → signature placeholder.
3. Each zone fades in (200ms, ease-out) with a 100ms stagger between zones.
4. Total reveal duration: ~800ms.
5. A subtle `shadow-paper` elevation increase animation (from `shadow-sm` → `shadow-paper`, 300ms) accompanies the content fill — the "page" feels like it's becoming real.
6. System message in conversation: `"Your letter is ready to review"` — centered, `text-tertiary`.

**Mobile:**
1. The Preview toggle receives a badge/update signal.
2. The user switches from `Write` to `Preview` using the segmented workspace toggle directly below the step strip.
3. The preview panel replaces the conversation panel, where content is already fully populated.

**Anti-hallucination rule:** The first draft is explicitly labeled as a draft. The AI message accompanying it must say "I've drafted your letter" or "Here's a first draft" — never "Your letter is ready to send" or "Your letter is complete". The user must review and confirm before any payment or dispatch flow begins.

---

### Layout Structure

#### Desktop (`>=1024px`)
```
┌────────────────────────────────────────────────────────────┐
│ <AppHeader>   Swiss Mail   Step 1 ●──○──○──○   {formattedEstimatedTotal}│
├────────────────────────┬───────────────────────────────────┤
│                        │                                    │
│  <ConversationPanel>   │     <LetterPreview>                │
│  (40% width)           │     (60% width)                    │
│                        │                                    │
│  AI messages           │  Paper card (paper bg, serif)      │
│  User input            │  ZoneEditors on hover              │
│  QuickReplyChips       │  Attachment thumbnails             │
│  FieldExtractionCards  │  Signature preview                 │
│                        │                                    │
├────────────────────────┴───────────────────────────────────┤
│ <StatusStrip>  Step label  |  Delivery toggle  |  Price     │
└────────────────────────────────────────────────────────────┘
```

#### Mobile (`<768px`)
```
┌────────────────────────┐
│ <AppHeader> minimal    │
├────────────────────────┤
│ <StepIndicator> strip  │
├────────────────────────┤
│ [ Write | Preview ]    │
├────────────────────────┤
│                        │
│  Active workspace view │
│  (conversation or      │
│   preview)             │
│                        │
└────────────────────────┘
```
The workspace toggle swaps between `<ConversationPanel>` and `<LetterPreview>` in-place on mobile.

---

### Components

#### 6.1 `<AppHeader>` (workspace)
- Logo (small, left) — tap to confirm/discard dialog if unsaved work
- `<StepIndicator>` — centre: step dots with labels ("Draft · Review · Pay · Done")
- Price estimate — right: `text-sm` `{formattedEstimatedTotal}` (muted, updates as content changes)
- No explicit save button. Draft state auto-saves continuously; only warn if the user is about to leave with unsent local input.
- Workspace menu includes an obvious `Start new letter` action that routes to `/draft/new`; if another unfinished draft exists, the recovery card lets the user continue or truly start fresh. The confirmation CTA should read `Start new letter`, not repeat `Start fresh`.
- Workspace menu also includes the theme toggle so the user can switch appearance without leaving the flow.

#### Auto-Save Indicator

Draft state auto-saves on every meaningful change (message sent, field edited, zone updated). The user must feel confident their work is safe without being interrupted by save confirmations.

**Visual:** A small save status indicator in the header, right-aligned, `text-xs text-tertiary`:
- Default (saved): `"Saved"` with a subtle `Check` icon (12px). Appears 1s after the last change, fades in 200ms.
- Saving: `"Saving…"` with a `Loader2` icon (12px, `animate-spin`). Appears immediately when a save is triggered.
- Save failed: `"Not saved"` with `AlertCircle` icon in `text-warning`. Persists until save succeeds or user retries.
- Offline: `"Offline — recent changes are not saved yet"` in `text-warning`.

**Transitions:** The save indicator is the only element in the header that changes state during active work. It must transition smoothly (opacity 0→1, 200ms) and never jump or shift layout.

**Rule:** Never show a "Save" button. Auto-save is the only save mechanism. If auto-save fails silently, the user will lose work — which violates the core promise. The failed state must be visible and actionable.

#### Step Indicator

See [`chat-ui-audit.md` § Step Indicator — Locked Design](chat-ui-audit.md#step-indicator--locked-design) for the canonical specification. The indicator appears in FlowHeader across all draft flow pages, using compact mode on mobile and the full connected rail on desktop.

#### 6.2 `<ConversationPanel>`
Scrollable, fills available height.

**Message types:**
- AI message: avatar dot (`primary` colour), message in `<Card>` rounded, `text-sm`
- User message: right-aligned, `primary-light` bg
- System message: centred, `text-tertiary text-xs` (e.g. "Letter type detected: Cancellation")
- Field extraction card: `<FieldExtractionCard>` — shows extracted fields as key-value pairs with edit icons

**Scroll model:**
- The conversation thread is the only scroll container in the drafting workspace.
- The header, step strip, preview trigger, and composer remain fixed in place while the thread is shorter than the viewport.
- Auto-scroll-to-bottom is allowed only while the user is already near the bottom. Once the user scrolls upward, new AI output must not steal scroll position.
- Do not make the entire workspace column scroll as one page. That creates dead movement and makes the composer feel unstable.

**Empty-thread layout:**
- The empty state sits in the lower half of the workspace, visually tied to the composer.
- Do not vertically centre the empty state in the full viewport with a large dead zone above and below.
- The empty state is a compact starter card: icon, short title, short prompt, one supporting hint. It introduces the task; it does not compete with the composer.

**Input area** (pinned at bottom):
- `<Textarea>` auto-resize, `min-h-[48px] max-h-[120px]`
- Send button `<Button variant="ghost" size="icon">` with `Send` icon, or `Ctrl+Enter` / `Cmd+Enter`
- Microphone button `<Button variant="ghost" size="icon">` with `Mic` icon
- On prompt-first drafting screens, the step trigger sits inline with the composer controls as an icon button immediately left of attachments; on non-prompt screens it remains in the bottom dock
- Prompt-first drafting screens expose a single compact shortcut row above the composer: one manual-entry badge, a few prompt shortcuts, and a `More` action that opens a compact bottom sheet of additional shortcuts
- The shortcut row must stay inside the composer width. If chips exceed the available width, the row scrolls horizontally inside the composer instead of pushing the app wider
- If the user already typed text, selecting a prompt shortcut appends the shortcut into the input instead of sending it immediately and discarding the typed text
- Prompt-first drafting screens keep the bottom dock visible at all times, including while the composer is focused. The dock CTA may be disabled or warning-styled when the next step is not yet available, but it must not disappear on focus.
- Prompt shortcuts must be capability-aware: empty-body states show only substance/content prompts, while wording/formatting/refinement prompts appear only after body content exists.
- When the content step is auto-generating the first body draft from already confirmed context, the step opens behind a blocking loading dialog. The dialog closes only once body content exists; if generation fails, it switches to a recovery hero with a refresh action and a disabled support placeholder.
- Drafting headings, labels, helper text, and buttons follow sentence case per `docs/02-brand/voice-and-tone.md`; avoid title case and all-caps UI copy

**Composer rules:**
- The composer is a single surface. Voice encouragement, textarea, mic affordance, and send action belong to one visual object.
- On an empty draft, voice gets the strongest emphasis, but typing is immediately available in the same composer without a separate mode-selection screen.
- Do not stack a separate dictation promo/banner above the textarea once the composer is visible. That reads like an ad bolted onto the chat input.
- In typing mode, the mic remains clearly visible inside the composer as a secondary but prominent control. Dictation stays discoverable after the user chooses the keyboard.
- Placeholder copy should explicitly support both paths, for example "Type or dictate…", so the voice path stays mentally available.

**Preview separation:**
- On mobile, preview is a separate top-level toggle beside "Write", not a floating control inside or around the composer.
- The preview toggle must remain visually distinct from the composer and from the step indicator.
- Preview access should not compete for space with dictation copy, the textarea, or the send button.
- This separation is required to avoid turning the composer into a crowded toolbar.

**`<QuickReplyChips>`:**
- Row of `<Badge variant="outline">` chips with suggested responses
- Appear after AI asks a question
- Clicking a chip fills the input and auto-submits

#### Conversation Flow State Machine

The AI conversation follows a structured state machine — not free-form chat. Each state defines what the AI asks, what it extracts, and what quick-reply chips appear. An implementing LLM must not invent a generic chatbot; the conversation is a guided form-killer.

**States:**

| State | AI's Goal | Typical AI Message Pattern | Quick-Reply Chips |
|-------|-----------|---------------------------|-------------------|
| `intent_detection` | Understand what kind of letter | "Got it — [mirror user input]. I'll need a few details." | Use-case chips if intent unclear |
| `recipient_collection` | Get recipient name + address | "Who is this letter addressed to? **Name and address?**" | "I have it ready", "I'm not sure" |
| `sender_collection` | Get sender name + address | "And your details — **your name and address?**" | "Same as last time" (if returning user), "Enter manually" |
| `context_gathering` | Get letter-specific details | Varies by use case: dates, reference numbers, specifics | Contextual suggestions |
| `draft_generation` | AI produces first draft | "I've drafted your letter. Take a look — anything you'd like to change?" | "Looks good", "More formal", "Change the tone", "Edit [section]" |
| `refinement` | User requests changes | "I've updated [section]. Here's the revised version." | "Looks good now", "Change something else" |
| `ready` | Draft is complete | "Your letter is ready to review when you are." | "Continue to review" |

**Transition rules:**
- States progress linearly but can loop (`refinement` → `refinement`).
- The AI never skips `recipient_collection` — a letter always has a recipient.
- `sender_collection` can be auto-filled if the user has sent a letter before (account context).
- The user can always type free-form input at any state — the AI must handle off-script responses gracefully (e.g., "Actually, make it a complaint instead" during `context_gathering` → loops back to `intent_detection`).
- System messages announce state transitions: "Letter type: Cancellation" → "Recipient added" → "Draft ready".

**Example conversation (lease cancellation via use-case entry):**

```
AI:     Let's draft your lease cancellation letter. To get started:
        **what's the landlord's name and address?**

        [I have it ready] [I'm not sure of the address]

User:   Müller Immobilien AG, Bahnhofstrasse 42, 8001 Zürich

AI:     ✓ Recipient: Müller Immobilien AG, Bahnhofstrasse 42, 8001 Zürich

        Now, **your name and address** for the sender details?

        [Enter manually]

User:   Anna Meier, Seestrasse 15, 8002 Zürich

AI:     ✓ Sender: Anna Meier, Seestrasse 15, 8002 Zürich

        A few more details for the letter:
        **When should the lease end?** (If your contract specifies a notice period,
        the letter will reference it.)

        [End of next month] [Specific date…] [I'm not sure]

User:   [taps "End of next month"]

AI:     ✓ Lease end: [calculated date]

        **Is there anything specific you want to mention?** For example, a deposit
        refund request, key return arrangements, or special contract clauses.

        [No, keep it standard] [Yes, I want to add details]

User:   Please mention I want the deposit returned to my bank account.

        [The letter preview on the right now populates with the full draft]

AI:     Your letter is ready to review. I've included:
        • Formal lease cancellation notice
        • Reference to the standard notice period
        • Deposit return request

        Take a look at the preview — anything you'd like to change?

        [Looks good] [More formal] [Change something] [Continue to review]
```

**Anti-hallucination warning:** The conversation examples above are illustrative. The actual AI prompts and response formatting are defined in `docs/04-product/letter-generation.md` and `docs/04-product/ai-provider-and-prompts.md`. Do not implement conversation logic from these UX examples alone — they show the user-facing experience, not the backend prompt engineering.

#### Smart Defaults and Prefilling

The product should feel like it already knows you. Every default should feel like a shortcut, not a guess.

**Date auto-fill:**
- The letter date defaults to today's date, formatted per the active locale (e.g., "15. März 2026" for de-CH, "15 mars 2026" for fr-CH).
- The date appears pre-filled in the preview from the moment the first draft is generated.
- User can change the date via ZoneEditor at any time. The AI does NOT ask for the date in conversation unless the use case requires a specific date (e.g., "effective as of…").

**Locale-aware defaults:**
- The UI locale determines default letter language. A user browsing in `de-CH` gets a German letter draft by default.
- The AI should confirm the language if the user's input language doesn't match their locale: "You wrote in English, but your locale is set to German. Should I draft the letter in English or German?"
- Salutation and closing conventions follow Swiss norms per locale:
  - `de-CH`: "Sehr geehrte Damen und Herren" / "Freundliche Grüsse"
  - `fr-CH`: "Madame, Monsieur" / "Veuillez agréer, Madame, Monsieur, mes salutations distinguées"
  - `it-CH`: "Gentili Signore e Signori" / "Distinti saluti"
  - `en-CH`: "Dear Sir or Madam" / "Yours faithfully"

**Returning session prefilling (same guest session only):**
- If the user resumes the same guest session by cookie or resume link:
  - Sender name + address already captured in that session are pre-filled in the `<FieldExtractionCard>`.
  - The AI offers: "I still have your sender details — **Anna Meier, Seestrasse 15, 8002 Zürich**. Is that still correct?"
  - Quick-reply chip: "That's correct" / "Update my details"
- For first-time users or brand-new guest sessions: no prefilling. The AI asks for sender details normally.
- **Implementation note:** Prefilling from prior sessions requires a server-side lookup. Do not store sender details in `localStorage` or cookies — this is PII.

**Recipient search assistance:**
- Assisted search is for **companies / registered organizations only**.
- For company recipients, the UI may prefill the organization name from the AI step and offer an
  official registry-backed lookup before the user falls back to manual address entry.
- Current staging implementation uses the official company registry to find the organization and
  legal seat only; the user must still confirm the mailing address manually before continuing.
- Official company lookup must run through Swiss Mail server-side infrastructure (adapter + internal
  proxy where needed). Do not expose registry credentials or make the browser call the registry
  directly.
- For private-person recipients, do not query consumer directories or general web search. Capture
  the address manually and then run the normal soft validation flow.
- Manual entry remains available even for companies because official registry data and real mailing
  destinations do not always match perfectly.

**Use-case context pre-loading:**
- When a user arrives via a use-case landing page (e.g., `/use-cases/lease-cancellation`), the conversation starts with that context pre-loaded.
- The AI's first message references the use case: "Let's draft your lease cancellation letter…" (not a generic "How can I help?").
- Use-case context also pre-selects relevant quick-reply chips and adjusts the conversation state machine's question ordering (e.g., for lease cancellation, asking for the landlord first makes more sense than asking for a generic "recipient").

#### AI Confusion and Fallback Recovery

The AI will sometimes not understand the user's intent. This must not be a dead end.

**Detection heuristics (backend-defined, UX-visible):**
- AI confidence score below threshold → fallback path
- User repeats the same message twice → AI wasn't helpful
- User sends "?" or "help" or "I don't understand" → explicit confusion signal

**Fallback UX — "I'm not sure I understood":**
When the AI can't parse intent or the request is outside scope:
```
AI:     I'm not sure I understood that. Let me try a different approach.

        What kind of letter do you need?
        [Cancel a contract] [Send a formal complaint] [Write a notice] [Something else]
```
The quick-reply chips provide structured recovery. "Something else" opens a free-text clarification prompt.

**Fallback UX — "This is outside what I can help with":**
If the user requests something genuinely outside scope (e.g., "Write me a wedding speech"):
```
AI:     I'm designed to help with formal Swiss correspondence —
        things like contract cancellations, formal notices, and official complaints.

        Would you like to start one of these instead?
        [Cancel a contract] [Send a formal complaint] [Write a notice]
```
No "Sorry, I can't do that" without an alternative. Always offer a constructive next step.

**Fallback UX — repeated AI failures:**
If the AI fails to respond 3 times in a row (backend errors):
- Show `<ErrorBanner>` with: "We're having trouble connecting. Your draft is saved."
- Switch conversation input to a simple form mode: structured fields for sender, recipient, subject, body — a manual fallback that lets the user complete the letter without AI assistance.
- Show this gracefully: "While we reconnect, you can continue filling in your letter details manually."

**Critical rules:**
- NEVER show a blank conversation with no explanation.
- NEVER say "An error occurred" without saying what the user can do.
- NEVER block the entire workspace because the AI is down — the manual fallback ensures the user can always finish.

#### Revision and Iteration UX

After the first draft, users often want to refine. This is where the "effortless" bar is set — revisions must feel as natural as the initial drafting.

**Revision via conversation:**
- User types: "Make it more formal" or "The tone is too aggressive" or "Add a paragraph about the deposit"
- AI responds with a brief acknowledgment + the change: "I've made the tone more formal. Here's the updated version."
- The letter preview updates in real-time as the AI generates the revision.
- Changed sections in the preview briefly highlight with a `primary-light` background pulse (300ms fade-in, 1s hold, 300ms fade-out) so the user can see what changed.

**Revision via ZoneEditor:**
- User clicks/taps a zone in the letter preview (e.g., the body paragraph).
- ZoneEditor opens (popover on desktop, Sheet on mobile) with an editable text field pre-filled with the current content.
- User edits directly and confirms.
- The conversation panel receives a system message: `"Body edited manually"` — so the AI knows the user changed something and won't overwrite it in subsequent revisions.
- The AI acknowledges: "Noted — I'll keep your changes to the body."

**Undo for AI revisions:**
- Each AI revision creates a draft version (stored as a lightweight snapshot — not full document copies).
- `Cmd/Ctrl + Z` in the workspace reverts to the previous version.
- A `<Toast>` appears: "Revision undone" with an "Redo" action link.
- Maximum undo depth: 10 versions per session.
- Mobile: undo is available via a small "↩ Undo" button in the conversation panel after each AI revision.

**What NOT to do:**
- Do not show a diff view by default — it's cognitive overhead. The highlight pulse is sufficient.
- Do not require the user to "accept" changes in a merge-conflict style UI.
- Do not lose the conversation context when the user edits via ZoneEditor — the AI maintains awareness.

**`<FieldExtractionCard>`:**
- Shows what the system has understood so far
- Fields: Sender, Recipient, Subject, Date, etc.
- Each field: label + value + pencil icon (opens inline edit or jumps to ZoneEditor)
- Missing fields: shown as `text-tertiary` "[not yet provided]" with `AlertCircle` icon

#### 6.3 `<LetterPreview>`
`paper` background (`#FAFAF7`), `shadow-paper` elevation, A4 proportions (desktop: actual width constrained to ~680px; mobile: full-width in sheet).

**Layout within preview:**
- Sender block (top-left, above the recipient block, matching Swiss window-envelope conventions)
- Recipient block (right-aligned in the preview)
- Date
- Subject line (`font-semibold`)
- Body paragraphs (serif, `text-sm`, line-height generous)
- Closing / salutation
- Signature placeholder
- Attachment list (bottom, `text-xs text-secondary`)

**Page count indicator:**
- Bottom-right of the preview area, outside the paper card: `text-xs text-tertiary` "Page 1 of 1" (or "Page 1 of N").
- Updates in real-time as content changes (e.g., body text grows past one page).
- On desktop: visible at all times below the paper card.
- On mobile (in sheet): visible at the bottom of the sheet, above the close/drag handle.
- If multi-page: small page navigation arrows (`ChevronLeft` / `ChevronRight`, 16px) appear beside the indicator. Desktop scrolls the full letter; mobile pages through individual pages in the sheet (see `micro-interactions.md` §4.2 "Multi-Page Preview Transitions").
- **Max page limit:** The system enforces a maximum of 5 pages. If the content exceeds this, show a warning below the page indicator: `text-xs text-warning` "Maximum 5 pages. Please shorten your letter." The AI should proactively mention this in conversation if the draft is approaching the limit.

**Blank template outline (pre-draft):**
Before the AI generates the first draft, the preview shows a blank template outline rather than an empty white rectangle. This communicates "your letter will go here" and reinforces the paper metaphor:
- Faint dotted zone outlines where sender, recipient, date, subject, body, and signature will appear.
- Zone labels in `text-tertiary text-xs`: "Sender", "Recipient", "Date", "Subject", "Body", "Signature" — positioned at the top-left of each zone.
- Same `paper` background and `shadow-paper` elevation as the populated state.
- No animation — this is a static placeholder. The animation happens when content fills in (see "First Draft Reveal Choreography" in `micro-interactions.md`).

**`<ZoneEditor>` interaction:**
- Each zone (sender, recipient, body, etc.) is hoverable on desktop
- Hover: subtle `primary-light` highlight + pencil icon overlay
- Click: opens inline edit popover or Sheet with field inputs
- On mobile: zones are tap targets; tap opens edit Sheet

**Real-time updates:** Letter re-renders as fields are extracted from conversation. Smooth transition, no jarring reflows.

#### Swiss Address Validation UX

Address validation is critical for dispatch — an invalid Swiss address means a wasted letter and wasted money. But validation must not feel like a bureaucratic checkpoint.

**When validation triggers:**
- Postal code (PLZ) validation fires on `blur` of the postal code field, NOT on every keystroke.
- Full address validation fires when the user finishes editing an address zone (closes the ZoneEditor popover/sheet), NOT during typing.
- For company search results, the same validation still runs after selection or confirmation. Search
  is an assistive shortcut, not a guarantee that the final mailing address is correct.
- The AI conversation collects addresses organically. When the AI parses a complete address from conversation, it validates in the background before confirming to the user.

**PLZ soft validation:**
- Valid Swiss PLZ: 1000–9999 (4 digits). If the entered value is outside this range or non-numeric, show immediately on blur: `text-error text-xs` "Swiss postal codes are 4 digits (e.g. 8001)" below the field.
- PLZ-to-city lookup: When a valid 4-digit PLZ is entered, the city field auto-fills if empty. If the city field already has a value that doesn't match, show a soft warning: `text-warning text-xs` "Postal code {plz} is usually associated with {expectedCity}" — but allow the user to keep their value. Some PLZ codes map to multiple cities.
- PLZ-to-city lookup comes from a static dataset (Swiss Post PLZ directory), NOT an API call. This means it works offline and is instant.
- **Auto-fill delight:** When the city auto-fills from PLZ, the city field briefly highlights with `bg-success/10` (100ms fade-in, 300ms hold, 200ms fade-out) and the field value appears with a subtle typing animation (characters appear left-to-right over 200ms). This creates a "the system is smart" moment. In `prefers-reduced-motion` mode, the city appears instantly with no highlight.

**Address completeness in the AI conversation:**
When the AI collects an address via conversation, it should confirm what it understood:
> "Got it — the recipient is:\n**Muster AG**\n**Bahnhofstrasse 10**\n**8001 Zürich**\nDoes that look right?"

This confirmation gives the user a chance to catch typos before they reach the review page. The AI should NOT silently swallow addresses.

**Recipient address outside Switzerland:**
Swiss Mail dispatches physical letters within Switzerland. If the AI detects a non-Swiss address (country ≠ Switzerland, PLZ > 4 digits, or explicit country mention), it should inform the user: "Currently, Swiss Mail can only send letters to Swiss addresses. For international delivery, download the final PDF and use your own international mailing channel." This is a hard block — the system cannot proceed with a non-Swiss recipient.

**Address formatting in preview:**
Swiss letter formatting follows specific conventions. The preview must render addresses as:
```
Herr / Frau [FirstName] [LastName]     (salutation line — optional)
[Company name]                         (optional, for business letters)
[Street] [Number]
[PLZ] [City]
```
No "Switzerland" line for domestic mail. No comma between street and number. PLZ always before city, no separator.

#### Session Save-via-Email Flow

Guest sessions expire (duration configurable, see `open-decisions.md`). The `<SessionExpiryBanner>` warns users and offers the option to save their session via email. This is the ONLY guest persistence mechanism — there is no account, no password.

**Banner appearance timeline:**
1. **Warning state** (configurable threshold, e.g. 1 hour remaining): `<SessionExpiryBanner>` slides in below the app header. Single line: "⏱ Your session expires in {timeRemaining}. [Save via email]". Dismissible (`X` button). `bg-warning/10`, `border-warning/20`.
2. **Critical state** (configurable threshold, e.g. 5 minutes remaining): Banner becomes non-dismissible, two lines:
   - Line 1: "⚠️ Your session expires soon."
   - Line 2: Email input + "Save" button, stacked full-width.

**The email save flow:**
1. User enters email address in the banner's inline input field.
2. User taps "Save" → button shows spinner (loading state).
3. Backend creates a `resume_token` and sends an email with a link: `{baseUrl}/resume/{token}`.
4. On success: banner changes to `bg-success/10` with `Check` icon: "Saved! We sent a resume link to {email}." Dismissible.
5. On failure (invalid email, send failure): banner stays, shows error below input: "Couldn't send the link — check your email address and try again."

**What the resume email contains:**
- Subject: "Your Swiss Mail letter draft — resume link"
- Body: brief explanation + prominent "Resume your letter" CTA button linking to `/resume/{token}`
- Expiry note: "This link expires when your session expires ({expiryDate})."
- NOT a full copy of the draft — just a link. Draft data stays server-side.

**Resume page (`/resume/:token`) behavior:**
- Token valid + session active: redirect to `/draft/:id` (the original workspace) silently.
- Token valid + session expired but restorable: show "Welcome back! We've restored your draft." and redirect.
- Token valid + session expired and unrestorable: show "This session has expired and can't be restored. [Start a new letter]".
- Token invalid: 404 page.
- Token already used for a completed letter: redirect to `/status/:orderToken` when an order-access token exists.

**Critical rules:**
- The email input must NOT be repurposed to create an account. This is explicitly a session-save mechanism.
- The resume link must work on a different device (tablet → phone → desktop).
- No "sign up" nudge appears in the session save flow.
- The token is session-scoped and time-limited, not single-use. It always restores the same active draft while the guest session remains valid.

#### 6.4 `<StatusStrip>` (desktop)
Pinned at bottom:
- Left: current step label
- Centre: `<DeliverySelector>` — toggle between Standard / Registered with price delta
- Right: `<PriceSummary>` — running total `{formattedEstimatedTotal}` + "Continue to Review" → `/draft/:id/review`

Mobile: `<StatusStrip>` collapses to a minimal bar. "Continue" becomes a FAB or sticky bottom button.

#### Price Estimate Timing and Behavior

The price estimate in the header and `<StatusStrip>` is one of the most trust-critical UI elements. It must appear early, update transparently, and never surprise the user at checkout.

**When the price first appears:**
- The price estimate appears in the `<AppHeader>` as soon as the session is created — even before the first draft. At this point, it shows the base price: `"From {formattedBasePrice}"` in `text-tertiary text-xs`.
- The "From" prefix communicates that the final price depends on page count, delivery type, and attachments.

**How the price updates:**
- When the first draft is generated and page count is known: the price updates to `"{formattedEstimatedTotal}"` (dropping the "From" prefix). The number animates with a brief crossfade (opacity 0→1, 150ms) — see `micro-interactions.md` §4.8 for pricing animation.
- When the user toggles delivery type (Standard ↔ Registered): the price updates immediately with the same crossfade.
- When attachments are added/removed: the price updates to reflect the per-page attachment cost.
- When the body changes significantly (page count changes): the price updates on next auto-save.

**Price formatting rules:**
- Always format prices like `CHF 6.90` — never rounded, never without decimals.
- Use `{formattedEstimatedTotal}` from the pricing service — never compute in the UI.
- If the pricing service is unavailable: show `"Price unavailable"` in `text-warning` — never show CHF 0.00 or a stale cached price.

**Mobile:** The price estimate in the header is condensed to just `"{formattedEstimatedTotal}"` (no "From" prefix even early on, to save space). The full itemized breakdown appears in the `<StatusStrip>` bottom bar.

#### Draft-to-Review Transition

The "Continue to Review" button in `<StatusStrip>` (or sticky bottom button on mobile) is the gateway to the review step. Its availability communicates "your letter is ready enough."

**Enabled conditions** (ALL must be true):
1. Letter body has content (AI has generated at least one draft)
2. Recipient name is present (may be incomplete — address can be partial)
3. Sender name is present (may be incomplete — address can be partial)
4. No rendering failure is currently active

**Visual states:**
- **Disabled** (conditions not met): Muted appearance (`opacity-50`, `cursor-not-allowed`). Tooltip on hover/focus: "Complete your letter details to continue" — never just "Disabled" or no explanation.
- **Enabled** (conditions met): Full `primary` appearance. Subtle entrance animation — the button transitions from disabled to enabled with a 300ms ease-out opacity + color change, so the user notices it becoming available without being startled.
- **Ready + nudge** (enabled for >5s with no user action): A single gentle pulse animation (scale 1→1.02→1, 600ms, once) to draw attention without being aggressive. Only triggers once per session.

**What "Continue to Review" does:**
1. Triggers a final render of the current draft content.
2. Shows a brief loading state (button spinner, 0.5–2s typically).
3. Navigates to `/draft/:id/review`.
4. If rendering fails: stays on workspace, shows `<ErrorBanner>` "We couldn't prepare your preview. Your content is saved — try again."

**Mobile:** The sticky bottom button spans full width with safe-area padding. Same enabled/disabled logic. Same nudge animation.

---

### Loading States
- Initial load: `<Skeleton>` blocks in conversation panel and preview panel
- AI response pending: typing indicator (3-dot animation) in conversation panel
- Preview re-render: subtle shimmer on preview card, no full skeleton re-render
- Field extraction: individual field slots show `<Skeleton>` while updating

### Error States
| Error family | Display |
|---|---|
| AI response failure | `<ErrorBanner>` in conversation panel: "Couldn't get a response. Try again." with retry button |
| Session expired | `<Dialog>` "Your session has expired. Start a new letter or use your resume link." No post-expiry save flow |
| Network offline | `<ErrorBanner>` (top of page): "You're offline. Recent changes are not saved yet." |
| Rendering failure | Warning in preview area: "Preview unavailable — your content is saved." |

### Empty State
First load with no content: ConversationPanel shows a welcome message from the AI assistant and the first prompt question. LetterPreview shows a blank letter template outline with zone placeholders.

### Accessibility
- Conversation panel: `role="log"`, `aria-live="polite"` for new messages
- Letter preview: `role="region"`, `aria-label="Letter preview"`, `aria-live="polite"` for updates
- ZoneEditor triggers: `aria-label="Edit [field name]"`, keyboard activatable
- Microphone button: `aria-label="Start voice input"`, `aria-pressed`
- StepIndicator: `role="progressbar"` or `<nav aria-label="Progress">`
- Mobile preview sheet: focus trapped when open, returns focus on close

### Keyboard Shortcuts (Desktop)

Power users who send multiple letters should be able to work without touching the mouse. These shortcuts are active only in the draft workspace (`/draft/:id`).

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message (in conversation input) |
| `Shift + Enter` | New line in message input |
| `Cmd/Ctrl + Enter` | Continue to Review (when enabled) |
| `Cmd/Ctrl + P` | Toggle letter preview (mobile: open/close sheet; desktop: focus preview panel) |
| `Escape` | Close any open ZoneEditor, Sheet, or Dialog |
| `Cmd/Ctrl + Z` | Undo last AI edit in preview (reverts to previous draft version) |
| `Tab` | Move focus through interactive zones in the letter preview |

**Implementation rules:**
- Shortcuts must not conflict with browser defaults. `Cmd/Ctrl + P` must be intercepted to prevent the browser print dialog — use `preventDefault()`.
- All shortcuts must have visible hints in tooltips or a discoverable help overlay (`?` key opens shortcut cheat sheet).
- Shortcuts are desktop-only and should not be registered on touch devices.
- The shortcut cheat sheet is a simple `<Dialog>` listing all shortcuts — not a complex help system.

---

## 7. Review (`/draft/:id/review`)

### Route
`/draft/:id/review`

### SEO
- `noindex, nofollow`
- **Title:** `Review your letter — Swiss Mail`

### Layout
`<AppLayout>` — header with StepIndicator. No workspace split.

### Emotional intent
**I'm confident this is right. I'm ready to send it.** The review page is the last checkpoint before money changes hands. It must build confidence, not create anxiety. Everything must be scannable. Edit paths must be obvious but not prominent enough to create doubt.

### Entrance choreography (Draft → Review transition)

The transition from the drafting workspace to the review page is an emotional gear shift — from creative flow to calm scrutiny. The page must NOT just pop in. It should feel like "stepping back to see the whole picture."

1. **0–0.2s:** Page background renders immediately (`surface` colour). StepIndicator updates (step 2 becomes active — see `micro-interactions.md` §4.4).
2. **0.2–0.5s:** Page heading fades in (`opacity 0→1, translateY 8→0, 200ms, ease-out`).
3. **0.3–0.7s:** LetterPreview card slides up gently from below (`translateY(16px)→0, opacity 0→1, 300ms, ease-out`). The letter preview is the centrepiece — its entrance should feel like "here is your letter, ready for your approval."
4. **0.5–0.9s:** Completion checklist card fades in alongside the preview (or below on mobile). Each checklist item stagger: 50ms per item.
5. **0.7–1.0s:** Delivery selection, price summary, and CTA fade in together.

**On mobile:** The same sequence applies, but everything is single-column. The LetterPreview takes up the full viewport width, immediately communicating "look at your finished letter."

`prefers-reduced-motion`: All elements appear with a simple 100ms crossfade, no translation or stagger.

---

### Sections

#### 7.1 `<AppHeader>` with StepIndicator (step 2 active)

#### 7.2 Page Heading
`<h1>` "Review your letter before sending"  
`text-secondary text-sm` "Check everything looks correct. You can edit any section."

#### 7.3 `<LetterPreview>` (full, centred)
- Larger than workspace: max-width `720px`, centred, `shadow-paper`
- No ZoneEditors on hover — read-only by default
- "Edit" buttons positioned beside each major section (sender, recipient, body, signature)
- Clicking "Edit" → navigates back to `/draft/:id` with that zone in focus

#### 7.4 Completion Checklist
`<Card>` to the right (desktop) or below (mobile):

Checklist items:
- ✅ Sender details
- ✅ Recipient details
- ✅ Letter body
- ✅ Subject line
- ✅ / ⚠️ Signature (if not set: warning, not blocking)
- ✅ / ⚠️ Attachments (optional)

Each item: `Check` or `AlertTriangle` icon + label + optional "Add" / "Edit" link.  
Incomplete required fields: item shown with `error` colour + blocking message "Required before sending".

**Signature warning spec:** When no signature has been added, the signature checklist item shows:
- `AlertTriangle` icon in `warning` colour
- "No signature added" in `text-warning`
- "Add signature" link → opens `<SignaturePicker>` (Sheet on mobile, Popover on desktop)
- Below the icon row: `text-xs text-secondary` "Your letter will be sent without a signature. This is fine for most correspondence, but recommended for formal notices."
- This is a **soft warning** — it does NOT prevent the user from proceeding. The CTA remains enabled.

**Attachment optional item spec:** When no attachments are present:
- Grey `Check` icon (not red or yellow — attachments are genuinely optional)
- "No attachments" in `text-secondary`
- "Add attachment" link → opens `<AttachmentUploader>`
- No warning copy — adding attachments is not even recommended for most letters

#### 7.5 Address Warning Card
Shown only when recipient-address validation is incomplete or suspicious. This is a deliberate
friction moment for irreversible mailings, not a generic inline hint.

`<Card>` with `warning` treatment:
- Heading: "Please confirm this delivery address"
- Body copy: "We could not fully verify this address. Please make sure it is correct before you pay."
- Full recipient block rendered exactly as it will be sent
- Secondary helper text in `text-xs text-secondary`: "If anything is wrong, edit the recipient details before continuing."
- Explicit confirmation control:
  - `<Checkbox>` label: "Send to this address anyway"
  - Checkout CTA stays disabled until checked when this warning is present
- Primary edit action: "Edit recipient details" → returns to `/draft/:id` with recipient zone focused

Rules:
- Do not block purely because a provider or heuristic could not confirm the address.
- Do not hide the warning inside a tooltip, collapsed accordion, or generic error banner.
- Do not use blame language such as "You entered an invalid address."

#### 7.6 Delivery Selection — `<DeliverySelector>`
Card showing both options side by side (desktop) / stacked (mobile):

**Standard delivery card:**
- Label, estimated delivery, price
- `Badge` "Most common"

**Registered delivery card:**
- Label, "Proof of delivery", price
- `Badge accent` "Recommended for formal notices"
- `<Tooltip>` explaining what registered mail provides (and its limitations — see `../08-guardrails/provider-certainties.md`)

Selected option: highlighted with `border-primary` + `primary-light` background.

#### 7.7 Attachment Summary
`<Card>` listing all attached files:
- File name, page count, type
- Remove link (with confirmation)
- "Add attachment" link → opens `<AttachmentUploader>`

Attachment behavior is an extension of the active draft, not a separate upload flow. Upload begins
only after a draft exists and remains available on review; checkout is read-only for attachments.

If no attachments: `text-secondary text-sm` "No attachments" + "Add attachment" link.

#### 7.8 Price Summary — `<PriceSummary>`
Itemised:
- Letter (N pages): {formattedLetterPrice}
- Delivery: {formattedDeliveryPrice}
- Attachments (N pages): {formattedAttachmentPrice} — show only if attachment-related pricing is enabled at launch
- **Total: {formattedTotal}** (`font-bold text-lg`)

**Pricing row display rules (from `docs/04-product/pricing-structure.md`):**
- Only show pricing rows that are **enabled in the pricing configuration**. If attachment pricing is not enabled at launch, do not show an "Attachments: CHF 0.00" row — omit it entirely.
- Never show CHF 0.00 for a line item. If a line item has no cost, either omit the row or show "Included" instead of a zero price.
- All prices come from the pricing service/config. Never compute prices in the frontend — always use `{formatted*}` values returned by the API.

#### 7.9 CTA
- Primary: `<Button size="lg" className="w-full md:w-auto">` "Proceed to payment — {formattedTotal}" → `/draft/:id/checkout`
- Back link: "← Back to editing"

---

### Loading States
- Page load: preview card shows `<Skeleton>` while fetching latest draft render
- If render in progress: spinner within preview card area + "Preparing your letter preview…"

### Error States
- Required field incomplete: CTA disabled + inline warning in checklist
- Recipient address ambiguous: warning card shown with exact address + explicit confirmation checkbox before checkout
- Render failure: `<ErrorBanner>` "We couldn't generate your preview. Your content is saved — please try again."
- Session expired: `<Dialog>` (same as workspace)

### Empty State
No empty state — user cannot reach this page without a draft in progress.

### Accessibility
- Checklist items: `role="list"` + `role="listitem"`
- Incomplete fields: `aria-invalid` on related sections, `aria-describedby` pointing to error message
- Delivery selector: `role="radiogroup"`, each option `role="radio"` with `aria-checked`
- CTA disabled state: `aria-disabled="true"` + `<Tooltip>` explaining why

---

## 8. Checkout (`/draft/:id/checkout`)

### Route
`/draft/:id/checkout`

### SEO
- `noindex, nofollow`
- **Title:** `Checkout — Swiss Mail`

### Layout
`<MinimalLayout>` — logo only, no nav, no footer links. Reduces abandonment. Single-column, centred.

### Emotional intent
**This is safe. I trust this.** Payment screens carry the highest anxiety in any flow. The layout must be uncluttered, the price unmistakable, and the trust signals credible. No distractions.

---

### Sections

#### 8.1 Minimal Header
Logo (centred or left). `<StepIndicator>` showing step 3 "Pay". No navigation.

#### 8.2 Two-Column Layout (desktop) / Single-column (mobile)

**Left / Top: Order Summary Card**
`<Card>` — `surface` background, `border`, `rounded-lg`:
- `<h2>` "Your order"
- Letter type (e.g. "Cancellation letter")
- Pages: N
- Delivery: Standard / Registered
- Attachments: N pages (if any)
- `<Separator>`
- Subtotal, VAT line (if applicable), **Total: {formattedTotal}** (large, `font-bold`)
- Lock icon + `text-xs text-secondary` "Secure checkout"

**Right / Below: Payment Form**

Email field:
- `<Input type="email">` labelled "Email address" — for receipt and status updates
- `text-xs text-secondary` "We'll send your receipt and letter status to this address."
- No account creation. Guest checkout.
- **Validation rule (from `docs/04-product/email-flows.md`):** Format check only (RFC 5322 simplified). Do NOT perform DNS/MX lookups or deliverability pings. Validate on blur, not on every keystroke. Error message: "Please enter a valid email address."

Stripe embedded payment element:
- Rendered by Stripe.js `<PaymentElement>` component
- Do not build a custom card form — use Stripe's embedded UI
- Stripe handles PCI compliance; do not handle raw card data
- Loading state: `<Skeleton>` while Stripe loads (typically <1s)

Legal checkbox:
- `<Checkbox>` + label: "I have read and agree to the [Terms of Service] and understand that Swiss Mail is not a legal service."
- Link to `/terms` opens in new tab
- CTA disabled until checked

Disclaimer prominence rule:
- Drafting and review may include calm informational reminders or FAQ copy.
- The explicit legal-boundary acknowledgment happens here at checkout, once, before payment.

**CTA:**
`<Button size="xl" className="w-full">` "Send my letter — {formattedTotal}"  
Price embedded in button. `Send` icon left. Disabled until form valid + checkbox checked.

Trust row below CTA:
- `Lock` icon + "Secured by Stripe"
- 🇨🇭 Swiss cross icon + "Swiss postal delivery via licensed provider"
- `Shield` icon + "Your data stays in Europe"

These are NOT generic trust badges — they are Swiss-specific and product-specific. "Privacy-conscious infrastructure" is too vague. "Your data stays in Europe" is meaningful if true (verify with `docs/08-guardrails/provider-certainties.md` before using). If data residency cannot be confirmed, use "Encrypted and securely stored" instead.

#### 8.3 TWINT Payment (Mobile)

On mobile devices, Stripe's `<PaymentElement>` may surface TWINT as a payment option (Switzerland-specific). TWINT redirects the user to the TWINT app for approval, then returns them to Swiss Mail.

**Flow:**
1. User selects TWINT in Stripe's payment method selector.
2. User taps "Send my letter" CTA.
3. Stripe redirects to the TWINT app (or TWINT web flow on tablets without the app).
4. User approves payment in TWINT.
5. TWINT redirects back to Swiss Mail's checkout page.
6. Swiss Mail receives Stripe webhook confirmation → navigates to `/draft/:id/confirmation`.

**Edge cases:**
- **User doesn't return from TWINT:** The checkout page shows a polling state: "Waiting for payment confirmation from TWINT…" with a spinner. After 60s without confirmation, show: "We haven't received payment confirmation yet. If you completed payment in TWINT, please wait a moment. Otherwise, try again." with a retry button.
- **TWINT app not installed:** Stripe handles this gracefully with a web fallback. Do not build a custom detection mechanism.
- **Payment succeeds but redirect fails:** Stripe webhook still fires. If the user returns to the checkout page manually, detect the completed payment and redirect to confirmation.

**Anti-hallucination rule:** TWINT integration is handled entirely by Stripe's SDK. Do not build a direct TWINT integration. The UX is Stripe's `<PaymentElement>` with TWINT enabled as a payment method — no custom TWINT UI is needed.

#### 8.4 Mid-Payment Navigation Handling

Users may accidentally navigate away during payment processing:

**Scenario: User taps browser back during Stripe processing:**
- Intercept with `beforeunload` event: browser shows standard "Leave site?" confirmation.
- If user confirms leaving: payment may still succeed via Stripe webhook. The confirmation email serves as the fallback receipt.
- If user stays: processing continues normally.

**Scenario: User closes tab during processing:**
- Payment may complete in the background (Stripe processes server-side).
- If payment succeeds: confirmation email is sent. User can return via order-status link.
- If payment fails: no charge. Draft remains available.

**Scenario: User's internet drops mid-payment:**
- Stripe retries internally. If the connection recovers within Stripe's retry window, payment may succeed.
- Show `<ErrorBanner>` on reconnect: "Your connection was interrupted. Checking payment status…" + automatic status check.
- If payment succeeded: redirect to confirmation.
- If payment failed or status unknown: "Payment status is unclear. If you were charged, contact support with reference {draftId}." + "Try again" button.

**Implementation rule:** Never assume payment failed because the client lost connection. Always check server-side payment status before showing a failure message.

---

### Loading States
- Stripe element loading: `<Skeleton>` rectangle placeholder
- Payment submission: button spinner + disabled, status message "Processing payment…"
- Do not show "Sending your letter" until dispatch is confirmed — payment and dispatch are separate states

### Error States
| Error | Display |
|---|---|
| Card declined | Stripe surfaces inline within `<PaymentElement>` + `<ErrorBanner>` below: "Payment was not completed. No letter has been sent." |
| Payment failed (network/other) | `<ErrorBanner>` + retry option |
| Checkout expired / draft changed | `<Dialog>` "Your session has changed. Please review your letter again." → back to review |
| Email invalid | Inline field error |

### Empty State
No empty state — requires a valid draft and review completion to reach.

### Accessibility
- Email field: `<label>` associated with input, `aria-required="true"`
- Legal checkbox: `aria-required="true"`, `aria-describedby` pointing to terms link
- CTA disabled state: `aria-disabled="true"` with tooltip "Please complete all required fields"
- Stripe `<PaymentElement>`: Stripe handles internal accessibility; do not override
- Error messages: `role="alert"`, focused on appearance

---

## 9. Confirmation (`/draft/:id/confirmation`)

### Route
`/draft/:id/confirmation`

### SEO
- `noindex, nofollow`
- **Title:** `Payment received — Swiss Mail`

### Layout
`<MinimalLayout>` — same as checkout. Centred content.

### Emotional intent
**I know what happened, and I know what happens next.** The confirmation screen must deliver calm closure, not celebration theater. It should feel like a receipt, not a dashboard. Status must be honest — do not claim delivery if only dispatch has been submitted. Reference numbers are real.

### Emotional pacing and entrance choreography

The confirmation page is the emotional payoff of the entire flow. It must feel like relief, clarity, and trust — in that order. The page loads in a deliberate sequence:

1. **0–0.2s:** Background renders immediately (`surface` colour, no flash of white or layout shift).
2. **0.2–0.6s:** The `CheckCircle` icon scales in from 0 → 1 with `ease-spring` (`cubic-bezier(0.34, 1.56, 0.64, 1)` — the standard spring curve from `design-system.md`). This is the first thing the user sees — it communicates "you're done" before any text loads.
3. **0.4–0.8s:** "Payment received" heading fades in (`opacity 0→1, 200ms, ease-out`).
4. **0.6–1.0s:** Reference number and subtext fade in together.
5. **0.8–1.2s:** `<DispatchStatusCard>` slides up from below (`translateY(12px)→0, opacity 0→1, 300ms`).
6. **1.0–1.4s:** "What happens next" timeline items stagger in (75ms per item).
7. **1.2–1.6s:** Action row and remaining sections fade in.

**Delight rule:** Do not use confetti, paper-plane celebration, or game-like effects here. This is a serious-letter product. A subtle icon scale-in and calm motion are enough. If dispatch is `rejected` or `unknown`, replace the `CheckCircle` with the appropriate warning/error icon and keep the motion even quieter.

**Sound:** No sounds. Ever. This is a formal letter product, not a game.

### Mobile confirmation priority order

On mobile, screen space is limited. Content must prioritize:
1. Success icon + "Payment received" — visible without scrolling
2. Reference number — visible without scrolling, tap-to-copy
3. Dispatch status — visible without scrolling
4. "What happens next" — may require scrolling
5. Download/view actions — may require scrolling
6. QR code, email notice, "Send another" — bottom of page

The "Send another letter" CTA is sticky at the bottom on mobile (`sticky bottom-0 p-4 bg-surface border-t`) so it's always accessible regardless of scroll position.

---

### Sections

#### 9.1 Minimal Header (same as checkout)

#### 9.2 `<ConfirmationCard>`
Centred card (`max-width lg`), `surface` background, `shadow-sm`:

- `CheckCircle` icon — `success` colour, large (48px)
- `<h1>` "Payment received"
- Subtext: `text-secondary` "Your letter has been submitted for dispatch." — NOTE: not "sent" or "delivered"
- Reference number: `<Badge variant="outline" className="font-mono">` REF-XXXXXX
- Copy-to-clipboard button beside reference number

**Important wording rule (from `../05-architecture/system-contracts.md` and `../08-guardrails/non-goals.md`):**  
- "Payment received" ✅ — we know this is true  
- "Submitted for dispatch" ✅ — we know this is true after submission  
- "Your letter is on its way" ❌ — we do not know this  
- "Delivered" ❌ — never show this on the confirmation screen  

#### 9.3 `<DispatchStatusCard>`
Shows the current `DispatchState` with honest language:

| DispatchState | Display | Icon |
|---|---|---|
| `queued` | "Your letter is queued for dispatch" | `Clock` |
| `submitted` | "Submitted for dispatch" | `Send` |
| `accepted` | "Accepted for dispatch" | `Check` |
| `rejected` | "Dispatch was rejected — we're investigating" | `AlertCircle` (error) |
| `unknown` | "Status is being confirmed — we'll update you by email" | `HelpCircle` (warning) |
| `reconciled` | "Status confirmed: [outcome]" | Depends on outcome |

Do not show a tracking number unless the provider has returned one.  
If a tracking reference is available: show it with a `<Tooltip>` noting when tracking may update.  
If no tracking is available: `text-secondary text-sm` "Tracking information is not available for this delivery type." — never show a fake reference.

#### 9.4 "What happens next" Timeline
`<ol>` vertical timeline, 3–4 steps:
1. ✅ "Payment confirmed"
2. ✅ / `pending` "Letter submitted for dispatch"
3. `pending` "Provider processing"
4. `pending` "Further updates depend on provider confirmation"

Each step: icon, title, `text-xs text-secondary` description.  
Pending steps: muted, `text-tertiary`.

#### 9.5 Action Row
- `<Button variant="outline">` "Download receipt (PDF)" — generates/downloads payment receipt
- `<Button variant="ghost">` "View letter (PDF)" — opens rendered letter PDF in new tab (if available)

#### 9.6 QR Code (optional — secondary access mechanism)
`<Card>` "Access this letter on another device":
- QR code encoding `/status/{orderToken}` URL (the paid-order status route, not the draft resume route)
- Caption: `text-xs text-secondary` "Scan to view your order status on another device"
- Not required for MVP if token-based access is not in first release
- **Important:** The QR code is a **secondary** convenience mechanism. The primary access path is the order-status link in the receipt email (see §9.7). Do not build the QR code as the sole or primary way to access order status.

#### 9.7 Email Notice — Multiple Emails
`<Card variant="info">`:
- Mail icon + "A payment receipt has been sent to {email}"
- `text-xs text-secondary` "You'll also receive a dispatch update when your letter is processed."

**Multiple email timeline (defined in `docs/04-product/email-flows.md`):**
The system sends up to 3 separate emails, NOT a single "confirmation":
1. **Payment receipt** — sent immediately when `PaymentState` → `captured`. Contains: amount, reference number, order-status link.
2. **Dispatch accepted** — sent when `DispatchState` → `accepted` (if the provider supplies an acceptance signal). Contains: updated status, tracking reference if available.
3. **Dispatch rejected** (error case) — sent when `DispatchState` → `rejected`. Contains: explanation, next steps, support contact.

The confirmation page copy must reflect this: say "A payment receipt has been sent" (specific), NOT "A confirmation has been sent" (vague). The word "confirmation" implies dispatch success, which we cannot guarantee at this point.

#### 9.8 "Send another letter" CTA
`<Button variant="outline" className="w-full md:w-auto">` "Send another letter" → `/draft/new`

---

### Loading States
- Initial load: `<DispatchStatusCard>` shows `queued` state if dispatch is in progress
- Polling (if implemented): card updates without full page reload; subtle badge pulse
- Receipt download: button spinner while PDF generates

### Error States
| Error | Display |
|---|---|
| Dispatch rejected | `<DispatchStatusCard>` error state + `<ErrorBanner>` "Dispatch failed. We are reviewing your case and will contact you at {email}." |
| Dispatch unknown | `<DispatchStatusCard>` warning state — honest language, no false certainty |
| Receipt unavailable | Download button: "Receipt unavailable — contact support" |
| PDF unavailable | View button hidden or shows "Preview not yet available" |

### Accessibility
- `<h1>` "Payment received"
- Status card: `aria-live="polite"` for status updates
- Timeline: `role="list"`, pending items visually distinct from completed
- QR code: `aria-label="QR code for accessing your letter"` + text alternative URL

---

## 10. Guest Resume and Order Status Entry Points

### Resume route
`/resume/:token`  
`:token` — opaque guest-resume token (not a UUID, not guessable)

### SEO
- `noindex, nofollow`
- **Title:** `Resume your letter — Swiss Mail`

### Layout
`<AppLayout>` or `<MinimalLayout>` — depends on state (see below)

### Emotional intent
**My letter is exactly where I left it.** This page must resolve anxiety ("did I lose my work?") within seconds.

---

### States and Behaviour

The page behaviour depends on what the token resolves to:

#### 10.1 Token valid — draft in progress
- If draft not yet paid → redirect to `/draft/:id` (workspace)
- Show brief notice: `<Toast>` "Welcome back — continuing your letter."

#### 10.2 Token valid — draft paid, dispatch in progress or complete
- Redirect to `/status/:orderToken` when the paid order has an order-access token
- Do not reopen the editable draft workspace
- Do not render paid-order status directly from `/resume/:token`

#### 10.3 Token valid — draft expired
- `<Card>` centred: "This session has expired."
- `text-secondary` "Sessions are kept for a limited time after your last activity."
- `<Button>` "Start a new letter" → `/draft/new`

#### 10.4 Token invalid / not found
- `<Card>` centred: "This link is invalid or has expired."
- Do not expose whether the token ever existed (security)
- `<Button>` "Go to homepage" → `/`

---

### 10.5 Order Status (`/status/:orderToken`)

#### Route
`/status/:orderToken`  
`:orderToken` — opaque paid-order access token, separate from the guest resume token

#### Purpose

This route is the paid-order, read-only status and receipt surface for guest users. It must never
reopen editable draft state.

#### Behaviour

- Show `<ConfirmationCard>` + `<DispatchStatusCard>` using canonical payment and dispatch state
- Show the order reference number and any real provider reference
- Keep "reference" and "tracking" labels separate unless tracking is truly available
- Allow access for the configured order-access window, independent of the shorter guest-draft session
- If the token is invalid or expired: show a calm invalid/expired state and direct the user to support
- No payment CTA
- No editable draft controls

#### Copy rule

The page must stay honest about ambiguity:

- `submitted` is not `accepted`
- `accepted` is not `delivered`
- `unknown` stays unknown until reconciliation confirms otherwise

### Loading State
- Token validation: full-page `<Skeleton>` or centred spinner for <500ms
- Then resolves to one of the four states above

### Accessibility
- All states have a clear `<h1>`
- Error / expired states: not alarming; calm, factual language

---

## 11. Templates Gallery (`/templates`)

### Route
`/templates`

### SEO
- **Title:** `Letter templates for Switzerland — Swiss Mail`
- **Meta description:** `Browse formal Swiss letter templates by category, filter by topic, and start from the right structure in minutes.`
- **Structured data:** `ItemList` for visible template cards, `BreadcrumbList`
- **Canonical:** `https://swissmail.ch/templates`
- Indexed. Search/filter state must not create alternate canonicals.

### Layout
`<MarketingLayout>` — standard marketing shell with `<SiteHeader>` and `<SiteFooter>`.

### Emotional intent
**There is clearly a template for my situation.** This page should feel like an organised catalogue, not a document dump. The user should be able to scan fast, narrow the list without friction, and trust that each entry maps to a real Swiss-style letter flow.

---

### Sections

#### 11.1 Page Intro
- `<h1>` "Letter templates for common situations in Switzerland"
- Supporting copy: `text-secondary max-w-2xl` explaining that templates are starting points, not legal advice (align with `../01-vision/product-scope.md`)
- Optional eyebrow `<Badge variant="outline">` "SEO template library"
- Background stays light: `surface` with subtle `border` bottom divider, not hero-like

#### 11.2 Search + Filter Bar
`<Card>` or sticky inline toolbar under the intro:
- Left: `<Input type="search">` with placeholder "Search templates, topics, or recipients"
- Right / below on mobile: category chips using `<Badge>` or chip-style `<Button variant="outline">`
- Categories, in this order:
  - Cancellations
  - Complaints
  - Notices
  - Demand Letters
  - Official Correspondence
  - Insurance Claims
- Include "All templates" reset chip
- Result count shown in `text-sm text-secondary`, e.g. "`N` templates"
- Search runs against title, short description, common aliases, and category label
- Filter interactions are instant; do not full-page reload for local filtering

**Behaviour:**
- If a dedicated SEO landing page exists for a template, card click goes to `/use-cases/:slug`
- If no editorial landing page exists yet, primary CTA goes directly to `/draft/new?useCase=:slug`
- Search/filter state may live in the query string for shareability, but canonical remains `/templates`

#### 11.3 Templates Grid
- Use `<EntryCard>` pattern adapted for a larger catalogue
- Grid: 1 column on mobile, 2 columns on tablet, 3 columns on desktop
- `gap-4 md:gap-6`, equal-height cards, no masonry
- Cards ordered by commercial priority first, then alphabetically within category
- Section header row above grid:
  - Left: active category label or "All templates"
  - Right: sort stays fixed to "Recommended" for MVP; no user-facing sort dropdown yet

#### 11.4 Template Card Anatomy
Each card contains:
- Category chip in `accent-light` or `surface-subtle`
- Template title
- One-sentence description in `text-secondary text-sm`
- Typical recipients or scenarios line, e.g. "Landlord, insurer, telecom provider"
- Optional "Popular" or "Recommended" `<Badge>` when backed by real usage/config, never fabricated
- Footer CTA:
  - Primary text: "View template" when destination is `/use-cases/:slug`
  - Primary text: "Start with this template" when destination is `/draft/new?useCase=:slug`

Visual rules:
- Card background: `surface`
- Hover: `border-primary/40`, subtle lift, no aggressive animation
- Entire card is clickable, but CTA remains explicit for accessibility and clarity

#### 11.5 Supporting Trust Band
Slim reassurance row below the grid:
- "Swiss-style formal formatting"
- "Mobile-first drafting"
- "Pay only when you send"

This is a lightweight `<ConfidenceBlock>` treatment, not a second sales page.

---

### Loading States
- Initial page render should be fully server-rendered / statically generated where possible; no blocking spinner for the shell
- If templates are hydrated client-side for filtering, show 6–9 `<Skeleton>` cards only inside the results grid
- On active search/filter changes, prefer immediate result swap over loading chrome

### Error States
| Error | Display |
|---|---|
| Template catalogue unavailable | Inline `<ErrorBanner>` above grid: "Templates are temporarily unavailable. You can still start a blank draft." + Button → `/draft/new` |
| Search index failure | Fall back to unfiltered grid + non-blocking notice; do not blank the page |

### Empty State
If search/filter returns no results:
- Centred `<Card>` with `surface-subtle` background
- `<h2>` "No templates match that search"
- `text-secondary` "Try a different keyword or browse all categories."
- Actions:
  - `<Button variant="outline">` "Clear filters"
  - `<Button>` "Start a blank letter" → `/draft/new`

### Accessibility
- Search input has a persistent `<label>`; placeholder is not the only instruction
- Category chips expose pressed state via `aria-pressed`
- Results region uses `aria-live="polite"` so result count updates are announced
- Card CTA labels include the template name for screen readers
- Decorative icons inside cards use `aria-hidden="true"`

---

## 12. Error Pages (404, 500)

### Routes
- 404: catch-all route
- 500: server error route / framework error boundary with a static HTML fallback

### SEO
- `noindex, nofollow` for both
- No canonical tags that compete with real content pages

### Layout
`<MinimalLayout>` for both states.

### Emotional intent
**Even when something fails, the product still feels calm and usable.** These pages must absorb frustration, not amplify it. Friendly language beats technical detail.

---

### Sections

#### 12.1 404 Page
Centred `<Card>`:
- Optional illustration (simple, low-contrast, decorative)
- `<h1>` "Page not found"
- Body copy: "The page you're looking for doesn't exist or has moved."
- CTA row:
  - `<Button>` "Go to homepage" → `/`
  - `<Button variant="outline">` "Draft a letter" → `/draft/new`

Rules:
- No visible "404" code in the UI
- Tone stays friendly, not jokey

#### 12.2 500 Page
Centred `<Card>` in the same layout:
- `<h1>` "Something went wrong on our end"
- Body copy: "We're looking into it. Please try again in a few minutes."
- CTA row:
  - `<Button>` "Try again" → reload current page
  - `<Button variant="outline">` "Go to homepage" → `/`
- Support line in `text-sm text-secondary` with `mailto:support@swissmail.ch`

Implementation note:
- The 500 page must exist as a static HTML fallback so it still renders if the app shell fails
- Keep dependencies minimal; no fragile client-only widgets

#### 12.3 Shared Styling Rules
- Centre content vertically on taller screens; top-align slightly on very small mobile screens
- Card width: comfortable on mobile first, max-width `md`
- Background stays neutral `surface-subtle`; no alarming red wash
- Brand mark may appear, but do not show navigation chrome that suggests the page is partially functional

---

### Loading States
None. Error pages should render immediately from server/static output without waiting on client data.

### Error States
These pages are the terminal error states. They must not trigger another layer of complex error UI or expose raw stack traces, request IDs, or provider codes to the user.

### Empty State
No empty state.

### Accessibility
- Each page has a clear `<h1>`
- CTA row remains keyboard reachable in logical order
- Decorative illustration uses empty `alt=""`
- 500 fallback page must remain readable with CSS or JS partially unavailable

---

## 13. Legal Pages (`/privacy`, `/terms`, `/imprint`)

### Routes
- `/privacy`
- `/terms`
- `/imprint`

### SEO
- Indexed with unique titles per page
- Suggested titles:
  - `/privacy` → `Privacy policy — Swiss Mail`
  - `/terms` → `Terms of service — Swiss Mail`
  - `/imprint` → `Imprint — Swiss Mail`
- Each page includes locale-specific canonical + `hreflang` tags for `de-CH`, `fr-CH`, `it-CH`, `en-CH`

### Layout
`<MarketingLayout>` with a single content column (`max-w-prose`) and normal header/footer.

### Emotional intent
**This is serious, readable, and transparent.** Legal pages should feel calm and professionally maintained. Users should be able to find the right section fast without parsing walls of text.

---

### Sections

#### 13.1 Shared Page Header
At the top of each page:
- `<h1>` page title
- `text-secondary text-sm` short description of the document purpose
- "Last updated" date shown near the title
- Link or `<Button variant="outline" size="sm">` to download a PDF version

The header stays compact. This is not a marketing hero.

#### 13.2 Auto-Generated Table of Contents
- Generated from visible `<h2>` headings on the page
- Desktop: sticky sidebar or inline block above the content column
- Mobile: collapsible `<Accordion>` labeled "On this page"
- Anchors scroll to the relevant section with consistent heading offsets below sticky header

#### 13.3 Prose Body
- Long-form rich text only; no calculators, forms, or promotional modules
- Use a readable prose rhythm with generous spacing and clear `h2` / `h3` hierarchy
- Links styled with `primary` colour and visible underline on hover/focus
- Body copy width constrained to reading measure; avoid full-width paragraphs

#### 13.4 Route-Specific Content Requirements
`/imprint`
- Company name
- Postal address
- Contact details
- Registration details required for a Swiss `.ch` presence

`/terms`
- Service description
- User obligations
- Payment
- Liability
- Data handling reference
- Dispute resolution
- Governing law (Swiss)

`/privacy`
- Data collected
- Purpose of processing
- Storage location and processing regions, exactly as approved in the final privacy text
- Retention
- Third parties: Stripe, Swiss Post, Google Places API
- User rights
- Contact

#### 13.5 Locale Availability
- All three pages are available in all four locales
- Language switching keeps users on the equivalent legal page when translation exists
- Last-updated date format follows locale rules from `../05-architecture/i18n-rules.md`

---

### Loading States
- Prefer static rendering; no loading skeletons on normal navigation
- If PDF generation is asynchronous, the download button may show a spinner after click only

### Error States
| Error | Display |
|---|---|
| PDF unavailable | Inline text: "PDF version unavailable right now" while HTML page remains usable |
| Missing locale variant | Fallback to default locale with clear language notice; do not 404 if source content exists |

### Empty State
No empty state. If legal content is unavailable, show a route-level `<ErrorPage>` rather than an empty shell.

### Accessibility
- Proper heading hierarchy: one `<h1>`, nested `<h2>` / `<h3>` only as needed
- Table of contents is a real list of anchor links
- PDF link text names the document, e.g. "Download Privacy Policy PDF"
- Legal copy meets readable contrast and line-height standards

---

## 14. Admin Dashboard (`/{locale}/admin/*`)

### Route
`/{locale}/admin/*` — protected, internal only

### SEO
- `noindex, nofollow` on all admin routes
- Not publicly accessible. Authentication required.

### Layout
`<AdminLayout>` — sidebar navigation + top bar.

### Emotional intent
**I can see everything I need and act quickly.** Admin users are internal operators handling support, dispatch issues, and system health. Density is acceptable; consumer-style polish is not required.

---

### Route Map
| Route | Purpose |
|---|---|
| `/{locale}/admin/overview` | Overview dashboard |
| `/{locale}/admin/letters` | Letter queue and status list |
| `/{locale}/admin/letters/:id` | Letter detail — full draft, dispatch events, payment events |
| `/{locale}/admin/dispatch` | Dispatch queue, failed/ambiguous states |
| `/{locale}/admin/payments` | Payment list, refund actions |
| `/{locale}/admin/sessions` | Active and expired sessions |
| `/{locale}/admin/files` | File asset browser, retention status |
| `/{locale}/admin/risk` | Suspicious activity flags and escalation queue |

### Overview Dashboard (`/{locale}/admin/overview`)
- Metric cards: letters today, pending dispatch, failed dispatch, payments today, refunds pending
- Recent activity feed: last N events (dispatch state changes, payment events, support flags)
- No fake real-time unless WebSocket connection is confirmed

### Letter Detail (`/{locale}/admin/letters/:id`)
- Full draft content
- Timeline of state transitions (payment → dispatch → status events)
- Raw provider references (for support, not exposed to frontend users)
- Refund / re-dispatch actions (approval-gated in UI)

### Admin Accessibility
- Full keyboard navigation
- Table sorting and filtering keyboard-accessible
- Admin tools do not need to match consumer polish but must be functional and accessible

---

### Security Note
Admin routes must be protected at both the middleware and API level. Do not rely on frontend routing alone. See `../07-operations/security-and-privacy.md`.

---

## Appendix A: Route Summary

| Route | Layout | Auth | SEO | Notes |
|-------|--------|------|-----|-------|
| `/` | `MarketingLayout` | None | Yes | SSG preferred |
| `/how-it-works` | `MarketingLayout` | None | Yes | SSG |
| `/pricing` | `MarketingLayout` | None | Yes | Prices from config |
| `/use-cases/:slug` | `MarketingLayout` | None | Yes | SSG per slug |
| `/templates` | `MarketingLayout` | None | Yes | Searchable template catalogue; `ItemList` structured data |
| `/draft/new` | `AppLayout` | None (guest) | No | Guest-first |
| `/draft/:id` | `AppLayout` | Session token | No | Core product |
| `/draft/:id/review` | `AppLayout` | Session token | No | |
| `/draft/:id/checkout` | `MinimalLayout` | Session token | No | Stripe embedded |
| `/draft/:id/confirmation` | `MinimalLayout` | Session token | No | Honest status only |
| `/resume/:token` | `AppLayout` / `MinimalLayout` | Resume token | No | Guest-draft recovery only |
| `/status/:orderToken` | `MinimalLayout` | Order-access token | No | Paid-order status, receipt, final artifact access |
| `404 catch-all` | `MinimalLayout` | None | No | Friendly not-found page |
| `/500` | `MinimalLayout` | None | No | Static fallback for server errors |
| `/privacy` | `MarketingLayout` | None | Yes | Legal prose, PDF download, all locales |
| `/terms` | `MarketingLayout` | None | Yes | Legal prose, PDF download, all locales |
| `/imprint` | `MarketingLayout` | None | Yes | Swiss-required company details |
| `/{locale}/admin/*` | `AdminLayout` | Admin auth | No | Internal only |

---

## Appendix B: Shared Error Pattern

All pages use the same error component hierarchy:

| Severity | Component | When to use |
|----------|-----------|-------------|
| Field-level | Inline `text-error text-sm` below field | Form validation |
| Inline notice | `<ErrorBanner>` (dismissable) | Non-blocking failures |
| Full-screen | `<ErrorPage>` centred card | Route-level failures |
| Modal | `<Dialog>` | Session expiry, destructive confirmation |

Error messages follow the taxonomy in `../05-architecture/error-taxonomy.md`. Never expose raw provider error codes to users.

---

## Appendix C: i18n Notes

All user-facing strings are in the i18n layer. This document uses English as the reference language. See `../05-architecture/i18n-rules.md` for:
- Locale routing uses `/[locale]/...` prefixes (`/de`, `/fr`, `/it`, `/en`)
- String key conventions
- Formal vs informal register per locale (Swiss German: formal `Sie`)
- Date and number formatting (Swiss locale: `.` thousands separator, `'` in CH-style, CHF currency)

---

*This document covers wireframe-level specifications. Visual polish, exact copy, and illustration assets are specified separately in `02-brand/design-system.md`, `02-brand/voice-and-tone.md`, and assets to be produced.*

---

## Appendix D: Implementation Danger Zones

> **Purpose:** Explicit warnings for areas where an implementing LLM is most likely to produce incorrect or generic behavior. Read this before implementing any route.

### DZ-1: Do not build a generic chatbot

The `<ConversationPanel>` is a **guided workspace**, not a free-form chat interface. The AI follows a structured state machine (§6.2 "Conversation Flow State Machine") with defined states, transitions, and quick-reply chips. Implementation must not:
- Allow the AI to discuss topics unrelated to the current letter
- Implement a general-purpose conversation history that persists across sessions
- Use a generic "chat UI" component library without adapting it to the state machine model
- Show a greeting like "Hello! How can I help you today?" — the first message is always contextual

### DZ-2: Do not collapse dispatch states

The confirmation page (§9) shows the canonical dispatch states: `queued`, `submitted`,
`accepted`, `rejected`, `unknown`, and `reconciled`. An implementing LLM may be tempted to
simplify these into "sent" / "delivered" / "failed". **Do not.** Each state has specific copy and
visual treatment defined in `system-contracts.md`. "Submitted" is NOT "accepted". "Accepted" is
NOT "delivered". Delivery confirmations, if any, are a separate downstream status concept and must
not overwrite the dispatch state machine.

### DZ-3: Do not hardcode prices

Every price in the UI comes from a pricing service/config — never from a constant in the component. All prices use `{formatted*}` placeholders that are resolved at render time. See §6.4 "Price Estimate Timing" for when and how prices appear.

### DZ-4: Do not invent AI conversation prompts

The conversation examples in §6.2 are **UX illustrations**, not backend prompt definitions. The actual AI prompts, response formatting, temperature settings, and model selection are defined in `docs/04-product/ai-provider-and-prompts.md` and `docs/04-product/letter-generation.md`. Do not copy UX example strings into backend prompt templates.

### DZ-5: Do not skip the blank template outline

Before the first draft is generated, the `<LetterPreview>` shows a blank template outline with zone placeholders (§6.3). An implementing LLM may show an empty white rectangle or a loading spinner instead. This is wrong — the blank template is a deliberate UX signal that communicates "your letter will appear here" and makes the first-draft reveal feel magical by contrast.

### DZ-6: Do not build payment confirmation from client state

Payment success must come from the server (Stripe webhook), not from client-side inference after `confirmPayment()` resolves. The checkout → confirmation transition (§8→§9) must wait for server-side confirmation. See §8.4 "Mid-Payment Navigation Handling" for edge cases.

### DZ-7: Do not use generic error messages

Every error state in this document has specific copy. An implementing LLM may be tempted to use "Something went wrong" as a catch-all. This violates the voice-and-tone rules (`02-brand/voice-and-tone.md` §7). Every error must say: what failed, why (if known), and what the user can do.

### DZ-8: Do not build mobile as a compressed desktop

Mobile is not "desktop but smaller." The mobile workspace (§6 mobile layout) has fundamentally different interaction patterns: conversation is full-screen, preview is a separate workspace toggle, and the composer stays pinned while only the thread scrolls. An implementing LLM may apply responsive breakpoints to the desktop layout and call it done. This produces a cramped, unusable mobile experience. Build mobile-first, then expand for desktop.

### DZ-9: Do not fake the typing indicator

The AI typing indicator (3-dot animation) in the conversation panel must represent real server-side processing. It must not:
- Start before the request is sent to the backend
- Continue after the response is received (stop within 100ms of response arrival)
- Loop indefinitely without a timeout (max 30s, then show "Taking longer than expected…")
- Be animated independently of the actual AI generation state

### DZ-10: Do not implement auto-scroll naively

The conversation panel has specific scroll behavior rules (see `component-library.md` `ConversationPanel` "Scroll behavior"). Auto-scroll-to-bottom must pause when the user has scrolled up. A "↓ New messages" pill appears instead. Naive "always scroll to bottom" steals the user's reading position and is one of the fastest ways to make the product feel hostile.

### DZ-11: Do not build the conversation input as a single-line text field

The conversation input is an auto-resize `<Textarea>` (1–4 rows), not an `<Input type="text">`. Users sometimes type multi-line messages. The `enterkeyhint="send"` attribute enables the "Send" keyboard action on mobile. `Shift+Enter` creates a new line; `Enter` alone sends.

### DZ-12: Do not omit the legal checkbox from checkout

The legal checkbox (§8) is required before payment. It must reference the Terms of Service by link and include the "not a legal service" disclaimer. This is a compliance requirement, not a nice-to-have. An implementing LLM may skip it because it's not part of the Stripe `<PaymentElement>` and seems like boilerplate.
