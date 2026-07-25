# Component Library — Part 4

> Split from [component-library.md](component-library.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- Part 3 — Marketing Components (marketing/)
- Part 4 — Layout Components (layout/)
- Part 5 — Component Rules
- Implementation Danger Zones

## Part 3 — Marketing Components (marketing/)

### HeroSection

Full-viewport hero for the homepage. The first thing users see.

**Structure:**

- Background: gradient from `--color-primary-dark` to `--color-slate-900`
- Headline: `text-4xl md:text-5xl lg:text-6xl font-bold text-white`
- Subtitle: `text-lg md:text-xl text-white/80 max-w-2xl`
- CTA cluster: Primary (`lg`, accent) + Ghost (`lg`, white outline)
- Trust line: `text-sm text-white/60` — "No signup required · From {formattedBasePrice} · Privacy-conscious infrastructure"
- Visual: Floating LetterPreview mockup with tilt and shadow (desktop: right side, mobile: below text)

**Animation:** Headline slides up + fades in (400ms). CTAs fade in after 200ms delay. Mockup floats in from right with subtle rotation (600ms).

---

### TrustStrip

Horizontal strip of trust indicators.

**Content:** Postal delivery · Encrypted handling · Privacy-conscious infrastructure · No account needed

**Visual:** `bg-muted/50`, compact height (48-56px), logos/icons in muted color, centered row with `gap-8`

---

### HowItWorks

Three-step explainer. Simple enough for anyone to understand.

**Layout (desktop):** Three columns. (Mobile: stacked cards.)

**Cards:**

1. 🗣️ **"Describe"** — "Tell us what you need — type or dictate. Our AI drafts it for you."
2. 📝 **"Review"** — "See your letter in real time. Edit anything with a tap."
3. 📬 **"Send"** — "Choose delivery, pay, and we generate the final PDF and submit it. Done."

Each card: step number badge (accent circle), icon (48px, accent), title (`font-semibold`), description (`text-muted-foreground`).

---

### FeatureBlock

Alternating editorial section for explaining differentiators without turning the page into a feature grid.

**Used on:** Homepage AI differentiator section, `/how-it-works`

**Props:**

| Prop          | Type      | Notes                                        |
| ------------- | --------- | -------------------------------------------- | ---------------------------- |
| `heading`     | `string`  | Required section headline                    |
| `description` | `string   | ReactNode`                                   | 2-3 short paragraphs maximum |
| `imageSrc`    | `string`  | Asset should stay under 400KB                |
| `imageAlt`    | `string`  | Required descriptive alt text                |
| `reversed`    | `boolean` | Flips image/text order on tablet and desktop |
| `ctaHref`     | `string`  | Optional inline CTA link                     |

**Structure:**

- 50/50 split on tablet and desktop with `gap-16`
- Image sits inside a 16:9 container, rounded-lg, `shadow-sm`
- Text column uses `text-2xl font-semibold` heading and `text-secondary` body copy
- Optional CTA is a text link in `text-primary`

**States:**

| State       | Behavior                       |
| ----------- | ------------------------------ |
| Standard    | Image left, text right         |
| Reversed    | Text left, image right         |
| CTA present | Link appears beneath body copy |

**Animation:** Fade-up on scroll intersection, following `micro-interactions.md` marketing section timing.

**Responsive:**

- Mobile: always stacked with image first, text second
- Tablet and desktop: side-by-side; `reversed` only applies at these breakpoints

**Accessibility:**

- Never use the image as the only source of meaning; core message stays in text
- Decorative images use empty alt text, otherwise `imageAlt` must describe the content
- CTA link text must describe destination, not just "Learn more"

---

### TemplateGalleryGrid

Searchable public gallery of common letter templates and starting points.

**Used on:** `/templates`

**Structure:**

- Search input sits above the filter chips with a leading search icon
- Category chips: All, Cancellations, Complaints, Notices, Demand, Official, Insurance
- Card count line above the grid: "N templates"
- Cards use `EntryCard` with icon, title, description, and "Draft now →" CTA

**Filter behavior:**

| Element       | Behavior                                                                                                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search        | Debounced 300ms text filter                                                                                                                                                  |
| Active chip   | `bg-primary text-white`                                                                                                                                                      |
| Inactive chip | `bg-muted text-secondary`                                                                                                                                                    |
| Sorting       | Recommended order by default (curated from config, not alphabetical). No user-facing sort dropdown in MVP. See `page-specifications.md` §11 for template gallery route spec. |

**States:**

| State        | Behavior                                                |
| ------------ | ------------------------------------------------------- |
| Default      | Full grid, recommended order (curated from config)      |
| Filtered     | Grid updates based on query + category                  |
| Empty search | "No templates match '[query]'." + `Clear search` action |

**Grid:**

- 1 column on mobile
- 2 columns on tablet
- 3 columns on desktop
- `gap-6` between cards

**Accessibility:**

- Search input has a visible label and search icon marked decorative
- Category chips expose pressed state with `aria-pressed`
- Empty-state clear action is keyboard accessible and announced with clear wording

---

### PricingCard

Single pricing card — we're not a SaaS with tiers, we're pay-per-letter.

**Layout:**

```
┌─────────────────────────────────┐
│                                  │
│     From {formattedBasePrice}   │  ← text-4xl font-bold
│     per letter                  │  ← text-muted-foreground
│                                  │
│     ✓ Base service fee          │
│     ✓ Standard delivery         │
│     ✓ AI-assisted drafting      │
│     ✓ Final PDF generation      │
│                                  │
│     + {formattedRegisteredUpgrade} registered mail   │
│                                  │
│     ┌────────────────────────┐  │
│     │  No subscription       │  │  ← badge, accent
│     │  No hidden fees        │  │
│     └────────────────────────┘  │
│                                  │
│     [ Start drafting →  ]       │  ← primary CTA, lg
│                                  │
└─────────────────────────────────┘
```

---

### FAQSection

Accordion-style FAQ. Structured data for SEO (`application/ld+json` FAQPage).

**Items:** `border-b` separator between items. Expand: smooth height transition (250ms). Chevron rotates 180° on open.

---

### CTABand

Full-width call-to-action section. Appears at bottom of marketing pages.

**Visual:** Gradient background (warm accent tones), large centered headline (`text-2xl md:text-3xl font-bold text-white`), primary CTA button (`xl` size), reassurance line below.

---

## Part 4 — Layout Components (layout/)

### Header

**Marketing pages (scrolled past hero):**

```
┌─────────────────────────────────────────────────────────┐
│  Logo     How it works  Pricing  Use cases    [DE▾] CTA │
└─────────────────────────────────────────────────────────┘
```

- Background: `bg-transparent` initially → `bg-background/95 backdrop-blur` on scroll (150ms)
- Height: 64px
- Position: sticky top

**App pages:**

```
┌─────────────────────────────────────────────────────────┐
│  ←  │  StepIndicator  │  Price  │  [DE▾]  │  Actions   │
└─────────────────────────────────────────────────────────┘
```

- Background: `bg-background border-b`

**Logo click behavior during active drafting:**

When the user clicks the logo in the app header while a draft is in progress (`/draft/:id`, `/draft/:id/review`, or `/draft/:id/checkout`), do NOT navigate immediately to the homepage. Instead, show a confirmation `<Dialog>`:

```
┌────────────────────────────────────────┐
│                                        │
│  Leave this draft?                     │  ← text-xl font-semibold
│                                        │
│  Your draft is saved. You can return   │  ← text-sm text-secondary
│  to it from your resume link.          │
│                                        │
│  [Continue drafting]  [Leave]          │
│                                        │
└────────────────────────────────────────┘
```

- Primary button (left): "Continue drafting" → closes dialog, stays on current page.
- Destructive-outline button (right): "Leave" → navigates to `/`.
- Dialog uses the standard `<Dialog>` component with backdrop.
- If the draft has been submitted/paid: no confirmation needed, navigate directly.
- The confirmation dialog also triggers on browser back button to homepage, using `router.beforePopState` (Next.js) or `beforeunload` as appropriate.
- **Do not show this dialog for the confirmation page** (`/draft/:id/confirmation`) — the user is done.

**Mobile:** Logo left, hamburger right. Nav items in full-screen MobileNav overlay.

**Accessibility (all header variants):**

- `<header>` element with `role="banner"`
- `<nav>` inside header: `aria-label="Main navigation"` (marketing) or `aria-label="Draft navigation"` (app)
- Skip-to-content link: first focusable element in the header, visually hidden until focused: `<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute ...">Skip to content</a>`
- Logo: `<a>` with `aria-label="episto — go to homepage"`
- Mobile hamburger: `<button aria-label="Open menu" aria-expanded="false">`. When open: `aria-expanded="true"`. Overlay traps focus; `Escape` closes it.
- MobileNav overlay: `role="dialog"`, `aria-label="Navigation menu"`. Focus returns to hamburger button on close.
- Language switcher: `aria-label="Select language"`, `aria-haspopup="listbox"`. See LanguageSwitcher below.

### LanguageSwitcher

Compact 4-language selector. Always visible in header.

**Visual:** Current language code in button (`DE`), dropdown with full names:

- 🇩🇪 Deutsch
- 🇫🇷 Français
- 🇮🇹 Italiano
- 🇬🇧 English

**Behavior:** Switching language reloads with new locale prefix (`/de/` → `/fr/`). No page flicker (client-side navigation where possible).

---

### Footer

Multi-column footer for marketing pages.

**Columns:**

1. Product: How it works, Pricing, Use cases, FAQ
2. Legal: Terms, Privacy policy, Imprint
3. Language: DE, FR, IT, EN

**Bottom:** `© 2026 episto · Built for Switzerland 🇨🇭`

**Visual:** `bg-slate-900 text-slate-300`, generous padding, `text-sm`

---

### LegalPageLayout

Long-form legal document shell optimised for reading, navigation, and printing.

**Used on:** `/privacy`, `/terms`, `/imprint`

**Props:**

| Prop          | Type        | Notes                                           |
| ------------- | ----------- | ----------------------------------------------- |
| `title`       | `string`    | Page title shown above the document             |
| `lastUpdated` | `string`    | Rendered at the top in `text-sm text-secondary` |
| `children`    | `ReactNode` | Legal markdown or prose content                 |
| `locale`      | `Locale`    | Shares the same language selector as the header |

**Structure:**

- Wrapped in `MarketingLayout` so the standard header and footer remain intact on screen
- Main content column is centred, `max-w-prose` (65ch), `py-16`
- Language selector matches the header pattern and supports all 4 locales
- Table of contents auto-generates from `h2` headings
- Desktop: sticky TOC sidebar
- Mobile: collapsible TOC block above the document body
- Headings include anchor links; inline links use `text-primary underline`

**States:**

| State                | Behavior                                                         |
| -------------------- | ---------------------------------------------------------------- |
| Default              | Header, last-updated line, language selector, TOC, document body |
| Mobile TOC collapsed | Summary button shows and hides the heading list                  |
| Print                | Hide navigation and footer, expand content to full width         |

**Responsive:**

- Mobile: content remains single-column with TOC above prose
- Desktop: two-column layout with sticky TOC and centred reading column

**Accessibility:**

- TOC is wrapped in `nav aria-label="Table of contents"`
- Anchor links on headings have visible focus states and readable labels
- Print styles preserve heading hierarchy and link destinations where practical

---

## Part 5 — Component Rules

### Do / Don't

| ✅ Do                                           | ❌ Don't                                             |
| ----------------------------------------------- | ---------------------------------------------------- |
| Use primary button for one main CTA per section | Put two primary buttons next to each other           |
| Show loading states for all async actions       | Leave the user wondering if something is happening   |
| Animate meaningful state changes                | Animate everything (respect reduced motion)          |
| Use sheets for secondary content on mobile      | Open full pages for editing a single field           |
| Show real-time price as content changes         | Surprise the user with a different total at checkout |
| Make dictation prominent on mobile              | Hide voice input behind menus                        |
| Show honest dispatch status                     | Collapse "submitted" and "delivered" into one state  |
| Use skeleton loaders for initial page loads     | Show blank white pages while loading                 |

### Consistency Rules

- Same interaction pattern across all address inputs (sender, recipient)
- Same file upload pattern everywhere (attachments, signature)
- Same error display pattern everywhere (red border + message below)
- Same loading pattern everywhere (skeleton → content crossfade)
- Same success pattern everywhere (green checkmark + toast)
- Same CTA pattern: primary action = accent button, secondary = outline/ghost

---

## Implementation Danger Zones

### CDZ-1: Do not mix primitive and product components

`components/ui/` contains shadcn-derived primitives (Button, Dialog, Input, etc.). `components/product/` contains app-specific compositions (ConversationPanel, LetterPreview, PricingCard). Never import a product component inside `ui/`. Never put app logic in a primitive. An implementing LLM may create a `ui/ChatBubble.tsx` — this is wrong, it belongs in `product/`.

### CDZ-2: Do not style shadcn primitives with inline overrides

All visual customization flows through CSS variables and Tailwind utility classes defined in the design system. Do not override shadcn component internals with `style={{}}` or `!important`. If a primitive doesn't look right, the design token is wrong — fix it there.

### CDZ-3: Do not skip loading skeletons

Every component that loads data has a skeleton state. Skeleton shapes must match the real content layout (same heights, widths, border radii). An implementing LLM may use a generic spinner instead. This creates layout shift when real content loads and feels cheap.

### CDZ-4: Do not ignore `prefers-reduced-motion`

Every component with animation must check `prefers-reduced-motion: reduce`. In reduced motion mode: fade transitions reduce to 100ms crossfade, stagger becomes instant, non-essential completion effects are suppressed, and the typing indicator becomes a static "…" text. An LLM may add animations that look great in dev but are inaccessible.

### CDZ-5: Do not implement `LetterPreview` as an iframe

The preview renders server-generated HTML into a scaled container (`transform: scale()`), not an iframe. Iframes create cross-origin issues, duplicate CSS loading, and break a11y tree traversal. The preview is a `<div>` with `pointer-events: none` in view mode and targeted pointer-events for zone editing.

### CDZ-6: Do not duplicate schema types in components

All data types used by components (Draft, Address, DispatchState, PaymentState) come from `shared/` schemas. Never redeclare a `type Address = { ... }` inside a component file. Import from the shared package.
