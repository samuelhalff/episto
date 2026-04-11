# Episto Design System — Part 2

> Split from [design-system.md](design-system.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- 7. Iconography
- 8. Motion & Animation
- 9. Interactive States
- 10. Dark Mode Notes
- Appendix: Quick Reference Card

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
