# Episto — Page Specifications — Part 1

> Split from [page-specifications.md](page-specifications.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- Conventions Used in This Document
- Global Experience Bar
- 1. Homepage (`/`)
- 2. How It Works (`/how-it-works`)
- 3. Pricing (`/pricing`)

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

| Key                 | Description                                                           |
| ------------------- | --------------------------------------------------------------------- |
| `<MarketingLayout>` | Full-width marketing shell: `<SiteHeader>` + content + `<SiteFooter>` |
| `<AppLayout>`       | Application shell: minimal sticky header, no marketing footer         |
| `<MinimalLayout>`   | Stripped shell for checkout and confirmation — reduces distraction    |
| `<AdminLayout>`     | Sidebar + top bar, restricted to admin role                           |

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

- **Title:** `Episto — Send formal Swiss letters from your phone`
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

- Logo (`<LetterIcon>` + `Episto` wordmark) — left
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
- Subheadline: `text-lg text-inverse/80` — "Describe what you need. Episto drafts it, formats it to Swiss standards, and prepares it for postal dispatch."
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

| Step | Icon                     | Title                  | Body                                                                   |
| ---- | ------------------------ | ---------------------- | ---------------------------------------------------------------------- |
| 1    | `MessageCircle` (Lucide) | "Describe your letter" | "Type or dictate what you need. Episto asks only what's missing."      |
| 2    | `FileText`               | "Review and customise" | "See your letter take shape in real time. Edit any section directly."  |
| 3    | `Send`                   | "Pay and send"         | "Choose standard or registered post. Pay by card. We handle the rest." |

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

| Slug                      | Icon          | Title                     | Subtext                                                       |
| ------------------------- | ------------- | ------------------------- | ------------------------------------------------------------- |
| `lease-cancellation`      | `Home`        | "Lease cancellation"      | "End your rental agreement on the right legal footing"        |
| `insurance-cancellation`  | `Shield`      | "Insurance cancellation"  | "Cancel any policy with a compliant written notice"           |
| `contract-termination`    | `FileX`       | "Contract termination"    | "Terminate service contracts, subscriptions, or agreements"   |
| `formal-complaint`        | `Megaphone`   | "Formal complaint"        | "Lodge a complaint that gets taken seriously"                 |
| `official-correspondence` | `Stamp`       | "Official correspondence" | "Write to authorities, municipalities, or government offices" |
| `demand-letter`           | `AlertCircle` | "Demand letter"           | "Request what you're owed — clearly, formally, in writing"    |

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

1. "Is Episto legally valid?" — Answer: clarifies formal letter vs. legal service. Non-legal-service disclaimer (see `../01-vision/product-scope.md`).
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

| Column    | Links                                     |
| --------- | ----------------------------------------- |
| Product   | How it works, Pricing, Use cases          |
| Legal     | Privacy policy, Terms of service, Imprint |
| Support   | FAQ, Contact                              |
| Languages | de · fr · it · en                         |

Bottom row: Copyright line, `<SwissCrossIcon>` "Built for Switzerland" note, social links (if applicable).  
Background: `surface-subtle`, `border-strong` top border.

---

### Responsive Summary — Homepage

| Breakpoint          | Hero                       | Steps                 | Use Cases | Pricing         |
| ------------------- | -------------------------- | --------------------- | --------- | --------------- |
| mobile (<768px)     | Stacked, mockup below CTA  | Vertical stack        | 1 col     | Full-width card |
| tablet (768–1024px) | 50/50 split                | 3-col horizontal      | 2 col     | Centred card    |
| desktop (>1024px)   | 55/45 split + float mockup | 3-col with connectors | 3 col     | Centred card    |

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

- **Title:** `How Episto works — AI-assisted formal letters`
- **Meta description:** `See exactly how Episto drafts, formats, and sends your Swiss formal letters — step by step.`
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
- Heading `<h1>`: "How Episto works"
- Subheading: "From first word to letterbox — here's what happens at every step."

#### 2.3 Detailed Steps

Alternating two-column rows (icon/illustration left + text right, then flip):

**Step 1 — Start your letter**

- User types or dictates their intent ("I need to cancel my gym membership")
- Episto recognises the letter type and surfaces the right template logic
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

- Episto renders the final PDF
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

- **Title:** `Pricing — Episto`
- **Meta description:** `Transparent public pricing for standard and registered letters, with a live simulator and exact total confirmation before payment.`
- **Structured data:** Could include `Offer` / pricing schema when prices are locked

### Layout

`<MarketingLayout>`

### Emotional intent

**No tricks. I know exactly what I'll pay.** Pricing anxiety is high in postal services. The page must preempt every question about cost.

---

### Sections

#### 3.1 Hero

- `<h1>` "Simple, honest pricing"
- Subheading: short 3-4 word line that says pricing is visible upfront.
- No hero-side pricing panel or explainer box.

#### 3.2 Primary totals card

- Card title: `Choose your delivery`
- Show two equal blocks only:
  - `Standard`
  - `Registered`
- Each block should show:
  - one clear total price
  - caption: `1-page letter`
  - direct increment rows only
- Approved increment rows:
  - Standard: `Each additional page`
  - Registered: `Registered delivery`
  - Registered: `Each additional page`
- Do not add a supporting paragraph above or below the blocks.

#### 3.3 Pricing simulator

- Card title: `Pricing simulator`
- No intro paragraph.
- Controls:
  - `Letter type` segmented toggle
  - `Pages` compact stepper
- Result area:
  - live summary like `Standard · 3 pages`
  - total price on the right
  - one short note for `Each additional page`
- Do not use a table, comparison grid, dropdown, or horizontal-scroll pricing area.
- Do not show freshness, sync, provider, or reference wording in this area.

Do **not** invent line items or add-ons the stored public data cannot prove.

#### 3.4 What's Included / What's Not Included

Two cards with titles only, no eyebrow labels and no body paragraphs.

Included list:

- Drafting assistance and structured review
- Swiss-standard letter formatting
- PDF render
- Postal submission handling
- Receipt and confirmation handling

Honest counter-list:

- Legal advice or review
- Guaranteed delivery or guaranteed tracking
- Translation or localisation review
- Custom document design work

#### 3.5 FAQ (Pricing-specific)

- Title: `Common questions`
- No eyebrow and no intro paragraph.
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

If no stored pricing snapshot is available: show one muted notice "Pricing information is temporarily unavailable. Please try again shortly." Do not fabricate prices.

### Stale State

If a stored snapshot exists but is stale, still show the last successful prices and keep checkout confirmation truthful. Do not add a dedicated sync banner, freshness badge, or last-synced timestamp to the public pricing page.

---
