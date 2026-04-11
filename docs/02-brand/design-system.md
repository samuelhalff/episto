# Episto Design System

> **Status:** Canonical — implement from this document.  
> **Scope:** Light and dark mode, MVP. Dark mode uses `class` strategy (Tailwind `darkMode: "class"`), toggled via ThemeProvider.  
> **Stack:** Next.js · TypeScript · Tailwind CSS · shadcn/ui primitives  
> **Last updated:** 2026-03

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Color Palette](#2-color-palette)
3. [Typography Scale](#3-typography-scale)
4. [Spacing System](#4-spacing-system)
5. [Elevation & Depth](#5-elevation--depth)
6. [Border Radius](#6-border-radius)
7. [Iconography](#7-iconography)
8. [Motion & Animation](#8-motion--animation)
9. [Interactive States](#9-interactive-states)
10. [Dark Mode Notes](#10-dark-mode-notes)

---

## 1. Design Philosophy

### Core Premise

Episto exists at the intersection of **paper** and **digital**. The product is formal, deliberate, and Swiss — but never cold, bureaucratic, or intimidating. Every design decision reinforces a single emotional truth: _"This will be taken care of, professionally."_

### Three Design Pillars

| Pillar                  | What It Means                                                                                                             | What It Rejects                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Swiss Precision**     | Every element earns its place. Generous whitespace, exact alignment, nothing decorative.                                  | Busy layouts, gradient overload, decorative chrome              |
| **Calm Authority**      | The UI recedes to let the user's content be the focus. Trust through restraint.                                           | Loud CTAs, aggressive upsells, anxious micro-interactions       |
| **Paper Meets Digital** | The letter metaphor is present but not costume. The preview feels like a document, the workflow feels like a modern SaaS. | Skeuomorphic paper textures, clipart stamps, fake desk surfaces |

### Design Voice in Practice

- **Letter preview** — feels like a real printed page: serif type, paper-white surface, elevated card, tight margins
- **Workflow UI** — clean modern SaaS: Inter, slate tones, quiet borders, purposeful accents
- **Information density** — high but never cluttered; use spacing to create breathing room, not visual noise
- **Color usage** — mostly neutral. Primary workflow actions use a shared golden-yellow action token in both themes. Supporting, back, close, and dismiss actions stay neutral grey. Semantic warning/success tones remain separate and must not be reused as the primary CTA color.

---

## 2. Color Palette

### Philosophy

The palette is **90% neutral, 10% intentional**. The core product workflow now uses a shared golden-yellow primary action token to make the next step unmistakable in both themes, while secondary and dismissive actions stay neutral grey. Warm accent/supporting tones are still available for trust or highlight moments, but semantic colors continue to follow standard conventions and must not be overloaded.

### Core Tokens

| Token            | Hex       | Tailwind Name    | Use                                                       |
| ---------------- | --------- | ---------------- | --------------------------------------------------------- |
| `primary`        | `#F6C54A` | `primary`        | Primary workflow buttons, main next-step CTA              |
| `primary-hover`  | `#E9B93D` | `primary-hover`  | Primary CTA hover state                                   |
| `primary-light`  | `#FFF4CC` | `primary-light`  | Selected states, soft action highlights                   |
| `accent`         | `#B85C38` | `accent`         | Highlights, progress steps, warm emphasis, pricing badges |
| `accent-hover`   | `#A04E2E` | `accent-hover`   | Accent hover state                                        |
| `accent-light`   | `#FBF0EB` | `accent-light`   | Accent-tinted background (tooltips, banners)              |
| `paper`          | `#FAFAF7` | `paper`          | Letter preview background — off-white, slightly warm      |
| `surface`        | `#FFFFFF` | `surface`        | Card and modal backgrounds                                |
| `surface-subtle` | `#F8FAFC` | `surface-subtle` | Alternate row, secondary card, inactive tabs              |
| `surface-hover`  | `#F1F5F9` | `surface-hover`  | Hover on list items, nav entries                          |
| `border`         | `#E2E8F0` | `border`         | Default border, input border, dividers                    |
| `border-strong`  | `#CBD5E1` | `border-strong`  | Emphasized dividers, active input border                  |
| `text-primary`   | `#0F172A` | `text-primary`   | Body text, headings                                       |
| `text-secondary` | `#475569` | `text-secondary` | Labels, metadata, helper text                             |
| `text-tertiary`  | `#94A3B8` | `text-tertiary`  | Placeholders, disabled text, timestamps                   |
| `text-inverse`   | `#FFFFFF` | `text-inverse`   | Text on dark/primary backgrounds                          |

### Semantic Colors

| Token            | Hex       | Use                                                        |
| ---------------- | --------- | ---------------------------------------------------------- |
| `success`        | `#16A34A` | Confirmed dispatch, payment success, completed steps       |
| `success-bg`     | `#F0FDF4` | Success banners, toast backgrounds                         |
| `success-border` | `#BBF7D0` | Success card borders                                       |
| `error`          | `#DC2626` | Form validation errors, failed payment, dispatch rejection |
| `error-bg`       | `#FEF2F2` | Error banners                                              |
| `error-border`   | `#FECACA` | Error card borders                                         |
| `warning`        | `#D97706` | Ambiguous dispatch state, expiring session, rate limit     |
| `warning-bg`     | `#FFFBEB` | Warning banners                                            |
| `warning-border` | `#FDE68A` | Warning card borders                                       |
| `info`           | `#2563EB` | Informational tooltips, provider status notes              |
| `info-bg`        | `#EFF6FF` | Info banners                                               |
| `info-border`    | `#BFDBFE` | Info card borders                                          |

### Tailwind Config — `extend.colors`

```js
// tailwind.config.ts  →  theme.extend.colors
colors: {
  primary: {
    DEFAULT: '#F6C54A',
    hover:   '#E9B93D',
    light:   '#FFF4CC',
  },
  accent: {
    DEFAULT: '#B85C38',
    hover:   '#A04E2E',
    light:   '#FBF0EB',
  },
  paper:   '#FAFAF7',
  surface: {
    DEFAULT: '#FFFFFF',
    subtle:  '#F8FAFC',
    hover:   '#F1F5F9',
  },
  border: {
    DEFAULT: '#E2E8F0',
    strong:  '#CBD5E1',
  },
  text: {
    primary:   '#0F172A',
    secondary: '#475569',
    tertiary:  '#94A3B8',
    inverse:   '#FFFFFF',
  },
  success: {
    DEFAULT: '#16A34A',
    bg:      '#F0FDF4',
    border:  '#BBF7D0',
  },
  error: {
    DEFAULT: '#DC2626',
    bg:      '#FEF2F2',
    border:  '#FECACA',
  },
  warning: {
    DEFAULT: '#D97706',
    bg:      '#FFFBEB',
    border:  '#FDE68A',
  },
  info: {
    DEFAULT: '#2563EB',
    bg:      '#EFF6FF',
    border:  '#BFDBFE',
  },
},
```

### CSS Custom Properties

All tokens are also defined as CSS variables to enable future theming. Place in `globals.css`:

```css
:root {
  /* Primary */
  --color-primary: #f6c54a;
  --color-primary-hover: #e9b93d;
  --color-primary-light: #fff4cc;

  /* Accent */
  --color-accent: #b85c38;
  --color-accent-hover: #a04e2e;
  --color-accent-light: #fbf0eb;

  /* Surfaces */
  --color-paper: #fafaf7;
  --color-surface: #ffffff;
  --color-surface-subtle: #f8fafc;
  --color-surface-hover: #f1f5f9;

  /* Borders */
  --color-border: #e2e8f0;
  --color-border-strong: #cbd5e1;

  /* Text */
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-tertiary: #94a3b8;
  --color-text-inverse: #ffffff;

  /* Semantic */
  --color-success: #16a34a;
  --color-success-bg: #f0fdf4;
  --color-success-border: #bbf7d0;
  --color-error: #dc2626;
  --color-error-bg: #fef2f2;
  --color-error-border: #fecaca;
  --color-warning: #d97706;
  --color-warning-bg: #fffbeb;
  --color-warning-border: #fde68a;
  --color-info: #2563eb;
  --color-info-bg: #eff6ff;
  --color-info-border: #bfdbfe;
}
```

---

## Action hierarchy

- **Primary actions** use the shared yellow action family in both light and dark themes.
- **Secondary actions** — back, close, cancel, hide, menu, and other supporting controls — use neutral grey surfaces.
- **Warning states** stay semantic. Yellow warning/ambiguous badges are not interchangeable with primary CTA styling.
- **Reusable action primitives** (`AppButton`, `ActionButton`, shared selector pills) own this hierarchy; routes should not hand-roll separate CTA color systems.

---

## 3. Typography Scale

### Font Stack

| Role               | Family         | Source             | Fallback                               |
| ------------------ | -------------- | ------------------ | -------------------------------------- |
| **UI**             | Inter          | `next/font/google` | `system-ui, -apple-system, sans-serif` |
| **Letter preview** | Source Serif 4 | `next/font/google` | `Georgia, 'Times New Roman', serif`    |

**Inter** is used everywhere in the product UI — navigation, forms, labels, buttons, metadata, headings. It is neutral and highly legible at all sizes.

**Source Serif 4** is used exclusively inside `<LetterPreview>`. It matches the locked printed
letter template and keeps preview and final render visually aligned. It must never be used in
workflow UI.

```ts
// app/layout.tsx
import { Inter, Source_Serif_4 } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-letter",
  display: "swap",
  style: ["normal", "italic"],
});
```

```css
/* globals.css */
:root {
  --font-sans: var(--font-inter);
  --font-serif: var(--font-letter);
}

body {
  font-family: var(--font-sans);
}

.letter-preview {
  font-family: var(--font-serif);
}
```

### Type Scale

| Step   | Class       | Size            | Line Height | Letter Spacing | Weight  | Use                                   |
| ------ | ----------- | --------------- | ----------- | -------------- | ------- | ------------------------------------- |
| `4xl`  | `text-4xl`  | 36px / 2.25rem  | 1.2 (tight) | −0.025em       | 700     | Hero headline (marketing only)        |
| `3xl`  | `text-3xl`  | 30px / 1.875rem | 1.25        | −0.02em        | 700     | Page titles                           |
| `2xl`  | `text-2xl`  | 24px / 1.5rem   | 1.3         | −0.015em       | 600     | Section headings, modal titles        |
| `xl`   | `text-xl`   | 20px / 1.25rem  | 1.4         | −0.01em        | 600     | Card headings, step titles            |
| `lg`   | `text-lg`   | 18px / 1.125rem | 1.5         | 0              | 500     | Sub-headings, emphasized body         |
| `base` | `text-base` | 16px / 1rem     | 1.6         | 0              | 400     | Body text, form values                |
| `sm`   | `text-sm`   | 14px / 0.875rem | 1.5         | 0.01em         | 400/500 | Labels, secondary metadata            |
| `xs`   | `text-xs`   | 12px / 0.75rem  | 1.4         | 0.02em         | 400     | Captions, timestamps, legal footnotes |

### Usage Rules

```
Page title (h1)        → text-3xl font-bold text-text-primary
Section heading (h2)   → text-2xl font-semibold text-text-primary
Card/step heading (h3) → text-xl font-semibold text-text-primary
Sub-heading (h4)       → text-lg font-medium text-text-primary
Body paragraph         → text-base font-normal text-text-primary leading-relaxed
Form label             → text-sm font-medium text-text-primary
Helper / hint text     → text-sm font-normal text-text-secondary
Placeholder            → text-sm font-normal text-text-tertiary
Caption / timestamp    → text-xs font-normal text-text-tertiary
Legal / footnote       → text-xs font-normal text-text-secondary
Button (default)       → text-sm font-medium
Button (large)         → text-base font-medium
Badge / pill           → text-xs font-medium uppercase tracking-wide
```

### Tailwind Config — `extend.fontFamily`

```js
fontFamily: {
  sans:  ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
  serif: ['var(--font-letter)', 'Georgia', "'Times New Roman'", 'serif'],
},
```

### Letter Preview Typography

Inside `<LetterPreview>`, use the serif stack with formal document sizing:

```css
.letter-preview {
  font-family: var(--font-serif);
  font-size: 10.5pt; /* matches printed A4 body */
  line-height: 1.65;
  color: #1a1a1a; /* slightly warm black, not #000 */
  letter-spacing: 0.005em;
}

.letter-preview-heading {
  font-size: 12pt;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.letter-preview-address {
  font-size: 9pt;
  line-height: 1.4;
  letter-spacing: 0.01em;
}
```

---

## 4. Spacing System

### Base Unit

**4px** is the atomic unit. All spacing values are multiples of 4px. The working grid is **8px** — most layout decisions happen at 8px increments.

### Tailwind Spacing Scale (relevant subset)

| Token | Value    | px   | Common Use                                 |
| ----- | -------- | ---- | ------------------------------------------ |
| `0.5` | 0.125rem | 2px  | Icon optical nudge                         |
| `1`   | 0.25rem  | 4px  | Tight intra-component gap                  |
| `1.5` | 0.375rem | 6px  | Badge padding horizontal                   |
| `2`   | 0.5rem   | 8px  | Icon-to-text gap, small padding            |
| `3`   | 0.75rem  | 12px | Input vertical padding, small card padding |
| `4`   | 1rem     | 16px | Standard element padding                   |
| `5`   | 1.25rem  | 20px | Card padding (mobile)                      |
| `6`   | 1.5rem   | 24px | Card padding (desktop), section gap        |
| `8`   | 2rem     | 32px | Large section padding, modal padding       |
| `10`  | 2.5rem   | 40px | Between-section spacing                    |
| `12`  | 3rem     | 48px | Page-level vertical rhythm                 |
| `16`  | 4rem     | 64px | Hero sections, large separation            |
| `20`  | 5rem     | 80px | Marketing section padding                  |
| `24`  | 6rem     | 96px | Maximum section spacing                    |

### Component-Level Spacing Conventions

```
Button padding            → px-4 py-2 (default)  |  px-5 py-2.5 (large)  |  px-3 py-1.5 (small)
Input padding             → px-3 py-2.5
Card padding              → p-5 (mobile)  |  p-6 (md+)
Modal padding             → p-6 (mobile)  |  p-8 (md+)
Form field gap            → gap-y-5
Form section gap          → gap-y-8
Inline icon-to-text       → gap-2
Navigation item padding   → px-3 py-2
Tooltip padding           → px-3 py-1.5
Badge/pill padding        → px-2.5 py-0.5
Section vertical padding  → py-12 (mobile)  |  py-16 (md+)  |  py-20 (lg+)
```

### Page Layout

```
Max content width:   max-w-screen-lg  (1024px) — primary app
Max marketing width: max-w-screen-xl  (1280px) — homepage
Horizontal padding:  px-4 (mobile)  |  px-6 (sm+)  |  px-8 (lg+)
```

### Breakpoints

```js
// tailwind.config.ts — default Tailwind breakpoints, no changes needed
screens: {
  'sm': '640px',   // Larger phones, small tablets
  'md': '768px',   // Tablets, split-panel threshold
  'lg': '1024px',  // Desktop, two-column layouts
  'xl': '1280px',  // Wide desktop
  '2xl': '1536px', // (not in active use for MVP)
}
```

**Mobile-first rule:** all base styles target 375–430px viewport. Breakpoint overrides expand the layout — never collapse it.

### Draft Workspace Layout Specifics

At `md` and above, the draft workspace (`/draft/:id`) splits into a two-column layout:

```
md+:  [ConversationPanel 40%] [LetterPreview 60%]
<md:  Single column, panel toggled via tab
```

Letter preview area gets a fixed max-width constraint to simulate A4 proportions:

```css
.letter-preview-container {
  max-width: 680px; /* ~A4 at 96dpi screen representation */
  margin: 0 auto;
}
```

---

## 5. Elevation & Depth

### Philosophy

Elevation communicates **intent and layer position**, not decoration. The z-axis is used sparingly: the page is flat-first, with only interactive or floating elements raised.

### Shadow Scale

```js
// tailwind.config.ts  →  theme.extend.boxShadow
boxShadow: {
  'xs':     '0 1px 2px 0 rgb(0 0 0 / 0.04)',
  'sm':     '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
  'md':     '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
  'lg':     '0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
  'xl':     '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
  'paper':  '0 2px 8px 0 rgb(0 0 0 / 0.06), 0 0 0 1px rgb(0 0 0 / 0.03)',
  'focus':  '0 0 0 3px rgb(30 58 95 / 0.15)',
  'none':   'none',
},
```

### Usage Rules

| Shadow    | Token          | Use                                            |
| --------- | -------------- | ---------------------------------------------- |
| **xs**    | `shadow-xs`    | Subtle card lift, list item separation         |
| **sm**    | `shadow-sm`    | Default card, input on focus, hover state lift |
| **md**    | `shadow-md`    | Dropdown menus, popovers, date pickers         |
| **lg**    | `shadow-lg`    | Modal dialogs, slide-over panels               |
| **xl**    | `shadow-xl`    | Command palette, full-page overlays            |
| **paper** | `shadow-paper` | Letter preview card — _see below_              |
| **focus** | `shadow-focus` | Used programmatically for focus rings          |
| **none**  | `shadow-none`  | Explicitly flat components, nav items          |

### Letter Preview — Special Elevation

The `<LetterPreview>` component uses a distinct treatment to convey "this is a physical document":

```css
.letter-preview-card {
  background-color: var(--color-paper); /* #FAFAF7 — warm off-white */
  box-shadow: var(--shadow-paper); /* subtle lift + hairline border */
  border: 1px solid rgb(0 0 0 / 0.06); /* barely-there inset line */
  border-radius: 2px; /* intentionally small — paper corners */
}
```

The `border-radius: 2px` is a deliberate exception to the standard scale. Paper has nearly square corners; rounding it to `8px` would feel wrong.

---

## 6. Border Radius

### Scale

```js
// tailwind.config.ts  →  theme.extend.borderRadius
borderRadius: {
  'none': '0px',
  'xs':   '4px',
  'sm':   '6px',
  DEFAULT: '8px',   /* md */
  'md':   '8px',
  'lg':   '12px',
  'xl':   '16px',
  '2xl':  '20px',
  'full': '9999px',
}
```

### Usage Rules

| Radius       | Token          | Use                                                        |
| ------------ | -------------- | ---------------------------------------------------------- |
| `none`       | `rounded-none` | Letter preview corners, table cells                        |
| `xs` (4px)   | `rounded-xs`   | Inline code blocks, very small chips                       |
| `sm` (6px)   | `rounded-sm`   | Secondary buttons (outlined style), small modifiers        |
| `md` (8px)   | `rounded-md`   | **Default for inputs, textareas, select, default buttons** |
| `lg` (12px)  | `rounded-lg`   | **Default for cards, panels, modals**                      |
| `xl` (16px)  | `rounded-xl`   | Large feature cards, expanded panels                       |
| `2xl` (20px) | `rounded-2xl`  | Marketing hero cards (use sparingly)                       |
| `full`       | `rounded-full` | **All badges, pills, avatar circles, toggle handles**      |

### Rule of Thumb

- Interactive controls (inputs, buttons) → `rounded-md`
- Containers (cards, panels, dialogs) → `rounded-lg`
- Status chips, tags, badges → `rounded-full`
- Letter preview → `rounded-none` (2px via custom CSS only)

---

## 7. Iconography

### Library

**Lucide** — ships with shadcn/ui. Do not introduce a second icon library. Lucide's consistent `1.5px` stroke weight gives a light, legible feel at all sizes.

```tsx
import { Send, FileText, AlertCircle } from "lucide-react";
```

### Size Rules

| Size   | px   | Class      | Use                                                   |
| ------ | ---- | ---------- | ----------------------------------------------------- |
| **xs** | 14px | `size-3.5` | Dense metadata rows, sub-labels                       |
| **sm** | 16px | `size-4`   | Inline icons next to text, badges                     |
| **md** | 20px | `size-5`   | **Standard** — buttons, nav items, form elements      |
| **lg** | 24px | `size-6`   | Prominent standalone icons, empty state illustrations |
| **xl** | 32px | `size-8`   | Feature icons in cards (outlined bg circle)           |

**Default stroke width:** `strokeWidth={1.5}` — always explicit to prevent Lucide defaults changing between versions.

```tsx
// Correct
<Send size={20} strokeWidth={1.5} />

// Incorrect — do not rely on implicit defaults
<Send />
```

### Icon + Text Alignment

Always use flexbox alignment, not manual margin offsets:

```tsx
<span className="flex items-center gap-2">
  <Send size={16} strokeWidth={1.5} />
  <span>Send Letter</span>
</span>
```

### Custom Icons

Custom SVG icons are permitted **only** for these cases. They must be wrapped as React components with size/color props matching the Lucide interface:

| Icon                | Purpose                                      | Notes                                                |
| ------------------- | -------------------------------------------- | ---------------------------------------------------- |
| `<LetterIcon>`      | Letter/envelope metaphor in product branding | Distinct from Lucide's `Mail` — more formal          |
| `<SwissCrossIcon>`  | Logo area and Swiss-market identity signals  | Used in header/footer only; not a decorative element |
| `<PostalStampIcon>` | Empty state in confirmation/tracking views   | Use sparingly, one context only                      |

All custom icons live in `components/icons/`.

---

## 8. Motion & Animation

### Philosophy

Animation in Episto is **functional, not expressive**. Motion confirms an action happened or guides attention — it never performs. The UI is used in stressful moments (sending an important legal letter). Bouncy or playful motion is wrong here.

### Duration Scale

```js
// tailwind.config.ts  →  theme.extend.transitionDuration
transitionDuration: {
  'fast':        '150ms',   // Hover states, button press feedback
  'normal':      '200ms',   // Most transitions — default
  'slow':        '300ms',   // Panel slides, drawer opens, page transitions
  'deliberate':  '500ms',   // Letter preview re-render indicator, progress steps
}
```

```css
:root {
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --duration-deliberate: 500ms;
}
```

### Easing

```js
// tailwind.config.ts  →  theme.extend.transitionTimingFunction
transitionTimingFunction: {
  'enter':    'cubic-bezier(0, 0, 0.2, 1)',   /* ease-out: elements entering the view */
  'exit':     'cubic-bezier(0.4, 0, 1, 1)',   /* ease-in: elements leaving */
  'inout':    'cubic-bezier(0.4, 0, 0.2, 1)', /* ease-in-out: position changes */
  'spring':   'cubic-bezier(0.34, 1.56, 0.64, 1)', /* slight overshoot for interactions */
}
```

**Rule:** `ease-out` (enter) for anything appearing, `ease-in` (exit) for anything disappearing, `spring` for interactive feedback only (button press, toggle, checkbox).

### What Animates

| Element                  | Animation                        | Duration           | Easing |
| ------------------------ | -------------------------------- | ------------------ | ------ |
| Page transition          | Fade opacity 0→1                 | slow (300ms)       | enter  |
| Dropdown / popover open  | Fade + scale 0.97→1              | normal (200ms)     | enter  |
| Dropdown / popover close | Fade + scale 1→0.97              | fast (150ms)       | exit   |
| Modal enter              | Fade + translateY(8px→0)         | slow (300ms)       | enter  |
| Modal exit               | Fade                             | normal (200ms)     | exit   |
| Toast notification enter | translateX(100%→0)               | normal (200ms)     | enter  |
| Toast notification exit  | opacity 1→0 + translateY(0→-8px) | normal (200ms)     | exit   |
| Button press             | scale(1→0.98)                    | fast (150ms)       | spring |
| Toggle switch            | translate handle                 | normal (200ms)     | spring |
| Progress step advance    | width expand                     | deliberate (500ms) | inout  |
| Letter preview update    | Subtle fade 0.7→1                | slow (300ms)       | enter  |
| Skeleton shimmer         | background-position sweep        | 1.5s infinite      | linear |
| Skeleton → content       | opacity 0→1                      | normal (200ms)     | enter  |

### What Does Not Animate

These must be **instant** (no transition):

- Form field validation error messages appearing
- Inline helper text showing/hiding
- Text content changes inside the letter preview
- Disabled state changes
- Loading spinner spin (CSS `animation`, not `transition`)
- Any state change that is a direct response to the user's own typing

The rule: if the user caused it with a keystroke, it is instant.

### Reduced Motion

Always respect `prefers-reduced-motion`. Wrap all transitions:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 9. Interactive States

### State Matrix

Every interactive element must implement all applicable states. None may be omitted.

#### Default State (no interaction)

```
Background: surface / transparent
Border: border (1px, #E2E8F0) where applicable
Text: text-primary or text-secondary
Shadow: none or shadow-xs
```

#### Hover State

```
Background: surface-hover (#F1F5F9) for ghost/outline elements
            primary-hover (#16304F) for filled primary elements
Border: border-strong (#CBD5E1) for outline inputs
Shadow: shadow-sm (slight elevation increase)
Cursor: pointer
Transition: background-color 150ms ease-out, box-shadow 150ms ease-out
```

#### Focus State (keyboard and programmatic)

```
Outline: none  (remove default browser outline)
Ring: ring-2 ring-primary/50 ring-offset-2

/* Equivalent CSS */
box-shadow: 0 0 0 2px white, 0 0 0 4px rgb(30 58 95 / 0.5);
```

All focusable elements must have a visible focus ring. The `ring-offset-2` ensures the ring never bleeds into the element boundary.

```tsx
// Tailwind class string for any interactive element
className =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2";
```

#### Active / Pressed State

```
Transform: scale(0.98)
Background: slightly darker than hover state
Transition: transform 150ms spring
```

```css
:active {
  transform: scale(0.98);
  transition: transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

Do not apply active scale to: links, text inputs, textareas, checkboxes, radio buttons.

#### Disabled State

```
Opacity: 0.5
Cursor: not-allowed
Pointer events: none (on the element, not always the wrapper)
User select: none
No hover/active state changes
```

```tsx
className =
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";
```

**Important:** Disabled elements must still be keyboard-focusable if they need to communicate why they are disabled (e.g., via `aria-describedby`). Use `aria-disabled` rather than the `disabled` attribute in those cases.

#### Loading State

Two patterns — choose based on context:

**Spinner** — for immediate actions where result is expected within ~2s:

```tsx
// Replace button label with spinner + "Processing…"
// Use the Loader2 icon from Lucide, animate-spin
<Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
```

**Skeleton** — for content areas loading asynchronously:

```tsx
// Skeleton shimmer: bg-surface-subtle + shimmer animation
// Height should match the content it replaces exactly
```

```css
@keyframes shimmer {
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
}

.skeleton {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-md);
}
```

**Do not** show partial data — either show skeleton or real data. Never show an empty container with a spinner inside a content area that previously had content.

### Button State Summary

```
Primary button:
  default  → bg-primary text-white
  hover    → bg-primary-hover
  focus    → + focus ring
  active   → scale(0.98)
  disabled → opacity-50 cursor-not-allowed
  loading  → bg-primary + spinner, no scale

Outline button:
  default  → border border-border bg-transparent text-text-primary
  hover    → bg-surface-hover border-border-strong
  focus    → + focus ring
  active   → scale(0.98) bg-surface-hover

Ghost button:
  default  → bg-transparent text-text-secondary
  hover    → bg-surface-hover text-text-primary
  focus    → + focus ring
  active   → scale(0.98)

Destructive button:
  default  → bg-error text-white
  hover    → bg-error/90
  focus    → ring-2 ring-error/50 ring-offset-2
  active   → scale(0.98)
```

### Form Input State Summary

```
Input / Textarea:
  default  → border-border bg-surface text-text-primary
  hover    → border-border-strong
  focus    → border-primary ring-2 ring-primary/20 ring-offset-0
  error    → border-error ring-2 ring-error/20
  disabled → bg-surface-subtle opacity-50 cursor-not-allowed

Select:
  Same as input + chevron icon (ChevronDown, size 16)

Checkbox / Radio:
  unchecked  → border-border bg-surface
  checked    → bg-primary border-primary text-white
  focus      → ring-2 ring-primary/50 ring-offset-2
  indeterminate (checkbox only) → bg-primary border-primary + dash indicator
```

---

## 10. Dark Mode Notes

### Status: Included in MVP

Dark mode is part of MVP. The visual complexity of a white paper preview on a dark background is real, so the implementation must be deliberate rather than cosmetic: chrome and surrounding surfaces may go dark, but the letter itself remains light paper.

### Implementation Requirements

Dark mode ships now, so these rules are mandatory:

**Rule 1: All color tokens MUST be CSS custom properties** (already specified in §2). Never hardcode hex values inline in components. Always reference a variable.

**Rule 2: Use semantic token names, not descriptive names.** Use `--color-surface` not `--color-white`. Use `--color-text-primary` not `--color-dark-gray`. When dark mode is added, the CSS variable values change — not the token names.

### Dark Mode Implementation Plan

Dark mode is implemented via:

1. **Tailwind `dark:` prefix** — Tailwind will be configured with `darkMode: 'class'` (not `media`), allowing explicit user toggle rather than OS preference-only.

2. **CSS variable redefinition inside `.dark` class** — all `--color-*` variables get new values inside `.dark {}`.

3. **Letter preview exception** — the `<LetterPreview>` component always uses light-mode colors regardless of theme. A physical letter is always white paper. This must be enforced with a `data-theme="light"` attribute or a Tailwind `light` override wrapper.

```css
/* Dark mode structure */
:root {
  /* Light tokens — already defined */
}

.dark {
  --color-primary: #93b4d8; /* lighter for dark bg legibility */
  --color-surface: #0f172a;
  --color-surface-subtle: #1e293b;
  --color-surface-hover: #1e293b;
  --color-border: #1e293b;
  --color-border-strong: #334155;
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-text-tertiary: #475569;
  /* ... etc. */
}

/* Letter preview is always light */
.letter-preview-container {
  --color-paper: #fafaf7;
  --color-text-primary: #0f172a;
  color-scheme: light;
}
```

```js
// tailwind.config.ts
darkMode: 'class',
```

4. **Test matrix** — dark mode requires testing across: homepage, draft workspace (both panels), checkout flow, confirmation, and all toast/alert variants.

---

## Appendix: Quick Reference Card

### Most-Used Tailwind Combos

```tsx
// Standard card
<div className="bg-surface rounded-lg shadow-sm border border-border p-6">

// Letter preview
<div className="bg-paper rounded-[2px] shadow-paper border border-black/[0.06] p-8 max-w-[680px] mx-auto">

// Primary button
<button className="bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-md
                   transition-colors duration-150 ease-out
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2
                   active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">

// Form input
<input className="w-full bg-surface border border-border hover:border-border-strong
                  rounded-md px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary
                  transition-colors duration-150
                  focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                  disabled:bg-surface-subtle disabled:opacity-50 disabled:cursor-not-allowed">

// Section heading
<h2 className="text-2xl font-semibold text-text-primary tracking-[-0.015em]">

// Secondary metadata
<span className="text-sm text-text-secondary">

// Status badge — success
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full
                 bg-success-bg text-success border border-success-border text-xs font-medium">

// Icon + text button (ghost)
<button className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary
                   hover:bg-surface-hover px-3 py-2 rounded-md transition-colors duration-150
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2">
  <Icon size={16} strokeWidth={1.5} />
  <span>Label</span>
</button>
```

### Typography Cheat Sheet

```
Hero heading      → text-4xl font-bold tracking-[-0.025em]
Page title        → text-3xl font-bold tracking-[-0.02em]
Section heading   → text-2xl font-semibold tracking-[-0.015em]
Card heading      → text-xl font-semibold tracking-[-0.01em]
Body              → text-base text-text-primary leading-relaxed
Label             → text-sm font-medium text-text-primary
Hint              → text-sm text-text-secondary
Caption           → text-xs text-text-tertiary
Legal             → text-xs text-text-secondary
```

### Z-Index Ladder

```
Page content:     z-0
Sticky header:    z-10
Dropdown/popover: z-50
Toast:            z-60
Modal backdrop:   z-70
Modal content:    z-80
Command palette:  z-90
```

```js
// tailwind.config.ts  →  theme.extend.zIndex
zIndex: {
  'dropdown': '50',
  'toast':    '60',
  'backdrop': '70',
  'modal':    '80',
  'palette':  '90',
}
```
