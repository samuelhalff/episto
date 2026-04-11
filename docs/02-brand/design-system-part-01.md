# Episto Design System — Part 1

> Split from [design-system.md](design-system.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- 1. Design Philosophy
- 2. Color Palette
- Action hierarchy
- 3. Typography Scale
- 4. Spacing System
- 5. Elevation & Depth
- 6. Border Radius

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
