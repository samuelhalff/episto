# Component Library — Part 3

> Split from [component-library.md](component-library.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- Part 2 — Product Components (product/)

## Part 2 — Product Components (product/)

These are the components that make Episto unique. They embody the core experience: **describe what you need → see your letter come to life → send it.**

### SessionExpiryBanner

Time-sensitive session warning shown inside the drafting workspace before expiry.

**Used on:** `/draft/:id`

**Variants:**

| Variant    | Visual                                                 | Copy                                                      | Action                                               |
| ---------- | ------------------------------------------------------ | --------------------------------------------------------- | ---------------------------------------------------- |
| `warning`  | `bg-warning/10 border-warning text-warning-foreground` | "Your session expires in 1 hour. [Save via email]"        | Inline link. Dismissible.                            |
| `critical` | `bg-error/10 border-error text-error-foreground`       | "Session expires in 5 minutes. Enter your email to save." | Inline email field + `Save` button. Not dismissible. |

**Structure:**

- Full-width banner below the workspace header
- Border, rounded corners, and `surface` base so warning colour feels layered rather than flat
- Right edge contains either a dismiss button (`warning`) or the inline save form (`critical`)

**States:**

| State    | Behavior                                                      |
| -------- | ------------------------------------------------------------- |
| Hidden   | Not rendered until the expiry threshold is reached            |
| Warning  | Shows notice with save-via-email link and dismiss button      |
| Critical | Replaces link with inline email input + primary `Save` button |
| Saving   | Button shows spinner, form disabled                           |
| Saved    | Success copy replaces form: "Resume link sent to {email}"     |

**Animation:** Slide down on appear (200ms), matching the warning-banner pattern from `micro-interactions.md`.

**Responsive:**

- Mobile: content stacks; critical save form becomes full-width beneath the message
- Desktop: message and actions stay on one row when space allows

**Accessibility:**

- `warning` uses `role="status"`, `critical` uses `role="alert"`
- Dismiss button label: `aria-label="Dismiss session expiry warning"`
- Critical email field uses `type="email"` and an associated label, even if visually hidden

---

## Part 2 — Product Components (product/)

These are the components that make Episto unique. They embody the core experience: **describe what you need → see your letter come to life → send it.**

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

| State     | Icon                       | Text                                         | Color           | Behavior                                                                       |
| --------- | -------------------------- | -------------------------------------------- | --------------- | ------------------------------------------------------------------------------ |
| `idle`    | `Check` (12px)             | "Saved"                                      | `text-tertiary` | Default. Appears 1s after last successful save.                                |
| `saving`  | `Loader2` (12px, spinning) | "Saving…"                                    | `text-tertiary` | Shown immediately when auto-save triggers.                                     |
| `error`   | `AlertCircle` (12px)       | "Not saved"                                  | `text-warning`  | Persists until save succeeds or user retries. Clickable — opens retry tooltip. |
| `offline` | `WifiOff` (12px)           | "Offline — recent changes are not saved yet" | `text-warning`  | Persists until reconnected.                                                    |

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

## Part 2 — Product Components (product/)

These are the components that make Episto unique. They embody the core experience: **describe what you need → see your letter come to life → send it.**

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

## Part 2 — Product Components (product/)

These are the components that make Episto unique. They embody the core experience: **describe what you need → see your letter come to life → send it.**

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

## Part 2 — Product Components (product/)

These are the components that make Episto unique. They embody the core experience: **describe what you need → see your letter come to life → send it.**

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

## Part 2 — Product Components (product/)

These are the components that make Episto unique. They embody the core experience: **describe what you need → see your letter come to life → send it.**

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

## Part 2 — Product Components (product/)

These are the components that make Episto unique. They embody the core experience: **describe what you need → see your letter come to life → send it.**

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

## Part 2 — Product Components (product/)

These are the components that make Episto unique. They embody the core experience: **describe what you need → see your letter come to life → send it.**

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

## Part 2 — Product Components (product/)

These are the components that make Episto unique. They embody the core experience: **describe what you need → see your letter come to life → send it.**

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

## Part 2 — Product Components (product/)

These are the components that make Episto unique. They embody the core experience: **describe what you need → see your letter come to life → send it.**

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

## Part 2 — Product Components (product/)

These are the components that make Episto unique. They embody the core experience: **describe what you need → see your letter come to life → send it.**

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

## Part 2 — Product Components (product/)

These are the components that make Episto unique. They embody the core experience: **describe what you need → see your letter come to life → send it.**

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

## Part 2 — Product Components (product/)

These are the components that make Episto unique. They embody the core experience: **describe what you need → see your letter come to life → send it.**

### ErrorPage

Route-level failure state for pages that cannot recover inline.

**Used on:** `404`, `500`

**Variants:**

| Variant           | Use case                              | Default heading            |
| ----------------- | ------------------------------------- | -------------------------- |
| `notFound`        | Unknown route or missing content      | "Page not found"           |
| `serverError`     | Unhandled server failure              | "Something went wrong"     |
| `sessionExpired`  | Expired token or invalid resume state | "Your session has expired" |
| `maintenanceMode` | Planned service interruption          | "We'll be back shortly"    |

**Structure:**

- Centered card layout, `max-w-md`
- `surface` background with border and `shadow-sm`
- Optional illustration slot above the heading
- Heading uses `text-2xl font-semibold`
- Description uses `text-secondary text-base`
- Action row supports 1-2 buttons: primary + ghost

**States:**

| State                 | Behavior                                               |
| --------------------- | ------------------------------------------------------ |
| Static                | Card with heading, description, and one primary action |
| With secondary action | Adds ghost button for fallback navigation              |
| With illustration     | Optional SVG appears above heading                     |

**Animation:** Fade in on mount (300ms). Remove animation entirely when reduced motion is enabled.

**Responsive:**

- Mobile: card uses near-full width with generous horizontal padding
- Desktop: keep card centred with actions right-aligned or stacked based on copy length

**Accessibility:**

- Heading is always the page `h1`
- Action links use descriptive text such as "Go to homepage" or "Start a new letter"
- For 500-level failures, avoid auto-redirects that would interrupt assistive technology users

---
