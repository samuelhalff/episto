# Component Library — Part 1

> Split from [component-library.md](component-library.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- Component Organization
- Part 1 — Foundation Components (ui/)
- Part 2 — Product Components (product/)

## Component Organization

```
components/
├── ui/                  # shadcn/ui primitives (customized)
│   ├── button.tsx
│   ├── input.tsx
│   ├── textarea.tsx
│   ├── select.tsx
│   ├── checkbox.tsx
│   ├── radio-group.tsx
│   ├── switch.tsx
│   ├── dialog.tsx
│   ├── sheet.tsx
│   ├── dropdown-menu.tsx
│   ├── tooltip.tsx
│   ├── popover.tsx
│   ├── badge.tsx
│   ├── toast.tsx
│   ├── separator.tsx
│   ├── skeleton.tsx
│   ├── accordion.tsx
│   ├── progress.tsx
│   └── breadcrumb.tsx
├── product/             # episto-specific components
│   ├── letter-preview.tsx
│   ├── conversation-panel.tsx
│   ├── draft-workspace.tsx
│   ├── session-expiry-banner.tsx
│   ├── zone-editor.tsx
│   ├── step-indicator.tsx
│   ├── delivery-selector.tsx
│   ├── price-summary.tsx
│   ├── attachment-uploader.tsx
│   ├── signature-picker.tsx
│   ├── dispatch-status-card.tsx
│   ├── address-card.tsx
│   ├── entry-card.tsx
│   ├── confirmation-card.tsx
│   ├── qr-receipt-card.tsx
│   ├── error-page.tsx
│   ├── dictation-button.tsx
│   ├── ai-message.tsx
│   ├── quick-reply-chips.tsx
│   ├── field-extraction-card.tsx
│   ├── error-banner.tsx
│   ├── status-strip.tsx
│   └── auto-save-indicator.tsx
├── marketing/           # Homepage and landing page components
│   ├── hero-section.tsx
│   ├── trust-strip.tsx
│   ├── how-it-works.tsx
│   ├── feature-block.tsx
│   ├── use-case-grid.tsx
│   ├── template-gallery-grid.tsx
│   ├── pricing-card.tsx
│   ├── faq-section.tsx
│   ├── cta-band.tsx
│   └── testimonial-card.tsx
└── layout/              # Structural components
    ├── page-shell.tsx
    ├── marketing-layout.tsx
    ├── app-layout.tsx
    ├── header.tsx
    ├── mobile-nav.tsx
    ├── footer.tsx
    ├── legal-page-layout.tsx
    ├── container.tsx
    └── section.tsx
```

### Implementation guardrails

- `components/ui/` is the only place for shared overlay primitives. Do not hand-roll new modal, sheet, popover, or dropdown foundations inside feature folders.
- `components/product/` may compose primitives into episto-specific experiences, but should not fork core sizing, border radius, spacing, or motion rules without a documented decision.
- Repeated CTA treatments belong in shared button wrappers, not per-step utility classes.
- Primary workflow CTAs use the shared yellow action treatment. Secondary, back, close, and dismiss actions use the shared neutral grey treatment.
- When a component needs presence or transition choreography beyond simple CSS hover/focus feedback, use `framer-motion` on top of the shared primitive rather than bespoke animation logic.
- Bottom dock actions in the draft workspace must remain visible even while a prompt input is focused. If the next action is not yet available, keep the CTA visible and disabled or warning-styled; never hide the dock because focus changed.
- Prompt shortcuts must be categorized by capability. When no body content exists yet, only content-generating shortcuts may be shown; refinement/formatting shortcuts belong only after a draft body exists.
- Prompt shortcut chips and sheet rows should read as soft buttons, not passive labels: keep a visible border, elevation/press feedback, and a restrained warm accent so the controls feel tappable without becoming loud.
- First-draft body generation uses a blocking dialog built from the shared overlay primitives, not an inline “AI is working” strip. Failure states in that dialog use a recovery-hero layout with retry first and any future support path as a secondary action.

---

## Part 1 — Foundation Components (ui/)

### Button

The primary interactive element. Every button must clearly communicate what happens when tapped.

**Variants:**

| Variant       | Use case                                                              | Tailwind base                                                        |
| ------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `primary`     | Main CTA — "Draft your letter", "Send"                                | Shared yellow primary action treatment (`btn-primary`)               |
| `secondary`   | Supporting or dismissive action — "Back", "Close", "See how it works" | Shared neutral grey action treatment (`btn-secondary`)               |
| `outline`     | Tertiary action — "Edit", "Back"                                      | `border border-input bg-background hover:bg-accent`                  |
| `ghost`       | Minimal action — inline links, nav items                              | `hover:bg-accent hover:text-accent-foreground`                       |
| `destructive` | Dangerous action — "Cancel letter", "Remove"                          | `bg-destructive text-destructive-foreground hover:bg-destructive/90` |
| `link`        | Text-only action — "Learn more"                                       | `text-primary underline-offset-4 hover:underline`                    |

**Sizes:**

| Size | Height | Padding | Font        | Touch target                        |
| ---- | ------ | ------- | ----------- | ----------------------------------- |
| `sm` | 32px   | `px-3`  | `text-xs`   | 32×32 (desktop only)                |
| `md` | 40px   | `px-4`  | `text-sm`   | 40×40                               |
| `lg` | 48px   | `px-6`  | `text-base` | 48×48 (recommended for mobile CTAs) |
| `xl` | 56px   | `px-8`  | `text-lg`   | 56×56 (hero CTAs)                   |

**States:**

| State    | Visual                                                     | Transition      |
| -------- | ---------------------------------------------------------- | --------------- |
| Default  | Base variant styles                                        | —               |
| Hover    | Background lightens/darkens 10% + shadow-sm appears        | 150ms ease-out  |
| Focus    | `ring-2 ring-primary/50 ring-offset-2`                     | instant         |
| Active   | `scale(0.98)` + 5% darker background                       | 100ms           |
| Disabled | `opacity-50 cursor-not-allowed pointer-events-none`        | —               |
| Loading  | Text replaced by spinner (same size). Button width locked. | 150ms crossfade |

**Icon support:**

- Icon-left: `<Button><Icon /> Label</Button>` — icon at 16px, 8px gap
- Icon-right: `<Button>Label <Icon /></Button>`
- Icon-only: square button, icon centered, `aria-label` required

**Accessibility:**

- All buttons have visible focus indicators
- Loading buttons get `aria-busy="true"` and `aria-disabled="true"`
- Disabled buttons remain in tab order with `aria-disabled="true"` (not `disabled` attribute, which removes from tab order)

**Rules:**

- ✅ Button labels describe the action: "Send my letter", "Upload file"
- ✅ One primary button per visible section
- ✅ Back, close, cancel, and other supporting controls reuse the shared secondary treatment instead of inventing route-specific chrome
- ❌ Never use "Click here" or "Submit"
- ❌ Never put two primary buttons next to each other
- ❌ Never disable without a tooltip explaining why

---

### Input

Text input for single-line data: names, addresses, email, phone.

**Structure:**

```
┌─────────────────────────────┐
│ Label                       │  ← text-sm text-muted-foreground, above input
│ ┌─────────────────────────┐ │
│ │ Value or placeholder    │ │  ← h-10 (40px), rounded-md, border
│ └─────────────────────────┘ │
│ Helper text or error        │  ← text-xs, below input
└─────────────────────────────┘
```

**Variants:**

- `default`: Standard text input
- `with-icon`: Left icon inside input (search, email, phone icons)
- `with-action`: Right-side button (clear, copy, visibility toggle)

**States:**

| State    | Border                                   | Label                   | Helper                                |
| -------- | ---------------------------------------- | ----------------------- | ------------------------------------- |
| Default  | `border-input`                           | `text-muted-foreground` | `text-muted-foreground`               |
| Focus    | `ring-2 ring-primary/50 border-primary`  | `text-primary`          | unchanged                             |
| Error    | `border-destructive ring-destructive/50` | `text-destructive`      | `text-destructive` with error message |
| Valid    | `border-success` (subtle green)          | unchanged               | optional success helper               |
| Disabled | `opacity-50 bg-muted`                    | `opacity-50`            | hidden                                |

**Input modes** (critical for mobile keyboards):

- Name: `inputMode="text"` `autoComplete="name"`
- Email: `inputMode="email"` `autoComplete="email"` `type="email"`
- Phone: `inputMode="tel"` `autoComplete="tel"` `type="tel"`
- PLZ: `inputMode="numeric"` `pattern="[0-9]{4}"` `maxLength={4}`
- Street: `inputMode="text"` `autoComplete="street-address"`
- City: `inputMode="text"` `autoComplete="address-level2"`

**Accessibility:**

- Label associated via `htmlFor`/`id`
- Error messages linked with `aria-describedby`
- Required fields use `aria-required="true"` + visual indicator (asterisk)
- Autocomplete attributes on all address and identity fields

---

### Textarea

Multi-line text input. Primary use: letter body content in manual edit mode.

**Props:**

- `maxLength`: Character limit (default: 10,000 for letter body)
- `showCount`: Show "X / 10,000" character counter
- `autoResize`: Grow with content (min 4 rows, max 20 rows)

**Visual:**

- Same border/focus/error states as Input
- Character counter: bottom-right, `text-xs text-muted-foreground`
- Counter turns `text-warning` at 90%, `text-destructive` at 100%

---

### Select

Single-value selection with optional search.

**Use cases:**

- Delivery type (Standard / Registered)
- Language selector (DE / FR / IT / EN)
- Tone selector (Formal / Neutral / Firm)

**Behavior:**

- Trigger: styled like Input, with chevron-down icon right
- Dropdown: `bg-popover`, `shadow-lg`, `rounded-md`, max 8 visible items
- Search: optional, appears as input at top of dropdown
- Selection: item highlights on hover, checkmark on selected item
- Mobile: opens as native `<select>` on iOS/Android for better UX (configurable)

---

### Breadcrumb

Wayfinding for multi-level pages. Keeps users oriented without competing with the main CTA.

**Used on:** `/how-it-works`, `/use-cases/:slug`, and `/templates`

**Props:**

| Prop             | Type                      | Notes                                                                      |
| ---------------- | ------------------------- | -------------------------------------------------------------------------- |
| `items`          | `Array<{ label, href? }>` | Ordered path segments. All but the last segment include `href`.            |
| `mobileCollapse` | `boolean`                 | Default `true`. Collapses middle segments when the trail exceeds 3 levels. |

**Structure:**

- Pattern: `Home > [Section] > [Page]`
- Separators use chevron icons, `text-sm text-secondary`
- Clickable segments use `text-primary`
- Current page is plain text, `text-secondary`, never a link

**States:**

| State            | Behavior                                         |
| ---------------- | ------------------------------------------------ |
| Default          | All non-current segments are clickable           |
| Current page     | Rendered as text only, no hover state            |
| Collapsed mobile | If more than 3 levels, show `... > Current Page` |

**Responsive:**

- Mobile: collapse middle segments when the trail exceeds 3 levels
- Desktop: show the full trail inline, wrap only if space is constrained

**Accessibility:**

- Wrapper uses `nav aria-label="Breadcrumb"`
- Segments are rendered inside an ordered list (`ol`)
- Current page uses `aria-current="page"`

---

### Dialog / Modal

Centered overlay for confirmations and important information.

**Structure:**

```
┌──── Backdrop (bg-black/50, backdrop-blur-sm) ─────┐
│                                                     │
│    ┌─── Dialog (bg-background, rounded-lg) ───┐    │
│    │ Header: Title + optional close (X)        │    │
│    │ ─────────────────────────────────────────  │    │
│    │ Content: text, form, or custom            │    │
│    │ ─────────────────────────────────────────  │    │
│    │ Footer: Action buttons (right-aligned)    │    │
│    └───────────────────────────────────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Sizes:**

- `sm`: max-w-sm (384px) — confirmation dialogs
- `md`: max-w-md (448px) — standard dialogs
- `lg`: max-w-lg (512px) — complex forms
- `full`: max-w-screen (mobile) — mobile fullscreen

**Animation:** Fade + scale from 0.95→1 (200ms). Backdrop fade 150ms.

**Accessibility:**

- Focus trapped inside dialog
- Escape key closes dialog
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby`
- Return focus to trigger element on close

---

### Sheet / Bottom Drawer

Slide-in panel. **The primary secondary surface on mobile.**

**Behavior:**

- **Mobile**: Slides up from bottom, drag handle at top, drag-to-dismiss
- **Desktop**: Slides in from right side (or bottom, configurable)
- Backdrop: same as Dialog

**Use cases (critical for our mobile-first UX):**

- Letter preview on mobile (50% → full height, draggable)
- Zone editing on mobile (type in sheet, see result on preview above)
- Attachment upload options (Camera, Files, Photo Library)
- Signature creation
- Address editing
- Delivery details

**Canonical sheet archetypes:**

- **Navigation sheet** — full-height side sheet for menu/navigation content. Header holds title + close control; content scrolls independently.
- **Action/list sheet** — bottom sheet for compact option lists and step menus. Use a drag handle, compact list rows, and a safe-area footer action.
- **Preview sheet** — immersive bottom sheet for large preview surfaces. Keep a sticky safe-area footer for the main actions.

**Consistency rules:**

- Footer actions must stay fully inside the viewport and above `env(safe-area-inset-bottom)`.
- Bottom-sheet bodies scroll independently; headers and footers do not.
- Every vertically scrollable workspace or sheet surface should use the shared scroll-shadow treatment so users can tell when more content exists above or below the viewport.
- In dark mode, workspace and sheet shells should use layered neutral/slate surfaces rather than pure black fills. The letter preview itself stays visually light, but the surrounding preview rail and other scrollable app surfaces should use the same muted dark surface tokens so scrolling never drops into a black void.
- Action/list sheets use denser rows than full-page cards. Do not reuse oversized marketing or form cards inside compact sheets.
- Step menus in the draft workspace are sequential. Future steps stay disabled until the previous step is confirmed; show a lock icon + "Locked" label instead of allowing dead-end navigation.
- Draft-workspace dock controls use one shared 56x56 rounded-2xl surface button pattern, and field-leading icons use one shared 48x48 rounded-2xl muted badge pattern.

**Drag behavior:**

- Drag handle: 32×4px rounded pill, centered, `bg-muted-foreground/30`
- Drag thresholds: >30% down = dismiss, <30% = snap back
- Snap points: 50% height, 90% height, closed

---

### Badge

Compact status indicator.

**Variants:**

| Variant       | Background              | Text                        | Use case            |
| ------------- | ----------------------- | --------------------------- | ------------------- |
| `default`     | `bg-secondary`          | `text-secondary-foreground` | Neutral info        |
| `primary`     | `bg-primary`            | `text-primary-foreground`   | Active/current      |
| `success`     | `bg-success/15`         | `text-success`              | Completed, accepted |
| `warning`     | `bg-warning/15`         | `text-warning`              | Pending, attention  |
| `destructive` | `bg-destructive/15`     | `text-destructive`          | Failed, rejected    |
| `outline`     | `bg-transparent border` | `text-foreground`           | Category tags       |

**Sizes:** `sm` (20px height, text-xs), `md` (24px height, text-xs)

**Status badge mapping:**

- Draft collecting → `default` "Drafting"
- Fields complete → `primary` "Ready for review"
- Payment authorized → `warning` "Payment pending"
- Dispatch submitted → `warning` "Submitted"
- Dispatch accepted → `success` "Accepted"
- Dispatch rejected → `destructive` "Rejected"
- Dispatch unknown → `warning` "Status pending"

---

### Toast / Notification

Ephemeral feedback messages.

**Variants:** `success` (green icon), `error` (red icon), `warning` (amber icon), `info` (blue icon)

**Behavior:**

- Position: top-center (mobile), top-right (desktop)
- Enter: slide down + fade in (200ms)
- Auto-dismiss: 5 seconds (success/info), persistent (error/warning)
- Progress bar: thin bar at bottom, shrinks over dismiss duration
- Stack: max 3 visible, newest on top
- Dismiss: swipe right (mobile), X button, or click

**Accessibility:** `role="status"` for info/success, `role="alert"` for error/warning

---

### Skeleton

Loading placeholder that matches the shape of content it replaces.

**Visual:** `bg-muted rounded-md` with shimmer animation (left-to-right gradient sweep, 1.5s loop)

**Rules:**

- Match the exact dimensions and layout of the content being loaded
- Use rounded rectangles for text lines, circles for avatars
- Content replaces skeleton with 200ms crossfade
- **Never show a blank page.** Skeleton appears within 100ms of navigation.

---

## Part 2 — Product Components (product/)

These are the components that make episto unique. They embody the core experience: **describe what you need → see your letter come to life → send it.**

### LetterPreview

**The signature component of the entire product.** A real-time preview of the letter as it will be printed and mailed. This is what makes users say "wow" — seeing their words become a physical letter before their eyes.

**Visual:**

```
┌─────────────────────────────────────────┐
│  ┌───────────────────────────────────┐  │
│  │  ╭─ Sender Zone ──────────────╮   │  │  ← bg-paper (cream-white)
│  │  │  Max Mustermann            │   │  │     shadow-paper (custom elevation)
│  │  │  Musterstrasse 1           │   │  │     aspect-[210/297] (A4 ratio)
│  │  │  8000 Zürich               │   │  │     border border-border/30
│  │  ╰────────────────────────────╯   │  │
│  │                                    │  │
│  │  ╭─ Recipient Zone ───────────╮   │  │
│  │  │  Swisscom AG               │   │  │
│  │  │  Kundenservice             │   │  │
│  │  │  Alte Tiefenaustrasse 6    │   │  │
│  │  │  3048 Worblaufen           │   │  │
│  │  ╰────────────────────────────╯   │  │
│  │                                    │  │
│  │  Zürich, 15. März 2026            │  │
│  │                                    │  │
│  │  ╭─ Subject ──────────────────╮   │  │
│  │  │  Kündigung Mobilfunkvertrag│   │  │
│  │  ╰────────────────────────────╯   │  │
│  │                                    │  │
│  │  Sehr geehrte Damen und Herren,   │  │
│  │                                    │  │
│  │  ╭─ Body ─────────────────────╮   │  │
│  │  │  Hiermit kündige ich ...   │   │  │
│  │  │  ....                      │   │  │
│  │  ╰────────────────────────────╯   │  │
│  │                                    │  │
│  │  Freundliche Grüsse,              │  │
│  │  ╭─ Signature ────────────────╮   │  │
│  │  │  [signature image/text]    │   │  │
│  │  │  Max Mustermann            │   │  │
│  │  ╰────────────────────────────╯   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Key properties:**

- Background: `bg-paper` (`#FAFAF7` — see design-system.md §2)
- Shadow: `shadow-paper` — `0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)` — subtle paper elevation
- Border: `border border-border/30` — barely visible edge
- Font: Serif font (Source Serif 4) for letter content, matching real printed output
- Scale: fits container width, maintains A4 aspect ratio, min-height ensures visible even with little content

**Zone editing (desktop):**

- Hover over a zone → subtle `bg-primary/5` tint + dashed border appears (150ms)
- Click zone → inline editing appears (ZoneEditor component — see below)
- Zones: sender, recipient, date, subject, salutation, body, closing, signature

**Zone editing (mobile):**

- Tap zone → bottom Sheet opens with edit form for that zone
- Sheet has the zone title and structured inputs
- Save → sheet closes, preview updates with highlight pulse (200ms)

**Zone tab order (accessibility — critical):**

- Zones must be keyboard-navigable. Tab order follows visual layout: sender → recipient → date → subject → salutation → body → closing → signature.
- Each zone: `tabindex="0"`, `role="button"`, `aria-label="Edit [zone name]"` (e.g., "Edit recipient address").
- `Enter` or `Space` activates the zone editor for that zone.
- When a zone is selected, focus moves into the ZoneEditor. On close, focus returns to the zone trigger.
- Visual focus ring: `ring-2 ring-primary ring-offset-2` — must be visible on all zones.

**Real-time updates:**

- As AI generates text, content streams into the body zone
- Changed text briefly pulses with subtle `bg-primary/5` highlight
- Smooth transitions — never jarring or jumpy

**Responsive:**

- Desktop: fixed in right panel (60% width), scrollable if letter is long
- Mobile: hidden by default, accessible via floating "Preview" pill button
- Tablet: below conversation panel, scaled to fit

**Zoom:**

- Mobile (in bottom sheet): NO pinch-to-zoom — nested scrolling within a sheet creates a confusing UX. Instead, provide a "Full screen" button that opens the preview in a full-viewport overlay where pinch-to-zoom IS enabled (see `mobile-patterns.md` MDZ-6).
- Mobile (in full-screen overlay): pinch-to-zoom supported
- Desktop: optional zoom slider (75%, 100%, 125%)

---
