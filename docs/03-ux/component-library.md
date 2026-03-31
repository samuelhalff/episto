# Component Library

> **Status:** Living specification
> **Owner:** Frontend team
> **Last updated:** 2026-03-15
> **Scope:** Reusable UI and product component behavior. This file does not define route order,
> pricing truth, system states, or business logic outside component boundaries.

This is the complete component catalog for Swiss Mail. Every reusable element — from primitive buttons to product-specific letter previews — is specified here with variants, states, responsive behavior, and accessibility requirements.

Our components serve one mission: **make sending a formal letter feel effortless.** SuperPost competes on price. We compete on experience — the feeling that creating and sending a letter is as easy as sending a text message. Every component must reduce friction, guide the user forward, and feel polished to the pixel.

> **Cross-references:**
> - Visual tokens → [Design System](../02-brand/design-system.md)
> - Page layouts → [Page Specifications](page-specifications.md)
> - Animations → [Micro-Interactions](micro-interactions.md)
> - Mobile behavior → [Mobile Patterns](mobile-patterns.md)
> - Flow order and route intent → [User Flows](user-flows.md)

---

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
├── product/             # Swiss Mail-specific components
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
- `components/product/` may compose primitives into Swiss Mail-specific experiences, but should not fork core sizing, border radius, spacing, or motion rules without a documented decision.
- Repeated CTA treatments belong in shared button wrappers, not per-step utility classes.
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

| Variant | Use case | Tailwind base |
|---------|----------|---------------|
| `primary` | Main CTA — "Draft your letter", "Send" | `bg-primary text-primary-foreground hover:bg-primary/90` |
| `secondary` | Supporting action — "See how it works" | `bg-secondary text-secondary-foreground hover:bg-secondary/80` |
| `outline` | Tertiary action — "Edit", "Back" | `border border-input bg-background hover:bg-accent` |
| `ghost` | Minimal action — inline links, nav items | `hover:bg-accent hover:text-accent-foreground` |
| `destructive` | Dangerous action — "Cancel letter", "Remove" | `bg-destructive text-destructive-foreground hover:bg-destructive/90` |
| `link` | Text-only action — "Learn more" | `text-primary underline-offset-4 hover:underline` |

**Sizes:**

| Size | Height | Padding | Font | Touch target |
|------|--------|---------|------|-------------|
| `sm` | 32px | `px-3` | `text-xs` | 32×32 (desktop only) |
| `md` | 40px | `px-4` | `text-sm` | 40×40 |
| `lg` | 48px | `px-6` | `text-base` | 48×48 (recommended for mobile CTAs) |
| `xl` | 56px | `px-8` | `text-lg` | 56×56 (hero CTAs) |

**States:**

| State | Visual | Transition |
|-------|--------|-----------|
| Default | Base variant styles | — |
| Hover | Background lightens/darkens 10% + shadow-sm appears | 150ms ease-out |
| Focus | `ring-2 ring-primary/50 ring-offset-2` | instant |
| Active | `scale(0.98)` + 5% darker background | 100ms |
| Disabled | `opacity-50 cursor-not-allowed pointer-events-none` | — |
| Loading | Text replaced by spinner (same size). Button width locked. | 150ms crossfade |

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

| State | Border | Label | Helper |
|-------|--------|-------|--------|
| Default | `border-input` | `text-muted-foreground` | `text-muted-foreground` |
| Focus | `ring-2 ring-primary/50 border-primary` | `text-primary` | unchanged |
| Error | `border-destructive ring-destructive/50` | `text-destructive` | `text-destructive` with error message |
| Valid | `border-success` (subtle green) | unchanged | optional success helper |
| Disabled | `opacity-50 bg-muted` | `opacity-50` | hidden |

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

| Prop | Type | Notes |
|------|------|-------|
| `items` | `Array<{ label, href? }>` | Ordered path segments. All but the last segment include `href`. |
| `mobileCollapse` | `boolean` | Default `true`. Collapses middle segments when the trail exceeds 3 levels. |

**Structure:**
- Pattern: `Home > [Section] > [Page]`
- Separators use chevron icons, `text-sm text-secondary`
- Clickable segments use `text-primary`
- Current page is plain text, `text-secondary`, never a link

**States:**

| State | Behavior |
|-------|----------|
| Default | All non-current segments are clickable |
| Current page | Rendered as text only, no hover state |
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

| Variant | Background | Text | Use case |
|---------|-----------|------|----------|
| `default` | `bg-secondary` | `text-secondary-foreground` | Neutral info |
| `primary` | `bg-primary` | `text-primary-foreground` | Active/current |
| `success` | `bg-success/15` | `text-success` | Completed, accepted |
| `warning` | `bg-warning/15` | `text-warning` | Pending, attention |
| `destructive` | `bg-destructive/15` | `text-destructive` | Failed, rejected |
| `outline` | `bg-transparent border` | `text-foreground` | Category tags |

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

These are the components that make Swiss Mail unique. They embody the core experience: **describe what you need → see your letter come to life → send it.**

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

### ZoneEditor

Inline editing interface for individual letter zones (sender, recipient, date, subject, body, closing, signature). Opens when a user clicks/taps a zone in the LetterPreview.

**Used on:** `/draft/:id` — within or overlaying the LetterPreview.

**Desktop: Popover mode**
```
┌──────────────────────────────────────┐
│  Edit: Recipient address        [✕]  │
├──────────────────────────────────────┤
│  Name     [Swisscom AG            ]  │
│  Street   [Alte Tiefenaustrasse 6 ]  │
│  PLZ      [3048 ]  City [Worblaufen] │
│                                      │
│  [Cancel]                   [Save]   │
└──────────────────────────────────────┘
```
- Appears as a `<Popover>` anchored to the clicked zone
- Position: auto — avoids overflow, prefers below the zone
- Width: `max-w-sm` (320px)
- Background: `surface`, `shadow-lg`, `rounded-lg`, `border`

**Mobile: Sheet mode**
- Opens a `<Sheet>` from bottom
- Title: "Edit [zone name]"
- Same field layout, full-width inputs
- "Save" and "Cancel" at bottom, full-width
- Sheet closes on Save, Cancel, or drag-down

**Zone-specific input types:**

| Zone | Inputs |
|------|--------|
| Sender | First name, Last name, Company (optional), Street + number, PLZ + City |
| Recipient | Same as sender |
| Date | Date picker (locale-aware format) |
| Subject | Single-line text input |
| Salutation | Single-line text input with locale-aware default suggestions |
| Body | Multi-line `<Textarea>`, auto-resize, max 2000 chars |
| Closing | Single-line text input with locale-aware default suggestions |
| Signature | Opens `<SignaturePicker>` instead of inline fields |

**Behavior:**
- Save validates fields inline (same error pattern as all forms: red border + error text below field).
- Save triggers a preview re-render. The edited zone highlights briefly with `primary-light` background pulse (300ms).
- Cancel discards changes and returns to preview view. No confirmation dialog for Cancel (edits are small).
- If the user edits a zone that the AI previously generated, a system message is added to the conversation: "Body edited manually" — so the AI knows not to overwrite it (see `page-specifications.md` §6.2 "Revision via ZoneEditor").

**Accessibility:**
- Popover/Sheet: `role="dialog"`, `aria-label="Edit [zone name]"`
- Focus is trapped inside the editor while open.
- First input auto-focused on open.
- `Escape` closes the editor (same as Cancel).
- On close: focus returns to the zone trigger element in the LetterPreview.
- All inputs have associated `<label>` elements. For grouped fields (PLZ + City), use `fieldset` + `legend`.
- Save button: `aria-label="Save [zone name] changes"`

---

### ConversationPanel

**The "magic" interface.** This is where users interact with the AI to draft their letter. It should feel like texting a knowledgeable assistant, not filling out a form.

**Layout:**
```
┌─────────────────────────────────┐
│  ┌─ Messages ─────────────────┐ │  ← scrollable message area
│  │                             │ │
│  │  🤖 Welcome! What kind of  │ │  ← AI message: left-aligned, bg-muted
│  │     letter do you need?    │ │
│  │                             │ │
│  │  ┌── Quick replies ──────┐ │ │  ← suggestion chips below AI message
│  │  │ Cancellation │ Notice │ │ │
│  │  │ Complaint  │ Other    │ │ │
│  │  └──────────────────────┘ │ │
│  │                             │ │
│  │         I need to cancel  │ │  ← User message: right-aligned, bg-primary
│  │         my Swisscom        │ │     text-primary-foreground
│  │         contract            │ │
│  │                             │ │
│  │  🤖 I'll help with that.  │ │
│  │     What's your contract   │ │
│  │     number?                │ │
│  │                             │ │
│  │  ┌── Field Card ─────────┐ │ │  ← extracted/requested field
│  │  │ Contract number       │ │ │     bg-card, rounded-lg, shadow-sm
│  │  │ [_________________]   │ │ │
│  │  └──────────────────────┘ │ │
│  │                             │ │
│  └─────────────────────────────┘ │
│  ┌─ Input bar ────────────────┐ │  ← pinned to bottom
│  │ [Message...        ] 🎤 ➤ │ │     bg-background, border-t
│  └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**Message types:**

| Type | Alignment | Background | Icon |
|------|-----------|-----------|------|
| AI message | Left | `bg-muted` | Small app icon |
| User message | Right | `bg-primary text-primary-foreground` | None |
| System message | Center | `bg-transparent text-muted-foreground text-sm` | None |
| Typing indicator | Left | `bg-muted` | Three pulsing dots |
| Field extraction card | Full-width | `bg-card shadow-sm border` | Field-specific |

**Quick-reply chips:**
- Appear below AI messages when AI offers choices
- Horizontal scroll on mobile, wrap on desktop
- Style: `bg-background border rounded-full px-3 py-1.5 text-sm`
- Tap: sends the chip text as a user message
- Fade in with stagger (50ms per chip)

**Field extraction cards:**
- When AI extracts or requests structured data, show it as a card
- Card contains: field label, current value (or input), validation state
- Auto-populate from conversation context
- User can edit inline or skip (AI will ask again later)

**Input bar:**
- Pinned to bottom of panel (above mobile keyboard when active)
- Input: auto-resize textarea (1-4 rows)
- Send button: right side, `bg-primary rounded-full`, enabled only when input non-empty
- Dictation button: left of send button, microphone icon, prominent on mobile
- Keyboard: `enterkeyhint="send"` on mobile for easy sending

**Accessibility:**
- Message list: `role="log"` `aria-live="polite"` `aria-label="Conversation"`
- New messages announced to screen readers
- Input: `aria-label="Message"` with clear placeholder

**Scroll behavior:**

The conversation panel maintains an auto-scroll-to-bottom behavior that must feel natural:

- **Auto-scroll ON:** When the user is at or near the bottom of the message list (within 100px of the bottom edge), new messages automatically scroll the panel to show the latest message. This is the default state.
- **Auto-scroll OFF:** When the user has scrolled up to review earlier messages (more than 100px from the bottom), auto-scroll pauses. A small "↓ New messages" pill button appears at the bottom of the message area (`bg-primary text-white rounded-full px-3 py-1.5 shadow-md`, fixed position above the input bar). Tapping it smooth-scrolls to the latest message and re-enables auto-scroll.
- **Typing indicator:** Always visible at the bottom when active, even if the user has scrolled up. The "↓" pill updates to "↓ Typing…" when the AI is composing.
- **Smooth scrolling:** Use `scrollBehavior: 'smooth'` for auto-scroll. Duration: ~200ms. Never use `scrollIntoView({ behavior: 'instant' })` for new messages — instant jumps feel broken.
- **Mobile keyboard:** When the mobile keyboard opens, the input bar stays above it (`position: sticky`, `bottom: 0`) and the message list shrinks. The last visible message should remain visible — do not scroll to top when keyboard opens.

**Implementation rule:** Do not use a naive "always scroll to bottom on new message" approach. Users frequently scroll up to review what the AI said earlier. Stealing their scroll position is one of the fastest ways to make the product feel hostile.

---

### DictationButton

**The feature that sets us apart from every competitor.** Users can literally speak their letter into existence.

**Visual:**
```
Default:    [ 🎤 ]      ← 48×48px circle, bg-accent/10, text-accent
Listening:  [ 🎤 ◉ ]    ← pulsing ring animation, bg-accent, text-white
Processing: [ ⏳ ]       ← spinner replaces mic icon
Error:      [ 🎤 ✗ ]    ← brief red flash, then back to default
```

**States:**

| State | Visual | Audio feedback |
|-------|--------|---------------|
| Idle | Mic icon, subtle background | — |
| Listening | Pulsing concentric rings (accent color), mic icon white | Optional: subtle beep on start |
| Processing | Spinner | — |
| Result | Text appears in input, mic returns to idle | — |
| Error | Brief red flash + toast with error message | — |
| Unavailable | Hidden entirely (browser doesn't support Web Speech API) | — |

**Pulsing animation (listening state):**
```css
@keyframes dictation-pulse {
  0% { box-shadow: 0 0 0 0 var(--accent-rgb, 0.4); }
  70% { box-shadow: 0 0 0 12px var(--accent-rgb, 0); }
  100% { box-shadow: 0 0 0 0 var(--accent-rgb, 0); }
}
```

**Mobile placement:** In the input bar, to the left of the send button. Size: 44×44px minimum.

**Desktop placement:** Same position, slightly smaller (40×40px).

**Privacy notice:** First-time use shows a one-time tooltip: "Voice input is processed by your browser. We don't store audio."

---

### DraftWorkspace

The main application screen. Brings together ConversationPanel, LetterPreview, and all editing controls.

**Desktop layout (lg+):**
```
┌─────────────────────────────────────────────────────────────┐
│  Header: Logo │ Step Indicator │ Price │ Language │ CTA     │
├──────────────────────────┬──────────────────────────────────┤
│                          │                                  │
│   ConversationPanel      │      LetterPreview               │
│   (40% width)            │      (60% width)                 │
│                          │                                  │
│   Messages               │      Paper card with zones       │
│   Quick replies          │      Hover to edit zones          │
│   Field cards            │                                  │
│                          │      Attachment thumbnails        │
│   ─────────────────      │      Signature preview            │
│   Input bar + 🎤         │                                  │
│                          │                                  │
├──────────────────────────┴──────────────────────────────────┤
│  Status strip: Delivery type toggle │ Est. pages │ Total    │
└─────────────────────────────────────────────────────────────┘
```

**Mobile layout (default):**
```
┌──────────────────────┐
│ Header: ← │ Step │ ⋮ │
├──────────────────────┤
│                      │
│  ConversationPanel   │  ← full screen
│  (100% width)        │
│                      │
│  Messages            │
│  Quick replies       │
│  Field cards         │
│                      │
│  ────────────────    │
│  Input bar + 🎤      │
│                      │
│   [ 📄 Preview ]     │  ← floating pill button, bottom-center
│                      │     opens LetterPreview as bottom Sheet
├──────────────────────┤
│ Status: Std │ 1p │ {formattedEstimatedTotal} │
└──────────────────────┘
```

**Key behaviors:**
- Conversation and preview are always in sync
- Typing in conversation → AI responds → preview updates
- Editing a zone on preview → updates the draft state → conversation acknowledges
- Status strip shows real-time price estimate based on current content
- Mobile preview sheets should use the full viewport height so the letter canvas gets the maximum possible reading area. Keep preview actions together in one sticky footer stack, with the primary "Confirm content" action first and the secondary "Hide preview" action below it, so preview mode stays clear without duplicating the AI/manual mode toggle that already exists in the composer.

---

### FieldExtractionCard

Displays fields the AI has extracted from the conversation so far. Gives the user a structured view of "what the system knows" and lets them correct or complete information.

**Used on:** `/draft/:id` — inside the conversation panel, appears after the first field is extracted.

**Structure:**
```
┌──────────────────────────────────────────────────┐
│  📋 Letter details                          [✕]  │
├──────────────────────────────────────────────────┤
│  Recipient    Muster AG, Bahnhofstr. 10...  ✏️  │
│  Sender       Anna Meier, Seestrasse 15...  ✏️  │
│  Subject      Kündigung Mitgliedschaft      ✏️  │
│  Date         15. März 2026                 ✏️  │
│  Reference    [not yet provided]         ⚠️     │
└──────────────────────────────────────────────────┘
```

**States per field:**

| State | Visual | Icon |
|-------|--------|------|
| Filled | `text-primary`, truncated with ellipsis | `Pencil` (16px, `text-tertiary`) |
| Empty / not yet provided | `text-tertiary italic` "[not yet provided]" | `AlertCircle` (16px, `text-warning`) |
| Editing | Field becomes an inline text input with `Save` / `Cancel` | — |

**Behavior:**
- Pencil icon click opens inline edit mode for that specific field (NOT a separate page or dialog).
- For address fields: pencil opens a compact address form (street, PLZ, city) in a popover (desktop) or sheet (mobile).
- Saving an inline edit updates both the field card AND the letter preview simultaneously.
- The card is collapsible — chevron toggle in the header. Default state: expanded while fields are being collected, auto-collapses once all required fields are filled.
- Card re-expands with a gentle pulse if the AI asks for a field that was previously provided but now conflicts.

**Responsive:**
- Desktop: card sits below the latest conversation message, full width of the conversation panel.
- Mobile: same positioning, full width. Inline edit uses sheets instead of popovers.

**Accessibility:**
- `role="region"`, `aria-label="Extracted letter details"`
- Each field row is focusable; `Enter` activates edit mode
- Edit mode traps focus within the field until Save/Cancel

---

### QuickReplyChips

Row of contextual suggested replies that appear below AI messages. Provides structured input options for faster interaction.

**Used on:** `/draft/:id` — below AI messages in the conversation panel.

**Structure:**
```
┌─────────────────────────────────────────────────────────┐
│  [Cancel a contract]  [Send a complaint]  [Other]       │
└─────────────────────────────────────────────────────────┘
```

**Visual:**
- Each chip: `<Button variant="outline" size="sm">`, `rounded-full`, `px-3 py-1.5`
- Text: `text-sm`, `text-primary`
- Border: `border-border` (default), `border-primary` on hover
- Background: `transparent` → `primary-light` on hover
- Row uses `flex flex-wrap gap-2` — chips wrap to next line if they exceed available width
- Maximum visible chips: 4 on desktop, 3 on mobile (overflow chips hidden with "More…" toggle)
- Stagger animation: chips appear 50ms apart from left to right (see `micro-interactions.md` §4.3 "Quick-Reply Chips")

**Behavior:**
- Tapping a chip sends that text as a user message in the conversation.
- After sending: the chip row disappears (not just the tapped chip — ALL chips from that AI message).
- Chips are single-use — once any chip is tapped, the set is consumed and removed.
- Chips are contextual: the AI determines which chips to show based on the conversation state machine state.
- If the user types a custom message instead of tapping a chip, the chip row for that AI message also disappears.

**Responsive:**
- Mobile: chips are horizontally scrollable if they overflow (no wrapping). `overflow-x-auto`, `scrollbar-hide`. Show partial last chip as a hint there are more.
- Desktop: wrap to second line if needed.

**Accessibility:**
- Each chip: `role="button"`, `aria-label="Reply: [chip text]"`
- Chip row: `role="group"`, `aria-label="Suggested replies"`
- Focus navigation: left/right arrow keys move between chips; `Enter` or `Space` activates

---

### ErrorBanner

Inline, dismissable error/warning notification that appears within a page section (not a toast — those are ephemeral).

**Used on:** All application pages — conversation panel, review, checkout.

**Variants:**

| Variant | Background | Border | Icon | Use case |
|---------|------------|--------|------|----------|
| `error` | `bg-error/10` | `border-error/20` | `AlertCircle` (error) | AI failure, network error, rendering failure |
| `warning` | `bg-warning/10` | `border-warning/20` | `AlertTriangle` (warning) | Soft validation issues, dispatch ambiguity |
| `info` | `bg-primary/5` | `border-primary/20` | `Info` (primary) | Informational notices |

**Structure:**
```
┌──────────────────────────────────────────────────┐
│  ⚠️  Couldn't get a response. Try again.   [✕]  │
│      [Retry]                                      │
└──────────────────────────────────────────────────┘
```

**Layout rules:**
- Full width of parent container
- Icon (20px) + message text + optional action link/button + dismiss `X`
- `rounded-lg`, `p-3`
- Message text: `text-sm`, `text-primary`
- Action button/link: `<Button variant="ghost" size="sm">` or `<a>` with `underline`

**Behavior:**
- Dismiss button removes the banner with a 150ms fade-out.
- If the error condition is still active after dismiss, the banner may reappear on next relevant action.
- If the banner includes a "Retry" action, tapping it triggers the failed operation again and shows a loading spinner on the button.
- Multiple banners stack vertically with `gap-2` — but aim for at most 2 visible at once. Newer banners replace older ones of the same category.

**Responsive:**
- Mobile: message and action stack vertically
- Desktop: message and action on one line

**Accessibility:**
- `role="alert"` for error variant, `role="status"` for warning/info
- Dismiss button: `aria-label="Dismiss error message"`

---

### StatusStrip

Persistent bottom bar in the draft workspace showing current step, delivery type, running price, and the primary "Continue to Review" CTA.

**Used on:** `/draft/:id` — desktop: pinned at the bottom; mobile: collapsed to a minimal bar.

**Structure (desktop):**
```
┌─────────────────────────────────────────────────────────────────┐
│  Step 2 of 4: Drafting  │  Standard ▾  │  ~CHF 3.90  │ [Continue to Review →] │
└─────────────────────────────────────────────────────────────────┘
```

**Layout (desktop):**
- Full width, fixed to bottom of viewport: `fixed bottom-0 left-0 right-0`
- Height: 56px, `bg-surface`, `border-t border-border`, `shadow-sm` (upward)
- Four sections separated by `border-r border-border`:
  1. **Step label:** `text-sm text-secondary` — "Step N of 4: [step name]"
  2. **Delivery selector:** `<DeliverySelector>` inline toggle — "Standard" / "Registered" with price delta
  3. **Running total:** `text-sm font-medium` `{formattedEstimatedTotal}` — updates with crossfade animation (see micro-interactions §4.8)
  4. **CTA:** `<Button variant="primary" size="sm">` "Continue to Review →" — enabled/disabled per Draft-to-Review conditions

**Layout (mobile):**
- Collapsed to a single-line bar: height 44px
- Shows only: running total + "Continue" button (or disabled state)
- Tap on the price expands a `<Sheet>` with full breakdown: step label, delivery selector, itemized price, CTA
- The sheet follows the standard bottom-sheet pattern from mobile-patterns.md

**States:**
| State | Visual |
|-------|--------|
| Drafting (CTA disabled) | CTA: `opacity-50`, `cursor-not-allowed`. Tooltip: "Complete your letter to continue" |
| Drafting (CTA enabled) | CTA: full primary styling. Optional single pulse nudge after 5s (see page-specs §6.4) |
| Price loading | Price slot shows `<Skeleton>` (40px × 16px) |
| Price unavailable | Price slot: `text-warning text-xs` "Price unavailable" |

**Responsive:**
- Desktop (≥768px): full four-section layout
- Mobile (<768px): collapsed single-line with expandable sheet

**Accessibility:**
- `role="toolbar"`, `aria-label="Draft status and actions"`
- CTA in disabled state: `aria-disabled="true"` + tooltip text as `aria-describedby`
- DeliverySelector: `aria-label="Select delivery type"`

---

### SessionExpiryBanner

Time-sensitive session warning shown inside the drafting workspace before expiry.

**Used on:** `/draft/:id`

**Variants:**

| Variant | Visual | Copy | Action |
|---------|--------|------|--------|
| `warning` | `bg-warning/10 border-warning text-warning-foreground` | "Your session expires in 1 hour. [Save via email]" | Inline link. Dismissible. |
| `critical` | `bg-error/10 border-error text-error-foreground` | "Session expires in 5 minutes. Enter your email to save." | Inline email field + `Save` button. Not dismissible. |

**Structure:**
- Full-width banner below the workspace header
- Border, rounded corners, and `surface` base so warning colour feels layered rather than flat
- Right edge contains either a dismiss button (`warning`) or the inline save form (`critical`)

**States:**

| State | Behavior |
|-------|----------|
| Hidden | Not rendered until the expiry threshold is reached |
| Warning | Shows notice with save-via-email link and dismiss button |
| Critical | Replaces link with inline email input + primary `Save` button |
| Saving | Button shows spinner, form disabled |
| Saved | Success copy replaces form: "Resume link sent to {email}" |

**Animation:** Slide down on appear (200ms), matching the warning-banner pattern from `micro-interactions.md`.

**Responsive:**
- Mobile: content stacks; critical save form becomes full-width beneath the message
- Desktop: message and actions stay on one row when space allows

**Accessibility:**
- `warning` uses `role="status"`, `critical` uses `role="alert"`
- Dismiss button label: `aria-label="Dismiss session expiry warning"`
- Critical email field uses `type="email"` and an associated label, even if visually hidden

---

### AutoSaveIndicator

Minimal status indicator showing draft save state. Lives inside the workspace `<AppHeader>`, right-aligned.

**Used on:** `/draft/:id`

**Purpose:** Provide continuous confidence that the user's work is safe, without drawing attention during normal operation.

**Structure:**
```
┌──────────────────────────────────────────────────┐
│ [Logo]  ● Draft · Review · Pay · Done   ✓ Saved  │
│                                          ↑        │
│                                   AutoSaveIndicator│
└──────────────────────────────────────────────────┘
```

**States:**

| State | Icon | Text | Color | Behavior |
|-------|------|------|-------|----------|
| `idle` | `Check` (12px) | "Saved" | `text-tertiary` | Default. Appears 1s after last successful save. |
| `saving` | `Loader2` (12px, spinning) | "Saving…" | `text-tertiary` | Shown immediately when auto-save triggers. |
| `error` | `AlertCircle` (12px) | "Not saved" | `text-warning` | Persists until save succeeds or user retries. Clickable — opens retry tooltip. |
| `offline` | `WifiOff` (12px) | "Offline — recent changes are not saved yet" | `text-warning` | Persists until reconnected. |

**Visual rules:**
- Fixed width container (`min-w-[100px]`) to prevent layout shift during state transitions.
- Icon and text crossfade on state change (150ms opacity transition) — see `micro-interactions.md` §4.2 "Letter Preview" (Auto-Save Indicator subsection).
- Never use success-green for the "Saved" state — it's not a success event, it's the default state. `text-tertiary` keeps it quiet.
- The `error` state is the only state that should be visually prominent.

**Responsive:**
- Desktop: icon + text label, right-aligned in header
- Mobile: icon only (no text) to save horizontal space. Tooltip on tap shows full status text.

**Accessibility:**
- `role="status"`, `aria-live="polite"` — screen readers announce state changes without interrupting
- `aria-label="Draft save status: [current state]"`
- Error state: `aria-live="assertive"` (elevated urgency)

---

### StepIndicator

Shows progress through the letter-sending flow.

**Steps:** Draft → Review → Payment → Confirmation

**Visual (desktop):**
```
  ● ─────── ○ ─────── ○ ─────── ○
 Draft     Review   Payment  Confirmed
```

**Visual (mobile):** Compact dots without labels (labels appear as page title):
```
  ● ── ○ ── ○ ── ○
```

**Step states:**
- Completed: filled circle (`bg-primary`), checkmark icon, line filled
- Current: filled circle (`bg-primary`), step number, pulsing ring
- Upcoming: hollow circle (`border-muted`), step number, line muted

---

### DeliverySelector

Card-based selector for Standard vs Registered mail.

**Layout:**
```
┌─ Standard ─────────────────┐  ┌─ Registered ──────────────────┐
│  ✓ Selected                │  │                                 │
│                            │  │                                 │
│  📬 Standard delivery      │  │  📬 Registered delivery         │
│                            │  │                                 │
│  Delivery: 2-3 business    │  │  Delivery: 2-3 business days    │
│  days                      │  │  Tracking: Signature required   │
│                            │  │  Proof of delivery              │
│  {formattedStandardPrice}  │  │                                 │
│                            │  │  {formattedRegisteredPrice}    │
└────────────────────────────┘  └─────────────────────────────────┘
```

**Selected state:** `border-primary ring-2 ring-primary/20` + checkmark badge top-right
**Unselected:** `border-border hover:border-primary/50`

**Mobile:** Stacked vertically, full-width cards

**Important:** Standard card includes a subtle note: "No delivery confirmation available for standard mail" — honest status communication.

---

### PriceSummary

Always-visible price breakdown. Transparency builds trust.

**Layout:**
```
┌─────────────────────────────────┐
│  Price breakdown                │
│  ─────────────────────────────  │
│  Base (1 page, standard)  {formattedBasePrice}  │
│  Extra pages (×2)         {formattedExtraPages} │
│  Attachments (1 file)     {formattedAttachments}│
│  ─────────────────────────────  │
│  Total                {formattedTotal} │
│                                 │
│  No hidden fees · No subscription│
└─────────────────────────────────┘
```

**Behavior:**
- Updates in real-time as content changes (page count) or options change (delivery type)
- Price change animates: number morphs to new value (200ms)
- "Total" line: `text-lg font-semibold`
- Trust message at bottom: `text-xs text-muted-foreground`

---

### AttachmentUploader

Drag-and-drop (desktop) or tap-to-select (mobile) file upload.

**Desktop:**
```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│                                  │  ← dashed border, bg-muted/30
│    📎 Drop files here or click   │     hover: bg-muted/50 + border-primary
│    PDF, PNG, JPG · Max 5MB each  │
│                                  │
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

**Mobile:** Tap opens a Sheet with options:
- 📷 Take photo
- 📁 Choose file
- 🖼️ Photo library

**File list (after upload):**
```
┌────────────────────────────────────┐
│  📄 contract.pdf    1.2 MB    ✕   │  ← file card with icon, name, size, remove
│  ████████████████░░░░░ 75%        │  ← progress bar during upload
├────────────────────────────────────┤
│  🖼️ receipt.jpg     340 KB    ✕   │
│  ████████████████████ ✓           │  ← checkmark when complete
└────────────────────────────────────┘
```

**Limits displayed:** "X of 5 files · Y MB of 20 MB used"

**Accepted formats:** PDF, PNG, JPG/JPEG only. Do NOT accept office formats (`.docx`, `.xlsx`, `.pptx`, etc.) — this is a locked product constraint (see `docs/04-product/file-handling.md`). If a user drops or selects a disallowed format, show a `<Toast>` with: "Only PDF, PNG, and JPG files are accepted." Do not silently ignore the file.

**File size enforcement:**
- Per file: max 5 MB. If exceeded, show inline error on the file row: `text-error text-xs` "File exceeds 5 MB limit."
- Total per draft: max 20 MB. If the next upload would exceed this, disable the upload area and show: "Total attachment limit (20 MB) reached."
- Max attachments per draft: 5. Once reached, hide the drop zone and show: "Maximum 5 attachments reached."

**Page count estimate (if attachment pricing is enabled):**
- Below each uploaded PDF file, show an estimated page count: `text-xs text-tertiary` "~N pages"
- Below the file list, show total attachment pages: `text-xs text-secondary` "Total: ~N attachment pages"
- This helps the user anticipate pricing impact before reaching checkout.
- For image files (PNG/JPG), each image counts as 1 page.

**Upload timing constraint:** Attachments can only be uploaded after the first draft exists and remain editable through the Review step. The AttachmentUploader must NOT appear on Checkout — checkout is read-only for attachments. If the user needs to change attachments from Checkout, they must go back to Review.

---

### SignaturePicker

Two modes: typed name or uploaded image.

**Layout:**
```
┌─────────────────────────────────────┐
│  How would you like to sign?        │
│                                     │
│  ┌─ Type name ───────┐  ┌─ Upload ──────┐
│  │  ☑ Selected       │  │               │
│  │                   │  │  📤 Upload     │
│  │  Max Mustermann   │  │  signature     │
│  │  (in italic serif)│  │  image         │
│  └───────────────────┘  └───────────────┘
│                                     │
│  Preview on letter:                 │
│  ┌─────────────────────────────────┐│
│  │  Max Mustermann                 ││  ← how it will appear
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

**Typed signature:** Rendered in italic serif font to look like a signature
**Image upload:** Crop/resize to fit signature zone, stored as file_asset with kind=signature

---

### AddressCard

Formatted Swiss address display with edit capability.

**Layout:**
```
┌──────────────────────────────┐
│  Recipient            ✏️ Edit │
│  ─────────────────────────── │
│  Swisscom AG                 │
│  Kundenservice               │
│  Alte Tiefenaustrasse 6      │
│  3048 Worblaufen             │
│                     ✓ Valid  │
└──────────────────────────────┘
```

**Validation indicator:**
- ✓ green: all required fields present, PLZ format valid
- ⚠ amber: missing optional fields or unverifiable address
- ✗ red: missing required fields

**Edit:** Click Edit → fields become editable inline (desktop) or Sheet opens (mobile)

---

### DispatchStatusCard

Shows the current state of a dispatched letter with visual timeline.

**Layout:**
```
┌─────────────────────────────────────────┐
│  📬 Letter Status                       │
│                                          │
│  ● Submitted to printing                 │  ← completed, green
│  │  15 Mar 2026, 14:23                   │
│  ● Accepted for dispatch                  │  ← completed, green
│  │  15 Mar 2026, 16:45                   │
│  ◉ Delivery status pending                │  ← current, primary, pulsing
│  │  Updates depend on provider capability │
│  ○ Final outcome                          │  ← upcoming, muted
│                                          │
│  Reference: SP-2026-XYZ-123             │  ← tappable to copy
└─────────────────────────────────────────┘
```

**State colors:**
- Completed steps: `text-success` with checkmark
- Current step: `text-primary` with pulsing dot
- Upcoming: `text-muted-foreground`
- Failed: `text-destructive` with X mark

---

### EntryCard

Use-case cards on homepage and draft entry page. These drive conversions.

**Layout:**
```
┌──────────────────────────┐
│  📋                      │  ← icon in accent color circle (48px)
│                          │
│  Cancellation letter     │  ← text-lg font-semibold
│                          │
│  Cancel subscriptions,   │  ← text-sm text-muted-foreground
│  memberships, or         │     2-3 lines max
│  contracts in writing    │
│                          │
│  Draft now →             │  ← text-primary, link-style CTA
└──────────────────────────┘
```

**Hover:** `shadow-md` + slight translateY(-2px) + border-primary/30
**Mobile:** Full-width cards, stacked
**Desktop:** Grid of 2-3 columns

---

### ConfirmationCard

Post-payment success state. The rewarding conclusion of the flow.

**Layout:**
```
┌─────────────────────────────────────────────┐
│                                              │
│                   ✓                          │  ← large success icon (64px)
│                                              │     with brief celebration animation
│     Payment received                         │  ← text-2xl font-bold
│                                              │
│     Reference: SP-2026-XYZ-123              │  ← monospace, tappable to copy
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │  What happens next                      │ │  ← subtle card
│  │                                         │ │
│  │  1. Your letter is being printed        │ │
│  │  2. It has been submitted for dispatch  │ │
│  │  3. We will share any confirmed status  │ │
│  │                                         │ │
│  │  We'll email you status updates at      │ │
│  │  max@example.com                        │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  [ Download receipt ]  [ Send another → ]    │
│                                              │
└─────────────────────────────────────────────┘
```

---

### QRReceiptCard

Inspired by SuperPost. Digital access to the letter via QR code.

**Layout:**
```
┌──────────────────────────┐
│  Digital copy             │
│                          │
│  ┌──────────────────┐   │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓   │   │  ← QR code
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓   │   │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓   │   │
│  └──────────────────┘   │
│                          │
│  Scan to view your       │
│  letter online            │
│  Valid until 14 Apr 2026  │
└──────────────────────────┘
```

---

### ErrorPage

Route-level failure state for pages that cannot recover inline.

**Used on:** `404`, `500`

**Variants:**

| Variant | Use case | Default heading |
|---------|----------|-----------------|
| `notFound` | Unknown route or missing content | "Page not found" |
| `serverError` | Unhandled server failure | "Something went wrong" |
| `sessionExpired` | Expired token or invalid resume state | "Your session has expired" |
| `maintenanceMode` | Planned service interruption | "We'll be back shortly" |

**Structure:**
- Centered card layout, `max-w-md`
- `surface` background with border and `shadow-sm`
- Optional illustration slot above the heading
- Heading uses `text-2xl font-semibold`
- Description uses `text-secondary text-base`
- Action row supports 1-2 buttons: primary + ghost

**States:**

| State | Behavior |
|-------|----------|
| Static | Card with heading, description, and one primary action |
| With secondary action | Adds ghost button for fallback navigation |
| With illustration | Optional SVG appears above heading |

**Animation:** Fade in on mount (300ms). Remove animation entirely when reduced motion is enabled.

**Responsive:**
- Mobile: card uses near-full width with generous horizontal padding
- Desktop: keep card centred with actions right-aligned or stacked based on copy length

**Accessibility:**
- Heading is always the page `h1`
- Action links use descriptive text such as "Go to homepage" or "Start a new letter"
- For 500-level failures, avoid auto-redirects that would interrupt assistive technology users

---

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

| Prop | Type | Notes |
|------|------|-------|
| `heading` | `string` | Required section headline |
| `description` | `string | ReactNode` | 2-3 short paragraphs maximum |
| `imageSrc` | `string` | Asset should stay under 400KB |
| `imageAlt` | `string` | Required descriptive alt text |
| `reversed` | `boolean` | Flips image/text order on tablet and desktop |
| `ctaHref` | `string` | Optional inline CTA link |

**Structure:**
- 50/50 split on tablet and desktop with `gap-16`
- Image sits inside a 16:9 container, rounded-lg, `shadow-sm`
- Text column uses `text-2xl font-semibold` heading and `text-secondary` body copy
- Optional CTA is a text link in `text-primary`

**States:**

| State | Behavior |
|-------|----------|
| Standard | Image left, text right |
| Reversed | Text left, image right |
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

| Element | Behavior |
|---------|----------|
| Search | Debounced 300ms text filter |
| Active chip | `bg-primary text-white` |
| Inactive chip | `bg-muted text-secondary` |
| Sorting | Recommended order by default (curated from config, not alphabetical). No user-facing sort dropdown in MVP. See `page-specifications.md` §11 for template gallery route spec. |

**States:**

| State | Behavior |
|-------|----------|
| Default | Full grid, recommended order (curated from config) |
| Filtered | Grid updates based on query + category |
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
- Logo: `<a>` with `aria-label="Swiss Mail — go to homepage"`
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

**Bottom:** `© 2026 Swiss Mail · Built for Switzerland 🇨🇭`

**Visual:** `bg-slate-900 text-slate-300`, generous padding, `text-sm`

---

### LegalPageLayout

Long-form legal document shell optimised for reading, navigation, and printing.

**Used on:** `/privacy`, `/terms`, `/imprint`

**Props:**

| Prop | Type | Notes |
|------|------|-------|
| `title` | `string` | Page title shown above the document |
| `lastUpdated` | `string` | Rendered at the top in `text-sm text-secondary` |
| `children` | `ReactNode` | Legal markdown or prose content |
| `locale` | `Locale` | Shares the same language selector as the header |

**Structure:**
- Wrapped in `MarketingLayout` so the standard header and footer remain intact on screen
- Main content column is centred, `max-w-prose` (65ch), `py-16`
- Language selector matches the header pattern and supports all 4 locales
- Table of contents auto-generates from `h2` headings
- Desktop: sticky TOC sidebar
- Mobile: collapsible TOC block above the document body
- Headings include anchor links; inline links use `text-primary underline`

**States:**

| State | Behavior |
|-------|----------|
| Default | Header, last-updated line, language selector, TOC, document body |
| Mobile TOC collapsed | Summary button shows and hides the heading list |
| Print | Hide navigation and footer, expand content to full width |

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

| ✅ Do | ❌ Don't |
|-------|---------|
| Use primary button for one main CTA per section | Put two primary buttons next to each other |
| Show loading states for all async actions | Leave the user wondering if something is happening |
| Animate meaningful state changes | Animate everything (respect reduced motion) |
| Use sheets for secondary content on mobile | Open full pages for editing a single field |
| Show real-time price as content changes | Surprise the user with a different total at checkout |
| Make dictation prominent on mobile | Hide voice input behind menus |
| Show honest dispatch status | Collapse "submitted" and "delivered" into one state |
| Use skeleton loaders for initial page loads | Show blank white pages while loading |

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
