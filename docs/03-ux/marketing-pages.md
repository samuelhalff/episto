# Swiss Mail Marketing Pages Specification

> **Status:** Canonical — implement from this document.  
> **Scope:** Homepage, use-case landing pages, How It Works page, Pricing page.  
> **Audience:** Frontend developers, designers, copywriters.  
> **Last updated:** 2026-03
> **Provider truth:** For Swiss Post, tracking, dispatch, and delivery-copy claims, also consult
> [`../08-guardrails/swiss-post-api-reference-map.md`](../08-guardrails/swiss-post-api-reference-map.md).

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Homepage Blueprint](#2-homepage-blueprint)
3. [Use-Case Landing Page Template](#3-use-case-landing-page-template)
4. [How It Works Page](#4-how-it-works-page)
5. [Pricing Page](#5-pricing-page)
6. [Conversion Optimization](#6-conversion-optimization)
7. [Responsive Behavior](#7-responsive-behavior)
8. [SEO & Structured Data](#8-seo--structured-data)
9. [Component Inventory](#9-component-inventory)

---

## 1. Design Principles

These rules govern every marketing page. They are not suggestions — violating them produces a product that looks like every other SaaS rather than the trusted Swiss brand Swiss Mail needs to be.

### 1.1 Visual Language

| Principle | Implementation | Anti-pattern |
|-----------|---------------|--------------|
| **Full-viewport heroes** | `min-h-screen` with vertical centering; hero text lands at ~35% viewport height | Half-height banners, cramped headers |
| **Generous whitespace** | Section padding `py-24` (desktop) / `py-16` (mobile) minimum | Packed-in sections with no breathing room |
| **Typography as architecture** | Headlines do the heavy lifting — large, confident, centered or left-flush | Small timid headlines, body-weight section titles |
| **Strategic dark sections** | Navy/dark backgrounds for Hero, Trust, and Final CTA only; white for content | All-dark or all-white pages with no rhythm |
| **No stock photography** | Use product screenshots, illustrated icons, subtle gradients, mockup frames | Generic handshake photos, envelope clipart |
| **Scroll animation** | Stagger-reveal each section with a single `fade-up` or `fade-in` on enter; 75ms stagger between items (see micro-interactions.md §5 for canonical timing) | Bouncing, spinning, or parallax-heavy animations |

### 1.2 Color Usage on Marketing Pages

Derived from the design system — see `docs/02-brand/design-system.md` for tokens.

| Section type | Background | Headline | Body | CTA |
|---|---|---|---|---|
| Hero | `#1E3A5F` → `#2D5186` gradient | `text-inverse` (`#FFF`) | `text-inverse/80` | Accent (`#B85C38`) primary, ghost white secondary |
| Content (odd) | `surface` (`#FFF`) | `text-primary` | `text-secondary` | Primary (`#1E3A5F`) |
| Content (even) | `surface-subtle` (`#F8FAFC`) | `text-primary` | `text-secondary` | Primary |
| Trust / Privacy | `#0F172A` (deep navy) | `text-inverse` | `text-inverse/70` | Ghost white |
| Final CTA band | `#B85C38` → `#A04E2E` gradient | `text-inverse` | `text-inverse/90` | White solid |
| Footer | `#0F172A` | `text-inverse` | `text-inverse/60` | — |

### 1.3 Typography Scale (Marketing)

| Element | Mobile | Desktop | Weight | Notes |
|---------|--------|---------|--------|-------|
| Hero headline | `text-4xl` (36px) | `text-6xl` (60px) | 700 | Line height 1.1; tight tracking `-0.02em` |
| Hero subheadline | `text-lg` (18px) | `text-xl` (20px) | 400 | Relaxed; `text-inverse/80` |
| Section title | `text-2xl` (24px) | `text-4xl` (36px) | 700 | |
| Section label | `text-xs` (12px) | `text-sm` (14px) | 500 | All-caps, tracked `0.1em`, muted color |
| Card title | `text-lg` (18px) | `text-xl` (20px) | 600 | |
| Card body | `text-sm` (14px) | `text-base` (16px) | 400 | |
| CTA button | `text-base` (16px) | `text-lg` (18px) | 600 | |

### 1.4 Imagery and Illustration Style

- **Product screenshots**: Use real app UI inside a clean device frame (phone or browser chrome). No perspective tilt above 5°. Subtle drop shadow, never hard shadow.
- **Icons**: Lucide icon set preferred (matches design system). Display inside a circle with `accent-light` (`#FBF0EB`) background for icon sections. Size: 24px icon, 48px circle container.
- **Hero visual**: A floating phone mockup showing the letter drafting UI. Shadow: `0 24px 64px rgba(0,0,0,0.25)`. Subtle rotation: `rotate-2` or `rotate-[-2deg]`.
- **Backgrounds**: Subtle radial gradients are acceptable for hero and CTA bands. No texture overlays. No pattern fills.

### 1.5 Animation Specification

```
Entry animation:   opacity 0→1, translateY 20px→0
Duration:          400ms
Easing:            cubic-bezier(0.16, 1, 0.3, 1)  (ease-out-expo)
Trigger:           IntersectionObserver, threshold 0.15
Stagger (cards):   75ms per item
Reduced motion:    prefers-reduced-motion → skip transform, keep opacity only
```

---

## 2. Homepage Blueprint

The homepage is a single long-scroll page. Each section has one purpose: build trust, explain value, or drive action. No section is decorative.

---

### 2.1 Hero Section

**Purpose:** First impression — communicate what Swiss Mail is and get users to start drafting.

```
┌─────────────────────────────────────────────────┐
│  Swiss Mail          [DE | FR | IT | EN]     │  ← Nav: transparent, sticky on scroll
│─────────────────────────────────────────────────│
│                                                  │
│  Formelle Briefe per    ┌──────────────────┐    │
│  Handy — in Minuten.    │  [App mockup]    │    │
│                         │  floating phone  │    │
│  AI-assisted drafting.  │  screenshot      │    │
│  Postal delivery in CH. └──────────────────┘    │
│  No account needed.                             │
│                                                  │
│  [Draft your letter ▶]  [See how it works]      │
│                                                  │
│  · No signup required  · From {formattedBasePrice}   │
│  · Privacy-conscious infrastructure                  │
└─────────────────────────────────────────────────┘
```

**Specs:**

| Element | Spec |
|---------|------|
| Background | Gradient: `#1E3A5F` top-left → `#2D5186` bottom-right, plus subtle radial highlight center |
| Minimum height | `min-h-screen` |
| Nav | Transparent until scroll >80px, then `bg-primary/95 backdrop-blur-sm`; fixed |
| Headline (DE) | "Wichtige Briefe — professionell verfasst, bereit zum Versand" |
| Headline (EN) | "Serious letters — professionally drafted, ready to send" |
| Subheadline | "Describe what you need. Get a properly structured formal letter in minutes, prepared for postal delivery in Switzerland." |
| Primary CTA | "Draft your letter" — `bg-accent text-white`, `h-12 px-8 text-lg font-semibold rounded-lg` |
| Secondary CTA | "See how it works" — ghost, white border, same height |
| CTA link | Primary → `/draft/new`; Secondary → `#how-it-works` anchor |
| Trust micro-copy | "No signup required · From {formattedBasePrice} · Privacy-conscious infrastructure" — `text-xs text-white/60`, below CTAs |
| Visual (desktop) | Phone mockup, right half, `absolute` positioned, subtle `rotate-2`, shadow `0 24px 64px rgba(0,0,0,0.3)` |
| Visual (mobile) | Below text block, full-width, centered, no rotation |

**Headline variants by locale:**

| Locale | Headline | Subheadline |
|--------|----------|-------------|
| `de-CH` | "Wichtige Briefe — professionell verfasst, bereit zum Versand" | "Beschreiben Sie Ihr Anliegen. Erhalten Sie in Minuten einen korrekt strukturierten Brief, vorbereitet für die postalische Zustellung in der Schweiz." |
| `fr-CH` | "Lettres importantes — rédigées avec soin, prêtes à l'envoi" | "Décrivez votre besoin. Recevez en quelques minutes une lettre correctement structurée, préparée pour l'envoi postal en Suisse." |
| `it-CH` | "Lettere importanti — redatte con cura, pronte per l'invio" | "Descrivi ciò di cui hai bisogno. Ricevi in pochi minuti una lettera correttamente strutturata, preparata per l'invio postale in Svizzera." |
| `en-CH` | "Serious letters — professionally drafted, ready to send" | "Describe what you need. Get a properly structured formal letter in minutes, prepared for postal delivery in Switzerland." |

> **Mobile-specific messaging:** On mobile viewports, append to the subheadline: "Dictate from your phone — no typing needed." This targets phone-first users (Anna persona).

---

### 2.2 Social Proof Strip

**Purpose:** Immediately after the hero, reset anxiety. Short and quiet.

```
┌─────────────────────────────────────────────────┐
│  [🔒] Privacy-first infra  [📬] Postal delivery │
│  [🔐] Encrypted in transit and at rest         │
└─────────────────────────────────────────────────┘
```

**Specs:**

| Element | Spec |
|---------|------|
| Background | `surface-subtle` (`#F8FAFC`) |
| Height | `py-5` |
| Layout | Horizontal flex, centered, `gap-8` (desktop) / `gap-5 flex-wrap` (mobile) |
| Items | Icon (16px, `text-secondary`) + label (`text-sm font-medium text-secondary`) |
| Labels | "Postal delivery in Switzerland" · "Privacy-conscious infrastructure" · "Encrypted in transit and at rest" · "No subscription required" |
| Border | `border-y border-border` |

> **Note:** Do not include "Swiss Post" logo or partner logos until confirmed commercial relationship exists. Use descriptive text badges only. See `docs/08-guardrails/provider-certainties.md`.

---

### 2.3 How It Works

**Purpose:** Explain the core flow in three steps. Remove "how does this even work?" uncertainty.

**Specs:**

| Element | Spec |
|---------|------|
| Background | `surface` white |
| Section padding | `py-24` |
| Section label | "HOW IT WORKS" — `text-xs font-semibold tracking-widest text-accent uppercase mb-3` |
| Title | "Three steps to a professional letter" |
| Layout | Three columns `grid-cols-3 gap-8` (desktop) / `grid-cols-1 gap-6` (mobile) |
| Entry animation | Stagger 75ms per card, `fade-up` |

**Card structure:**

```
┌───────────────────────────────┐
│  ①  [Icon in accent circle]  │  ← Step number badge: absolute top-right of icon area
│                               │
│  Describe                     │  ← Card title: text-xl font-semibold
│                               │
│  Tell us what you need in     │  ← Description: text-sm text-secondary
│  your own words — or          │
│  dictate it.                  │
└───────────────────────────────┘
```

**Three cards:**

| Step | Icon | Title | Description |
|------|------|-------|-------------|
| 1 | `MessageCircle` | Describe | "Tell us what you need — a cancellation, a complaint, a notice. In your own words, or dictate it." |
| 2 | `FileText` | Review | "See a professionally structured letter take shape. Edit the tone, refine the wording, review every detail." |
| 3 | `Send` | Send | "Confident it's right? Pay once — we generate the final PDF and submit it for postal dispatch." |

---

### 2.4 AI Differentiator

**Purpose:** Show what makes Swiss Mail meaningfully different from "just mail a PDF yourself". Three alternating feature blocks.

**Layout pattern:** Alternating `text-left / image-right` then `image-left / text-right`. On mobile: image above text, full-width.

**Section container:** `py-24 bg-white` with `max-w-6xl mx-auto`

---

**Block 1 — "Professionally structured, not just typed"**

| Element | Spec |
|---------|------|
| Visual | Screenshot of conversation/guided-drafting UI inside a browser frame |
| Headline | "Professionally structured, not just typed" |
| Body | "Tell Swiss Mail what the letter is about — a cancellation, a complaint, a landlord dispute. It asks the right questions, picks the correct structure, sets the right tone, and produces a letter that looks like it came from a professional." |
| Layout | Text left, image right (desktop) |

---

**Block 2 — "Dictate from anywhere"**

| Element | Spec |
|---------|------|
| Visual | Phone mockup with microphone recording indicator visible |
| Headline | "Dictate from anywhere" |
| Body | "On the train, in your car, between meetings. Speak your situation in plain language — Swiss Mail turns it into a properly formatted, correctly toned formal letter. In any Swiss language." |
| Layout | Image left, text right (desktop) |

---

**Block 3 — "Review every detail before you send"**

| Element | Spec |
|---------|------|
| Visual | Letter preview mockup — paper-white card showing A4 layout with visible content zones highlighted |
| Headline | "Review every detail before you send" |
| Body | "See exactly what will land in the letterbox. Tap any zone to edit — subject, tone, closing. The preview updates in real time. You don't send until you're confident it's right." |
| Layout | Text left, image right (desktop) |

---

### 2.5 Use Cases Grid

**Purpose:** Signal the breadth of situations Swiss Mail handles. Drive to targeted landing pages.

**Specs:**

| Element | Spec |
|---------|------|
| Background | `surface-subtle` (`#F8FAFC`) |
| Section label | "PERFECT FOR" |
| Title | "For every formal letter you've been putting off" |
| Grid | `grid-cols-2 gap-4` (mobile) / `grid-cols-3 gap-6` (desktop) |
| Card style | `bg-white rounded-xl p-6 border border-border hover:border-primary hover:shadow-md transition-all cursor-pointer` |
| Card hover | Border turns `primary`, faint lift shadow |
| Card link | Each card links to `/use-cases/{slug}` |

**Use-case cards (MVP set):**

| Slug | Icon | Title | Description |
|------|------|-------|-------------|
| `lease-cancellation` | `Home` | Lease cancellation | "End your rental agreement on the right legal footing." |
| `insurance-cancellation` | `Shield` | Insurance cancellation | "Cancel any policy with a compliant written notice." |
| `contract-termination` | `FileX` | Contract termination | "Terminate service contracts, subscriptions, or agreements." |
| `formal-complaint` | `Megaphone` | Formal complaint | "Lodge a complaint that gets taken seriously." |
| `official-correspondence` | `Stamp` | Official correspondence | "Write to authorities, municipalities, or government offices." |
| `demand-letter` | `AlertCircle` | Demand letter | "Request what you're owed — clearly, formally, in writing." |

**Card anatomy:**

```
┌───────────────────────────────┐
│  [Icon in accent-light circle]│
│                               │
│  Lease cancellation           │  ← font-semibold text-text-primary
│  End your rental agreement    │  ← text-sm text-secondary mt-1
│  on the right legal footing.  │
│                     →         │  ← ChevronRight, text-primary, absolute bottom-right
└───────────────────────────────┘
```

---

### 2.6 Pricing Section

**Purpose:** Show price early, remove sticker shock, reinforce transparency.

**Specs:**

| Element | Spec |
|---------|------|
| Background | `surface-subtle` |
| Section label | "PRICING" |
| Title | "Simple, transparent pricing" |
| Layout | Single pricing card, `max-w-md mx-auto`, centered |
| Card style | `bg-white rounded-2xl p-8 shadow-lg border border-border` |

**Pricing card structure:**

```
┌─────────────────────────────────────┐
│  ┌──────────────────────────────┐   │
│  │  No subscription             │   │  ← Badge: accent bg, white text, rounded-full
│  │  No hidden fees              │   │
│  └──────────────────────────────┘   │
│                                     │
│  From {formattedBasePrice}          │  ← text-4xl font-bold text-primary
│  per letter                         │  ← text-lg text-secondary
│                                     │
│  ─────────────────────────────────  │
│  ✓  Base service fee        {formattedBasePrice}│
│  ✓  Standard delivery       Included            │
│  ✓  Registered mail upgrade {formattedRegisteredSurcharge}│
│  ─────────────────────────────────  │
│                                     │
│  [Start drafting now →]             │  ← Full-width primary CTA button
│                                     │
│  Transparent total before payment   │  ← text-xs text-secondary text-center
└─────────────────────────────────────┘
```

> **Note:** All displayed prices must come from approved pricing config. Do not fabricate or hardcode launch amounts. See `docs/04-product/pricing-structure.md` and `docs/08-guardrails/open-decisions.md`.

> **VAT display rule:** VAT is included in all displayed prices. If a component price is CHF 0.00, show as "included" rather than displaying the zero amount.

---

### 2.7 Trust & Privacy

**Purpose:** Address the two biggest Swiss consumer concerns — data privacy and reliability.

**Specs:**

| Element | Spec |
|---------|------|
| Background | `#0F172A` (deep navy) |
| Section label | "YOUR DATA" — white/40 |
| Title | "Your documents are handled carefully" |
| Layout | Three cards, `grid-cols-3` (desktop) / `grid-cols-1` (mobile) |
| Card style | No card border — white text directly on dark bg; icon circle in `white/10` |

**Three trust cards:**

| Icon | Title | Body |
|------|-------|------|
| `Lock` | Encrypted in transit and at rest | "Letter content and personal data are encrypted in transit and at rest within the approved system boundaries. Do not promise absolute unreadability." |
| `MapPin` | Privacy-conscious infrastructure | "Storage and operational infrastructure must follow the approved privacy and hosting policy. Do not claim Swiss-only hosting unless that is explicitly approved." |
| `Trash2` | Clear retention rules | "Letters and attachments are deleted according to a documented retention policy. Do not promise exact durations here unless approved." |

> **Note:** Body text must remain factual. Do not claim certifications (ISO, SOC2) that have not been obtained. Do not invent specific retention periods or Swiss-only processing claims that the chosen AI provider path does not support. See `docs/07-operations/security-and-privacy.md` and `docs/05-architecture/data-model.md`.

---

### 2.8 FAQ

**Purpose:** Pre-empt objections, support SEO, reduce support volume.

**Specs:**

| Element | Spec |
|---------|------|
| Background | `surface` white |
| Title | "Frequently asked questions" |
| Layout | `max-w-2xl mx-auto`, full-width accordion |
| Accordion | Expand/collapse with `ChevronDown` icon, smooth 200ms height transition |
| SEO | `<script type="application/ld+json">` FAQPage schema for all Q&A pairs |

**Questions (MVP set):**

| # | Question | Answer guidance |
|---|----------|-----------------|
| 1 | How does Swiss Mail work? | Describe the 3-step flow: describe → review → send |
| 2 | Do I need to create an account? | No. Guest-first. No account is required, but email is required at checkout for confirmation and support. |
| 3 | How much does it cost? | From {formattedBasePrice}. Pay-per-letter. No subscription. |
| 4 | How long does delivery take? | Standard delivery follows normal postal timelines. Registered service may provide delivery confirmation where supported. [Do not specify exact days — subject to provider capabilities.] |
| 5 | What languages can I write in? | German, French, Italian, English. You can dictate in your language. |
| 6 | Is my data private? | Stored drafts and files are encrypted, and Swiss Mail must describe its storage and processing regions transparently in the privacy policy. Do not imply Swiss-only processing unless that is explicitly approved. |
| 7 | Can I attach documents? | Yes — PDFs and images can be attached for an additional per-file fee. |
| 8 | Can I track my letter? | Tracking availability depends on delivery method. Registered mail provides delivery confirmation reference. [Do not promise real-time GPS tracking.] |
| 9 | What if I need a refund? | Letters already dispatched cannot be recalled. Contact support if there is an issue before dispatch. |
| 10 | Can I write in any font or layout? | Swiss Mail uses a professional Swiss-compliant A4 template. Custom layout is not available in MVP. |

---

### 2.9 Final CTA Band

**Purpose:** Catch users who've scrolled to the bottom without converting.

**Specs:**

| Element | Spec |
|---------|------|
| Background | Gradient: `#B85C38` → `#8B3A21` |
| Padding | `py-24` |
| Title | "Ready to send your first letter?" |
| Title style | `text-4xl font-bold text-white text-center` |
| CTA | "Draft your letter" — `bg-white text-accent font-semibold h-12 px-8 rounded-lg hover:bg-white/90` |
| Reassurance | "No account needed · Takes 5 minutes" — `text-sm text-white/70 mt-3 text-center` |

---

### 2.10 Footer

**Purpose:** Navigation, legal, trust, locale switching.

**Specs:**

| Element | Spec |
|---------|------|
| Background | `#0F172A` |
| Padding | `py-16` |
| Layout | `grid-cols-4` (desktop) / `grid-cols-2` (mobile) with stacked columns |

**Footer columns:**

| Column | Links |
|--------|-------|
| **Swiss Mail** (col 1) | Logo, 1-line brand description, "Built for Switzerland 🇨🇭" |
| **Product** (col 2) | How it works, Pricing, Use cases, FAQ |
| **Legal** (col 3) | Terms of service, Privacy policy, Imprint (Impressum), Cookie settings |
| **Language** (col 4) | Deutsch, Français, Italiano, English — each sets locale via `Accept-Language` cookie or URL prefix |

**Footer bottom bar:**

```
© 2026 Swiss Mail. All rights reserved.    Built for Switzerland 🇨🇭
```

---

## 3. Use-Case Landing Page Template

One page per use case. URL pattern: `/use-cases/{slug}` (e.g., `/use-cases/lease-cancellation`).

**Purpose:** Rank for long-tail Swiss-German search terms ("Mietvertrag kündigen Brief", etc.) and convert high-intent visitors directly.

---

### 3.1 Page Structure

| Section | Notes |
|---------|-------|
| **Hero** | Use-case-specific headline; accent on the pain point |
| **Pain block** | Why this situation matters — emotional, not dramatic |
| **How it solves it** | 3-step flow customized for this use case |
| **Sample letter snippet** | Anonymized, formatted excerpt — builds trust |
| **Pricing** | Same card as homepage but with use-case framing |
| **FAQ** | 4-6 questions specific to this use case |
| **CTA** | Pre-selects this use case in the drafting flow |

---

### 3.2 Hero (Use-Case)

| Element | Spec |
|---------|------|
| Background | Same navy gradient as homepage hero |
| Headline template | "[Use case verb] letter — done properly." |
| Example (DE) | "Mietvertrag kündigen — richtig und rechtzeitig." |
| Example (EN) | "Cancel your lease — done properly." |
| Subheadline | "Swiss Mail generates a compliant {useCaseLabel} letter prepared for postal delivery in Switzerland. No templates, no printer, no post office queue." |
| CTA | "Draft my {useCaseLabel} letter" — links to `/draft/new?useCase={slug}` |
| Trust micro-copy | Same as homepage hero |

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

### 3.4 How Swiss Mail Solves It

Three cards, same layout as homepage "How It Works" but with use-case-specific step descriptions.

**Example for lease cancellation:**

| Step | Title | Description |
|------|-------|-------------|
| 1 | Tell us about your lease | "Enter your landlord's address, your tenancy end date, and any specific terms from your contract." |
| 2 | Review your cancellation letter | "See a properly formatted Swiss cancellation letter with all required elements. Edit anything before sending." |
| 3 | Send by registered mail | "We submit the finished letter for registered postal dispatch. Show a reference only if that service supports one." |

---

### 3.5 Sample Letter Snippet

**Purpose:** Show the output quality. Build trust by demonstration.

**Specs:**

| Element | Spec |
|---------|------|
| Container | `bg-paper rounded-xl p-8 shadow-lg max-w-lg mx-auto font-serif` |
| Content | Short excerpt (5–8 lines) of a typical letter for this use case |
| Data | Fully anonymized: "Max Mustermann", "Musterstrasse 1", "8000 Zürich" |
| Badge | "Sample only — not a real letter" overlay or footnote |
| Purpose | Demonstrate format and quality; do not present as legal template |

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

| Question | Answer guidance |
|----------|-----------------|
| What notice period do I need? | Refer to the contract and local regulations. Swiss Mail helps with the letter; the user determines the correct date. |
| Does it need to be sent by registered mail? | Many Swiss leases require registered mail. Swiss Mail offers this option. |
| What if I miss the deadline? | The letter can still be drafted; we cannot advise on legal remedies for missed deadlines. |
| Can I cancel mid-lease? | Special termination clauses vary. We draft the letter; we don't advise on contract law. |

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

| Section | Content |
|---------|---------|
| **Hero** | Simplified — title "How Swiss Mail works", no app mockup needed |
| **Step 1: Describe** | Screenshot of the guided conversation UI; caption each screen element |
| **Step 2: Review** | Screenshot of the letter preview; explain edit capabilities |
| **Step 3: Send** | Screenshot of checkout / delivery selection |
| **After you pay** | What happens next — printing, dispatch, postal handoff |
| **Timeline** | Expected delivery times (do not state exact days without confirmed data) |
| **FAQ** | 6-8 questions focused on process |
| **CTA band** | Same as homepage final CTA |

### 4.2 "After You Pay" Block

This section is critical for trust. Be honest about the flow.

```
What happens after you pay

1. Swiss Mail renders your final letter as a print-ready PDF.
2. Swiss Mail submits the final PDF and required metadata to the configured postal-provider path.
3. The provider handles any downstream production and postal processing.
4. Swiss Mail reflects the provider response honestly in your status.

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

| Section | Content |
|---------|---------|
| **Hero** | "Simple, honest pricing" — no hero image needed |
| **Pricing table** | Full breakdown of launch-enabled line items only |
| **Add-ons** | Registered mail only at launch |
| **Comparison** | Effort comparison, framed as illustrative rather than statistical proof |
| **FAQ** | Billing, refunds, receipts, CHF-only |
| **CTA** | Final CTA band |

### 5.2 Pricing Table

```
┌─────────────────────────────────────────────────────────────────────┐
│  Base service fee                                       {formattedBasePrice}    │
│  Standard delivery                                      Included               │
│─────────────────────────────────────────────────────────────────────│
│  ADD-ONS                                                            │
│  Registered mail (Einschreiben)                         {formattedRegisteredSurcharge}    │
│─────────────────────────────────────────────────────────────────────│
│  All prices in CHF, inclusive of Swiss VAT              🇨🇭          │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 Comparison Block

**Layout:** Two-column table. Left: "Traditional do-it-yourself flow". Right: "Swiss Mail".

| | Traditional | Swiss Mail |
|--|-------------|---------------|
| Getting started | Blank page or template hunt | Guided drafting |
| Formatting | Manual | Included |
| Final print-ready PDF | Manual | Included |
| Postal submission | Separate step | Integrated |
| Price clarity | Fragmented | Shown before payment |
| **Starting price shown** | Varies by steps you handle yourself | **From {formattedBasePrice}** |

> **Note:** Keep this comparison factual and qualitative. Do not fabricate competitor prices, postal fees, or statistical time savings.

### 5.4 Pricing FAQ

| Question | Answer |
|----------|--------|
| What currency do you charge in? | CHF only. |
| Is VAT included? | Yes, all prices include Swiss VAT. |
| Can I get a receipt? | Yes — a receipt is emailed after successful payment. |
| What if my payment fails? | Your draft is preserved. You can retry payment without re-drafting. |
| Do you offer refunds? | Letters already dispatched cannot be reversed. Contact support for issues before dispatch. |
| Is there a subscription? | No. Pay-per-letter, no commitments. |

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

| Context | Preferred copy | Avoid |
|---------|---------------|-------|
| Primary hero | "Draft your letter" | "Get started", "Sign up", "Try for free" |
| Use-case hero | "Draft my {useCaseLabel} letter" | Generic "Get started" |
| Pricing page | "Start drafting" | "Buy now", "Purchase" |
| Final CTA band | "Draft your letter" | "Subscribe", "Sign up now" |
| Post-FAQ | "Start drafting" | "Contact us" (unless FAQ answer requires it) |

---

## 7. Responsive Behavior

### 7.1 Breakpoints

Follows Tailwind defaults (also defined in design system):

| Breakpoint | Width | Layout shift |
|------------|-------|--------------|
| `sm` | 640px | — |
| `md` | 768px | 2-col grids activate |
| `lg` | 1024px | 3-col grids, side-by-side hero |
| `xl` | 1280px | Max content width cap |

### 7.2 Section-by-Section Behavior

| Section | Mobile | Desktop |
|---------|--------|---------|
| Hero | Text block, then image below; both full-width | Text left (50%), image right (50%) |
| Social proof strip | `flex-wrap`, 2 items per row | Horizontal single row |
| How It Works | Stacked cards, full-width | 3-column grid |
| AI Differentiator | Image above text, full-width | Alternating 50/50 |
| Use Cases Grid | 2-column grid | 3-column grid |
| Pricing card | Full-width | Centered, `max-w-md` |
| Trust cards | Stacked | 3-column grid |
| FAQ | Full-width accordion | `max-w-2xl` centered |
| Final CTA | Full-width button | Centered, max-width |
| Footer | 2-column grid, 2 rows | 4-column single row |

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

| Element | Mobile | Desktop |
|---------|--------|---------|
| Hero mockup | Below text, `w-full max-w-xs mx-auto` | Right column, absolute/relative positioned |
| Feature screenshots | Full-width, `rounded-xl shadow-md` | 50% column width |
| Sample letter | `p-4 text-xs` (reduce padding/size) | `p-8 text-sm` |
| Icon circles | 40px diameter, 20px icon | 48px diameter, 24px icon |

---

## 8. SEO & Structured Data

### 8.1 Page Titles and Meta Descriptions

| Page | `<title>` template | Meta description |
|------|-------------------|-----------------|
| Homepage | `Swiss Mail — Formal Swiss letters from your phone` | "Draft and send formal letters in Switzerland in minutes. AI-assisted, Swiss postal delivery. No account needed." |
| Use case | `[Use case title] letter — Swiss Mail` | Use-case-specific, ~140 chars |
| How It Works | `How Swiss Mail works — Formal Swiss letters` | Describe the 3-step flow |
| Pricing | `Pricing — Swiss Mail` | "Simple per-letter pricing. No subscription. From {formattedBasePrice}." |

### 8.2 Structured Data

| Page | Schema type |
|------|-------------|
| Homepage | `Organization`, `WebSite` |
| FAQ sections | `FAQPage` with all Q&A pairs |
| Use-case pages | `Service` with `areaServed: Switzerland` |
| Pricing page | `PriceSpecification` within `Offer` |

### 8.3 Hreflang

All marketing pages must include `hreflang` tags for all four locales:

```html
<link rel="alternate" hreflang="de-CH" href="https://swissmail.ch/de/" />
<link rel="alternate" hreflang="fr-CH" href="https://swissmail.ch/fr/" />
<link rel="alternate" hreflang="it-CH" href="https://swissmail.ch/it/" />
<link rel="alternate" hreflang="en-CH" href="https://swissmail.ch/en/" />
<link rel="alternate" hreflang="x-default" href="https://swissmail.ch/de/" />
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

| Component | File | Purpose |
|-----------|------|---------|
| `SiteHeader` | `site-header.tsx` | Transparent → frosted nav |
| `HeroSection` | `hero-section.tsx` | Full-viewport hero |
| `TrustStrip` | `trust-strip.tsx` | Social proof strip |
| `HowItWorksSection` | `how-it-works.tsx` | 3-step cards |
| `FeatureBlock` | `feature-block.tsx` | Alternating image/text. See [Component Library](component-library.md) for full `FeatureBlock` specification. |
| `UseCaseGrid` | `use-case-grid.tsx` | Use-case entry cards |
| `UseCaseCard` | `use-case-card.tsx` | Individual card |
| `PricingCard` | `pricing-card.tsx` | Single pricing card |
| `TrustPrivacySection` | `trust-privacy.tsx` | Dark trust block |
| `FaqSection` | `faq-section.tsx` | Accordion FAQ with schema |
| `FaqItem` | `faq-item.tsx` | Single accordion item |
| `CtaBand` | `cta-band.tsx` | Final CTA band |
| `MarketingFooter` | `marketing-footer.tsx` | Full footer |
| `SampleLetterCard` | `sample-letter-card.tsx` | Anonymized letter snippet |
| `StepCard` | `step-card.tsx` | Numbered step card (reused in multiple sections) |
| `SectionLabel` | `section-label.tsx` | Small uppercase section label |

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

*Document end.*  
*Companion documents: `docs/02-brand/design-system.md`, `docs/05-architecture/i18n-rules.md`, `docs/05-architecture/system-contracts.md`*
