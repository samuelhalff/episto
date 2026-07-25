# Component Library — Part 2

> Split from [component-library.md](component-library.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- Part 2 — Product Components (product/)

## Part 2 — Product Components (product/)

These are the components that make episto unique. They embody the core experience: **describe what you need → see your letter come to life → send it.**

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

| Zone       | Inputs                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| Sender     | First name, Last name, Company (optional), Street + number, PLZ + City |
| Recipient  | Same as sender                                                         |
| Date       | Date picker (locale-aware format)                                      |
| Subject    | Single-line text input                                                 |
| Salutation | Single-line text input with locale-aware default suggestions           |
| Body       | Multi-line `<Textarea>`, auto-resize, max 2000 chars                   |
| Closing    | Single-line text input with locale-aware default suggestions           |
| Signature  | Opens `<SignaturePicker>` instead of inline fields                     |

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

## Part 2 — Product Components (product/)

These are the components that make episto unique. They embody the core experience: **describe what you need → see your letter come to life → send it.**

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

| Type                  | Alignment  | Background                                     | Icon               |
| --------------------- | ---------- | ---------------------------------------------- | ------------------ |
| AI message            | Left       | `bg-muted`                                     | Small app icon     |
| User message          | Right      | `bg-primary text-primary-foreground`           | None               |
| System message        | Center     | `bg-transparent text-muted-foreground text-sm` | None               |
| Typing indicator      | Left       | `bg-muted`                                     | Three pulsing dots |
| Field extraction card | Full-width | `bg-card shadow-sm border`                     | Field-specific     |

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

## Part 2 — Product Components (product/)

These are the components that make episto unique. They embody the core experience: **describe what you need → see your letter come to life → send it.**

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

| State       | Visual                                                                               | Audio feedback                 |
| ----------- | ------------------------------------------------------------------------------------ | ------------------------------ |
| Idle        | Mic icon, subtle background                                                          | —                              |
| Listening   | Pulsing concentric rings (accent color), mic icon white                              | Optional: subtle beep on start |
| Processing  | Spinner                                                                              | —                              |
| Result      | Text appears in input, mic returns to idle                                           | —                              |
| Error       | Brief red flash + toast with error message                                           | —                              |
| Unavailable | Visible with a clear unavailable message (mic capture or live transport unsupported) | —                              |

**Pulsing animation (listening state):**

```css
@keyframes dictation-pulse {
  0% {
    box-shadow: 0 0 0 0 var(--accent-rgb, 0.4);
  }
  70% {
    box-shadow: 0 0 0 12px var(--accent-rgb, 0);
  }
  100% {
    box-shadow: 0 0 0 0 var(--accent-rgb, 0);
  }
}
```

**Mobile placement:** In the input bar, to the left of the send button. Size: 44×44px minimum.

**Desktop placement:** Same position, slightly smaller (40×40px).

**Privacy notice:** First-time use shows a one-time tooltip: "Voice input is processed by your browser. We don't store audio."

---

## Part 2 — Product Components (product/)

These are the components that make episto unique. They embody the core experience: **describe what you need → see your letter come to life → send it.**

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

## Part 2 — Product Components (product/)

These are the components that make episto unique. They embody the core experience: **describe what you need → see your letter come to life → send it.**

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

| State                    | Visual                                                    | Icon                                 |
| ------------------------ | --------------------------------------------------------- | ------------------------------------ |
| Filled                   | `text-primary`, truncated with ellipsis                   | `Pencil` (16px, `text-tertiary`)     |
| Empty / not yet provided | `text-tertiary italic` "[not yet provided]"               | `AlertCircle` (16px, `text-warning`) |
| Editing                  | Field becomes an inline text input with `Save` / `Cancel` | —                                    |

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

## Part 2 — Product Components (product/)

These are the components that make episto unique. They embody the core experience: **describe what you need → see your letter come to life → send it.**

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

## Part 2 — Product Components (product/)

These are the components that make episto unique. They embody the core experience: **describe what you need → see your letter come to life → send it.**

### ErrorBanner

Inline, dismissable error/warning notification that appears within a page section (not a toast — those are ephemeral).

**Used on:** All application pages — conversation panel, review, checkout.

**Variants:**

| Variant   | Background      | Border              | Icon                      | Use case                                     |
| --------- | --------------- | ------------------- | ------------------------- | -------------------------------------------- |
| `error`   | `bg-error/10`   | `border-error/20`   | `AlertCircle` (error)     | AI failure, network error, rendering failure |
| `warning` | `bg-warning/10` | `border-warning/20` | `AlertTriangle` (warning) | Soft validation issues, dispatch ambiguity   |
| `info`    | `bg-primary/5`  | `border-primary/20` | `Info` (primary)          | Informational notices                        |

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

## Part 2 — Product Components (product/)

These are the components that make episto unique. They embody the core experience: **describe what you need → see your letter come to life → send it.**

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
