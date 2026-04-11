# Episto Marketing Pages Specification — Part 1

> Split from [marketing-pages.md](marketing-pages.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- 1. Design Principles
- 2. Homepage Blueprint

## 1. Design Principles

These rules govern every marketing page. They are not suggestions — violating them produces a product that looks like every other SaaS rather than the trusted Swiss brand Episto needs to be.

### 1.1 Visual Language

| Principle                      | Implementation                                                                                                                                            | Anti-pattern                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Full-viewport heroes**       | `min-h-screen` with vertical centering; hero text lands at ~35% viewport height                                                                           | Half-height banners, cramped headers              |
| **Generous whitespace**        | Section padding `py-24` (desktop) / `py-16` (mobile) minimum                                                                                              | Packed-in sections with no breathing room         |
| **Typography as architecture** | Headlines do the heavy lifting — large, confident, centered or left-flush                                                                                 | Small timid headlines, body-weight section titles |
| **Strategic dark sections**    | Navy/dark backgrounds for Hero, Trust, and Final CTA only; white for content                                                                              | All-dark or all-white pages with no rhythm        |
| **No stock photography**       | Use product screenshots, illustrated icons, subtle gradients, mockup frames                                                                               | Generic handshake photos, envelope clipart        |
| **Scroll animation**           | Stagger-reveal each section with a single `fade-up` or `fade-in` on enter; 75ms stagger between items (see micro-interactions.md §5 for canonical timing) | Bouncing, spinning, or parallax-heavy animations  |

### 1.2 Color Usage on Marketing Pages

Derived from the design system — see `docs/02-brand/design-system.md` for tokens.

| Section type    | Background                     | Headline                | Body              | CTA                                               |
| --------------- | ------------------------------ | ----------------------- | ----------------- | ------------------------------------------------- |
| Hero            | `#1E3A5F` → `#2D5186` gradient | `text-inverse` (`#FFF`) | `text-inverse/80` | Accent (`#B85C38`) primary, ghost white secondary |
| Content (odd)   | `surface` (`#FFF`)             | `text-primary`          | `text-secondary`  | Primary (`#1E3A5F`)                               |
| Content (even)  | `surface-subtle` (`#F8FAFC`)   | `text-primary`          | `text-secondary`  | Primary                                           |
| Trust / Privacy | `#0F172A` (deep navy)          | `text-inverse`          | `text-inverse/70` | Ghost white                                       |
| Final CTA band  | `#B85C38` → `#A04E2E` gradient | `text-inverse`          | `text-inverse/90` | White solid                                       |
| Footer          | `#0F172A`                      | `text-inverse`          | `text-inverse/60` | —                                                 |

### 1.3 Typography Scale (Marketing)

| Element          | Mobile             | Desktop            | Weight | Notes                                     |
| ---------------- | ------------------ | ------------------ | ------ | ----------------------------------------- |
| Hero headline    | `text-4xl` (36px)  | `text-6xl` (60px)  | 700    | Line height 1.1; tight tracking `-0.02em` |
| Hero subheadline | `text-lg` (18px)   | `text-xl` (20px)   | 400    | Relaxed; `text-inverse/80`                |
| Section title    | `text-2xl` (24px)  | `text-4xl` (36px)  | 700    |                                           |
| Section label    | `text-xs` (12px)   | `text-sm` (14px)   | 500    | All-caps, tracked `0.1em`, muted color    |
| Card title       | `text-lg` (18px)   | `text-xl` (20px)   | 600    |                                           |
| Card body        | `text-sm` (14px)   | `text-base` (16px) | 400    |                                           |
| CTA button       | `text-base` (16px) | `text-lg` (18px)   | 600    |                                           |

### 1.4 Imagery and Illustration Style

- **Product screenshots**: Use real app UI inside a clean device frame (phone or browser chrome). No perspective tilt above 5°. Subtle drop shadow, never hard shadow.
- **Icons**: Lucide icon set preferred (matches design system). Display inside a circle with `accent-light` (`#FBF0EB`) background for icon sections. Size: 24px icon, 48px circle container.
- **Hero visual**: A floating phone mockup showing the letter drafting UI. Shadow: `0 24px 64px rgba(0,0,0,0.25)`. Subtle rotation: `rotate-2` or `rotate-[-2deg]`.
- **Backgrounds**: Subtle radial gradients are acceptable for hero and CTA bands. No texture overlays. No pattern fills.

### 1.5 Animation Specification

```
Entry animation:   opacity 0→1, translateY 20px→0
Duration:          300ms
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

**Purpose:** First impression — communicate what Episto is and get users to start drafting.

```
┌─────────────────────────────────────────────────┐
│  Episto          [DE | FR | IT | EN]     │  ← Nav: transparent, sticky on scroll
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

| Element          | Spec                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Background       | Gradient: `#1E3A5F` top-left → `#2D5186` bottom-right, plus subtle radial highlight center                                 |
| Minimum height   | `min-h-screen`                                                                                                             |
| Nav              | Transparent until scroll >80px, then `bg-primary/95 backdrop-blur-sm`; fixed                                               |
| Headline (DE)    | "Wichtige Briefe — professionell verfasst, bereit zum Versand"                                                             |
| Headline (EN)    | "Serious letters — professionally drafted, ready to send"                                                                  |
| Subheadline      | "Describe what you need. Get a properly structured formal letter in minutes, prepared for postal delivery in Switzerland." |
| Primary CTA      | "Draft your letter" — `bg-accent text-white`, `h-12 px-8 text-lg font-semibold rounded-lg`                                 |
| Secondary CTA    | "See how it works" — ghost, white border, same height                                                                      |
| CTA link         | Primary → `/draft/new`; Secondary → `#how-it-works` anchor                                                                 |
| Trust micro-copy | "No signup required · From {formattedBasePrice} · Privacy-conscious infrastructure" — `text-xs text-white/60`, below CTAs  |
| Visual (desktop) | Phone mockup, right half, `absolute` positioned, subtle `rotate-2`, shadow `0 24px 64px rgba(0,0,0,0.3)`                   |
| Visual (mobile)  | Below text block, full-width, centered, no rotation                                                                        |

**Headline variants by locale:**

| Locale  | Headline                                                       | Subheadline                                                                                                                                            |
| ------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `de-CH` | "Wichtige Briefe — professionell verfasst, bereit zum Versand" | "Beschreiben Sie Ihr Anliegen. Erhalten Sie in Minuten einen korrekt strukturierten Brief, vorbereitet für die postalische Zustellung in der Schweiz." |
| `fr-CH` | "Lettres importantes — rédigées avec soin, prêtes à l'envoi"   | "Décrivez votre besoin. Recevez en quelques minutes une lettre correctement structurée, préparée pour l'envoi postal en Suisse."                       |
| `it-CH` | "Lettere importanti — redatte con cura, pronte per l'invio"    | "Descrivi ciò di cui hai bisogno. Ricevi in pochi minuti una lettera correttamente strutturata, preparata per l'invio postale in Svizzera."            |
| `en-CH` | "Serious letters — professionally drafted, ready to send"      | "Describe what you need. Get a properly structured formal letter in minutes, prepared for postal delivery in Switzerland."                             |

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

| Element    | Spec                                                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Background | `surface-subtle` (`#F8FAFC`)                                                                                                            |
| Height     | `py-5`                                                                                                                                  |
| Layout     | Horizontal flex, centered, `gap-8` (desktop) / `gap-5 flex-wrap` (mobile)                                                               |
| Items      | Icon (16px, `text-secondary`) + label (`text-sm font-medium text-secondary`)                                                            |
| Labels     | "Postal delivery in Switzerland" · "Privacy-conscious infrastructure" · "Encrypted in transit and at rest" · "No subscription required" |
| Border     | `border-y border-border`                                                                                                                |

> **Note:** Do not include "Swiss Post" logo or partner logos until confirmed commercial relationship exists. Use descriptive text badges only. See `docs/08-guardrails/provider-certainties.md`.

---

### 2.3 How It Works

**Purpose:** Explain the core flow in three steps. Remove "how does this even work?" uncertainty.

**Specs:**

| Element         | Spec                                                                                |
| --------------- | ----------------------------------------------------------------------------------- |
| Background      | `surface` white                                                                     |
| Section padding | `py-24`                                                                             |
| Section label   | "HOW IT WORKS" — `text-xs font-semibold tracking-widest text-accent uppercase mb-3` |
| Title           | "Three steps to a professional letter"                                              |
| Layout          | Three columns `grid-cols-3 gap-8` (desktop) / `grid-cols-1 gap-6` (mobile)          |
| Entry animation | Stagger 75ms per card, `fade-up`                                                    |

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

| Step | Icon            | Title    | Description                                                                                                  |
| ---- | --------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| 1    | `MessageCircle` | Describe | "Tell us what you need — a cancellation, a complaint, a notice. In your own words, or dictate it."           |
| 2    | `FileText`      | Review   | "See a professionally structured letter take shape. Edit the tone, refine the wording, review every detail." |
| 3    | `Send`          | Send     | "Confident it's right? Pay once — we generate the final PDF and submit it for postal dispatch."              |

---

### 2.4 AI Differentiator

**Purpose:** Show what makes Episto meaningfully different from "just mail a PDF yourself". Three alternating feature blocks.

**Layout pattern:** Alternating `text-left / image-right` then `image-left / text-right`. On mobile: image above text, full-width.

**Section container:** `py-24 bg-white` with `max-w-6xl mx-auto`

---

**Block 1 — "Professionally structured, not just typed"**

| Element  | Spec                                                                                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visual   | Screenshot of conversation/guided-drafting UI inside a browser frame                                                                                                                                                                        |
| Headline | "Professionally structured, not just typed"                                                                                                                                                                                                 |
| Body     | "Tell Episto what the letter is about — a cancellation, a complaint, a landlord dispute. It asks the right questions, picks the correct structure, sets the right tone, and produces a letter that looks like it came from a professional." |
| Layout   | Text left, image right (desktop)                                                                                                                                                                                                            |

---

**Block 2 — "Dictate from anywhere"**

| Element  | Spec                                                                                                                                                                                     |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visual   | Phone mockup with microphone recording indicator visible                                                                                                                                 |
| Headline | "Dictate from anywhere"                                                                                                                                                                  |
| Body     | "On the train, in your car, between meetings. Speak your situation in plain language — Episto turns it into a properly formatted, correctly toned formal letter. In any Swiss language." |
| Layout   | Image left, text right (desktop)                                                                                                                                                         |

---

**Block 3 — "Review every detail before you send"**

| Element  | Spec                                                                                                                                                                              |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visual   | Letter preview mockup — paper-white card showing A4 layout with visible content zones highlighted                                                                                 |
| Headline | "Review every detail before you send"                                                                                                                                             |
| Body     | "See exactly what will land in the letterbox. Tap any zone to edit — subject, tone, closing. The preview updates in real time. You don't send until you're confident it's right." |
| Layout   | Text left, image right (desktop)                                                                                                                                                  |

---

### 2.5 Use Cases Grid

**Purpose:** Signal the breadth of situations Episto handles. Drive to targeted landing pages.

**Specs:**

| Element       | Spec                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| Background    | `surface-subtle` (`#F8FAFC`)                                                                                      |
| Section label | "PERFECT FOR"                                                                                                     |
| Title         | "For every formal letter you've been putting off"                                                                 |
| Grid          | `grid-cols-2 gap-4` (mobile) / `grid-cols-3 gap-6` (desktop)                                                      |
| Card style    | `bg-white rounded-xl p-6 border border-border hover:border-primary hover:shadow-md transition-all cursor-pointer` |
| Card hover    | Border turns `primary`, faint lift shadow                                                                         |
| Card link     | Each card links to `/use-cases/{slug}`                                                                            |

**Use-case cards (MVP set):**

| Slug                      | Icon          | Title                   | Description                                                    |
| ------------------------- | ------------- | ----------------------- | -------------------------------------------------------------- |
| `lease-cancellation`      | `Home`        | Lease cancellation      | "End your rental agreement on the right legal footing."        |
| `insurance-cancellation`  | `Shield`      | Insurance cancellation  | "Cancel any policy with a compliant written notice."           |
| `contract-termination`    | `FileX`       | Contract termination    | "Terminate service contracts, subscriptions, or agreements."   |
| `formal-complaint`        | `Megaphone`   | Formal complaint        | "Lodge a complaint that gets taken seriously."                 |
| `official-correspondence` | `Stamp`       | Official correspondence | "Write to authorities, municipalities, or government offices." |
| `demand-letter`           | `AlertCircle` | Demand letter           | "Request what you're owed — clearly, formally, in writing."    |

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

| Element       | Spec                                                      |
| ------------- | --------------------------------------------------------- |
| Background    | `surface-subtle`                                          |
| Section label | "PRICING"                                                 |
| Title         | "Simple, transparent pricing"                             |
| Layout        | Single pricing card, `max-w-md mx-auto`, centered         |
| Card style    | `bg-white rounded-2xl p-8 shadow-lg border border-border` |

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

> **Note:** All displayed prices must come from the stored synced pricing source used by the app. Do not fabricate or hardcode launch amounts. See `docs/04-product/pricing-structure.md` and `docs/08-guardrails/open-decisions.md`.

> **VAT display rule:** VAT is included in all displayed prices. If a component price is CHF 0.00, show as "included" rather than displaying the zero amount.

---

### 2.7 Trust & Privacy

**Purpose:** Address the two biggest Swiss consumer concerns — data privacy and reliability.

**Specs:**

| Element       | Spec                                                                       |
| ------------- | -------------------------------------------------------------------------- |
| Background    | `#0F172A` (deep navy)                                                      |
| Section label | "YOUR DATA" — white/40                                                     |
| Title         | "Your documents are handled carefully"                                     |
| Layout        | Three cards, `grid-cols-3` (desktop) / `grid-cols-1` (mobile)              |
| Card style    | No card border — white text directly on dark bg; icon circle in `white/10` |

**Three trust cards:**

| Icon     | Title                            | Body                                                                                                                                                              |
| -------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Lock`   | Encrypted in transit and at rest | "Letter content and personal data are encrypted in transit and at rest within the approved system boundaries. Do not promise absolute unreadability."             |
| `MapPin` | Privacy-conscious infrastructure | "Storage and operational infrastructure must follow the approved privacy and hosting policy. Do not claim Swiss-only hosting unless that is explicitly approved." |
| `Trash2` | Clear retention rules            | "Letters and attachments are deleted according to a documented retention policy. Do not promise exact durations here unless approved."                            |

> **Note:** Body text must remain factual. Do not claim certifications (ISO, SOC2) that have not been obtained. Do not invent specific retention periods or Swiss-only processing claims that the chosen AI provider path does not support. See `docs/07-operations/security-and-privacy.md` and `docs/05-architecture/data-model.md`.

---

### 2.8 FAQ

**Purpose:** Pre-empt objections, support SEO, reduce support volume.

**Specs:**

| Element    | Spec                                                                    |
| ---------- | ----------------------------------------------------------------------- |
| Background | `surface` white                                                         |
| Title      | "Frequently asked questions"                                            |
| Layout     | `max-w-2xl mx-auto`, full-width accordion                               |
| Accordion  | Expand/collapse with `ChevronDown` icon, smooth 200ms height transition |
| SEO        | `<script type="application/ld+json">` FAQPage schema for all Q&A pairs  |

**Questions (MVP set):**

| #   | Question                           | Answer guidance                                                                                                                                                                                                |
| --- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | How does Episto work?              | Describe the 3-step flow: describe → review → send                                                                                                                                                             |
| 2   | Do I need to create an account?    | No. Guest-first. No account is required, but email is required at checkout for confirmation and support.                                                                                                       |
| 3   | How much does it cost?             | From {formattedBasePrice}. Pay-per-letter. No subscription.                                                                                                                                                    |
| 4   | How long does delivery take?       | Standard delivery follows normal postal timelines. Registered service may provide delivery confirmation where supported. [Do not specify exact days — subject to provider capabilities.]                       |
| 5   | What languages can I write in?     | German, French, Italian, English. You can dictate in your language.                                                                                                                                            |
| 6   | Is my data private?                | Stored drafts and files are encrypted, and Episto must describe its storage and processing regions transparently in the privacy policy. Do not imply Swiss-only processing unless that is explicitly approved. |
| 7   | Can I attach documents?            | Yes — PDFs and images can be attached for an additional per-file fee.                                                                                                                                          |
| 8   | Can I track my letter?             | Tracking availability depends on delivery method. Registered mail provides delivery confirmation reference. [Do not promise real-time GPS tracking.]                                                           |
| 9   | What if I need a refund?           | Letters already dispatched cannot be recalled. Contact support if there is an issue before dispatch.                                                                                                           |
| 10  | Can I write in any font or layout? | Episto uses a professional Swiss-compliant A4 template. Custom layout is not available in MVP.                                                                                                                 |

---

### 2.9 Final CTA Band

**Purpose:** Catch users who've scrolled to the bottom without converting.

**Specs:**

| Element     | Spec                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------- |
| Background  | Gradient: `#B85C38` → `#8B3A21`                                                                   |
| Padding     | `py-24`                                                                                           |
| Title       | "Ready to send your first letter?"                                                                |
| Title style | `text-4xl font-bold text-white text-center`                                                       |
| CTA         | "Draft your letter" — `bg-white text-accent font-semibold h-12 px-8 rounded-lg hover:bg-white/90` |
| Reassurance | "No account needed · Takes 5 minutes" — `text-sm text-white/70 mt-3 text-center`                  |

---

### 2.10 Footer

**Purpose:** Navigation, legal, trust, locale switching.

**Specs:**

| Element    | Spec                                                                  |
| ---------- | --------------------------------------------------------------------- |
| Background | `#0F172A`                                                             |
| Padding    | `py-16`                                                               |
| Layout     | `grid-cols-4` (desktop) / `grid-cols-2` (mobile) with stacked columns |

**Footer columns:**

| Column               | Links                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| **Episto** (col 1)   | Logo, 1-line brand description, "Built for Switzerland 🇨🇭"                                         |
| **Product** (col 2)  | How it works, Pricing, Use cases, FAQ                                                              |
| **Legal** (col 3)    | Terms of service, Privacy policy, Imprint (Impressum), Cookie settings                             |
| **Language** (col 4) | Deutsch, Français, Italiano, English — each sets locale via `Accept-Language` cookie or URL prefix |

**Footer bottom bar:**

```
© 2026 Episto. All rights reserved.    Built for Switzerland 🇨🇭
```

---
