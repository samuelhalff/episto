# Mobile UX Patterns — Part 1

> Split from [mobile-patterns.md](mobile-patterns.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- 1. Mobile-First Philosophy
- 2. Responsive Breakpoints
- 3. Touch Interaction Patterns
- 4. Navigation on Mobile
- 5. Key Mobile Layouts
- 6. Keyboard and Input Patterns

## 1. Mobile-First Philosophy

The product exists because people need to send formal Swiss letters from their phones — during commutes, waiting rooms, and urgent moments. Desktop is a bonus, not the baseline.

**Core principles:**

- Design every screen for a 390px viewport first. Scale up, never scale down.
- Primary actions live in the bottom third of the screen (thumb zone).
- One-hand operation must work for every step of the core flow: draft → preview → pay → confirm.
- Desktop layouts inherit mobile decisions; mobile layouts never inherit desktop assumptions.
- Performance is a feature. Users on mobile data must feel a snappy, lightweight experience. No gratuitous animations, oversized bundles, or layout shift.

**Competitive framing:**

SuperPost markets "write and send from your mobile phone" but their UX is retrofitted. DocuPost and Pingen are desktop-first, business-oriented products. episto's advantage is building mobile-first from day one, so the mobile experience is the designed experience — not a shrunk desktop.

---

## 2. Responsive Breakpoints

All breakpoints use Tailwind's default scale. Mobile is the default — no prefix needed.

| Breakpoint       | Range          | Tailwind prefix |
| ---------------- | -------------- | --------------- |
| **Mobile**       | 0 – 639 px     | _(default)_     |
| **Small tablet** | 640 – 767 px   | `sm:`           |
| **Tablet**       | 768 – 1023 px  | `md:`           |
| **Desktop**      | 1024 – 1279 px | `lg:`           |
| **Wide**         | 1280 px +      | `xl:`           |

### Mobile (default) — 0–639 px

- Single column, full-width layout.
- No sidebars. No split panels.
- Navigation: hamburger icon top-right; full-screen overlay on open.
- Typography: body `text-base` (16 px), headings `text-2xl` / `text-3xl`.
- Spacing: section padding `py-10 px-4`.
- All CTAs: full-width buttons, stacked vertically.

### Small tablet (sm) — 640–767 px

- Still single column for core flows.
- Trust badges and feature pills may wrap into two columns.
- Card grids: `sm:grid-cols-2` where content permits.
- Navigation: still hamburger overlay.
- Typography: minor scale-up, `sm:text-lg` for subheadings.

### Tablet (md) — 768–1023 px

- Two-column layouts begin: sidebar or secondary panel becomes available.
- Draft workspace: conversation left, preview right (if viewport allows).
- Navigation: horizontal top bar with visible links.
- Typography: heading scale increases, `md:text-4xl` for hero.
- Spacing: section padding `md:py-16 md:px-8`.

### Desktop (lg) — 1024–1279 px

- Full desktop layout: persistent sidebars, split workspace panels.
- Navigation: full horizontal nav, CTA button in header.
- Homepage hero: split or centered large text.
- Typography: `lg:text-5xl` for hero headline.
- Spacing: `lg:py-20 lg:px-12`.

### Wide (xl) — 1280 px+

- Max-width container (`max-w-7xl mx-auto`) to prevent over-stretching.
- No new layout changes beyond `lg:`; just constrain width and center.

---

## 3. Touch Interaction Patterns

### Touch targets

- **Minimum**: 44 × 44 px (WCAG 2.1 SC 2.5.5).
- **Preferred**: 48 × 48 px for primary actions.
- **Spacing**: minimum 8 px between adjacent tappable elements to prevent accidental taps.
- Apply `min-h-[48px] min-w-[48px]` to interactive elements that are visually smaller.

### Tap feedback

Every interactive element must respond immediately and visibly:

```css
/* Tailwind utility pattern */
active:scale-95 transition-transform duration-75
/* or for buttons */
active:bg-primary/80
```

No element should feel "dead" on tap. Latency between tap and visual response must be imperceptible (< 80 ms).

### Swipe

- **Draft workspace**: Swipe horizontally between Conversation view and Preview view.
- Implementation: use a lightweight carousel/tab container with CSS `scroll-snap` or `useSwipeable`.
- Visual indicator: pill tabs at top showing active panel.
- This is a UX enhancement, not a blocking dependency for MVP. Tappable view switching is required;
  swipe support is optional if it does not compromise stability or accessibility.

### Pull to refresh

- **Status / tracking pages**: standard pull-to-refresh gesture triggers a status re-fetch.
- Show a spinner or skeleton during refresh; never show stale data without indication.
- Prefer native browser behavior where available. Do not add a custom pull-to-refresh subsystem for
  MVP if it creates complexity or scroll bugs.

### Long press

- **Address blocks**: long press → copy full address to clipboard.
- **Attachments**: long press → contextual sheet with "Preview", "Remove" options.
- Delay: 500 ms, with a subtle haptic or visual ripple on trigger.
- Treat long-press actions as optional polish, not as a required discoverability path for core tasks.

### Pinch to zoom

- **Letter preview**: allow native pinch-to-zoom within the preview container.
- Do not suppress `user-scalable` on the preview viewport; suppress it only on input-heavy screens if necessary.
- Double-tap zoom is optional; pinch support is enough for MVP.

### Scroll

- Use `-webkit-overflow-scrolling: touch` (or equivalent) for momentum scrolling inside overflow containers.
- Avoid `overflow: hidden` on the `body` except during sheet open — it breaks scroll position restoration.

---

## 4. Navigation on Mobile

### ~~Bottom navigation bar~~ — Superseded

> **Reconciliation note:** Earlier drafts of this document proposed a 3-tab bottom nav bar
> (`[ ✏️ Draft ] [ 👁 Preview ] [ 📦 Status ]`) for the draft workspace. This is **not** the
> canonical mobile workspace pattern. The canonical pattern — defined in `page-specifications.md`
> §6.2 and `component-library.md` `DraftWorkspace` — is:
>
> - **Conversation panel** fills the viewport.
> - **Floating "Preview" pill button** (bottom-center) opens a bottom `<Sheet>` with `<LetterPreview>`.
> - **`<StatusStrip>`** is a compact bar above the input area showing draft state / price estimate.
>
> This pattern keeps maximum screen real estate for the conversation and treats the preview as
> an on-demand overlay rather than a competing tab. Do not implement a bottom tab bar for the
> draft workspace.
>
> If a bottom nav bar is introduced in the future (e.g., for the account dashboard with multiple
> sections), it belongs in that context only and must follow these rules:
>
> - Fixed at bottom, height 56 px + `env(safe-area-inset-bottom)`.
> - Active tab: bold label, colored icon. Inactive: muted gray.
> - Maximum 4 items; no overflow menu.

### Header (marketing pages)

```
[Logo]                    [☰]
```

- Logo anchored left; links to homepage.
- Hamburger right; opens full-screen overlay nav with stacked links + primary CTA button.
- Header stays compact (height 56 px) — no mega menus on mobile.

### Back button

- Always visible during multi-step flows (checkout, confirmation).
- Position: header left, `←` icon + label (e.g., "Back to draft").
- On Android, hardware back button must navigate correctly — verify router push vs replace semantics.

### Step indicator

- Compact horizontal dot row at top of each step screen during flows.
- Example: `● ● ○ ○` (current step filled, future steps empty).
- Keep height to 24 px or less; do not use verbose numbered breadcrumbs on mobile.

### Bottom sheets (sheet / drawer)

Used for secondary content: preview, options menus, attachment pickers, edit forms.

- Open from bottom, 50% initial height, drag handle visible at top.
- Drag up to expand to ~90% height.
- Drag down or tap scrim to dismiss.
- Content inside sheet must scroll independently if taller than sheet height.
- Spring animation on open/close (see §8).
- Always trap focus inside open sheet (accessibility).

---

## 5. Key Mobile Layouts

### 5.1 Homepage (Mobile)

**Hero section**

- Full-viewport height (`min-h-svh`), text centered vertically.
- Headline: `text-3xl font-bold`, 2–3 lines max.
- Subheading: `text-base text-muted-foreground`, 1–2 lines.
- CTA buttons: stacked, primary on top, secondary below, both full-width.
- Background: clean, fast-loading (no autoplay video on mobile).

**Sections below hero**

- Single column, `py-10 px-4` padding.
- Generous vertical breathing room (`gap-6` to `gap-10` between sections).

**Trust strip**

- Horizontal scroll (`overflow-x-auto`, `flex gap-3`, no-scrollbar CSS) for certification badges.
- Or: wrap into 2-column grid if 4 or fewer badges.

**Use-case / feature cards**

- Full-width stacked cards on mobile.
- Each card: icon, short label, 1-line description.

**Sticky "Draft your letter" CTA**

- Floating button (`fixed bottom-6 left-4 right-4`) appears after user scrolls past hero.
- Hidden when the bottom nav bar is visible (app context only).
- Dismiss/hide once user begins drafting.

---

### 5.2 Draft Entry (Mobile)

The initial screen before a session is established.

- Full-screen, single-focus layout.
- Large plain text input at top (`text-lg`, auto-resize, `min-h-[120px]`).
- Placeholder: conversational, intent-first (e.g., "I need to cancel my gym membership…").
- **Quick-start cards**: 2-column grid below input showing common use cases (Cancel contract, Complaint, Rental notice, etc.). Tapping pre-fills intent.
- **Microphone / dictation button**: floating, bottom-right (`fixed bottom-20 right-4`), large (56 × 56 px), prominent accent color, thumb-zone accessible.
- **Keyboard management**: on input focus, the content above scrolls to keep input visible. No content hidden behind keyboard. Use `visualViewport` API or `dvh` units to handle this.
- CTA ("Start drafting"): full-width, below input, disabled until input has content.

---

### 5.3 Draft Workspace (Mobile) — MOST CRITICAL

This is the heart of the product. Every detail matters.

**Default view: Conversation panel (full screen)**

- AI messages and user reply input occupy full screen.
- Input box pins to bottom of visible viewport above keyboard.
- Messages scroll above.
- No letter preview visible by default.
- On mobile, the conversation thread is the only scrollable region. Header, step strip, preview trigger, and composer stay spatially stable.
- The empty-thread state must sit close to the composer, not in the visual middle of a tall blank page.

**The first 30 seconds on mobile:**
The mobile first-impression must be even more carefully choreographed than desktop, because the user has less screen real estate and no visible preview panel.

1. **0–0.3s:** Layout skeleton appears — message bubbles skeleton + input bar. No blank screen.
2. **0.3–1s:** If use-case context present, system message fades in. AI typing indicator starts.
3. **1–2.5s:** AI first message appears. Quick-reply chips stagger in (50ms per chip).
4. **2.5–8s:** User responds (types, taps chip, or uses voice).
5. **8–20s:** Conversation progresses through field collection.
6. **15–25s:** First draft is generated. The Preview toggle:
   - A subtle badge/update signal appears on the Preview toggle.
   - The toggle becomes the obvious secondary action beside "Write".
7. **25–30s:** User taps the Preview toggle → preview replaces the conversation panel on mobile.

**Critical mobile rule:** Preview must NEVER be hidden behind the composer or overlap the input region. On mobile it stays available as a stable top toggle with a badge when the preview changed since the user last viewed it.

**Composer hierarchy rule:**

- Voice should be gently pushed, not forced.
- The initial empty composer may contain a strong dictation starter row, but typing must remain available in the same composer with no separate mode-picking detour.
- After the first interaction, the composer simplifies: textarea, mic, send. Do not keep a large dictation banner competing with active typing.
- Never place the preview trigger inside the composer card. Keep preview as a separate top toggle.

**Preview toggle**

- Render a two-option segmented control directly below the step strip: `Write | Preview`.
- Active state is obvious and high contrast; inactive state remains visible but secondary.
- Badge: Preview shows a dot indicator when the letter changed since the user last viewed the preview.
- Scroll behavior: the toggle stays fixed with the app frame; it is not part of the scrollable thread.

**Preview mode**

- Preview replaces the conversation panel in the main mobile workspace area.
- The same app frame remains visible: header, step indicator, workspace toggle.
- The preview panel itself may scroll independently if the letter is longer than the viewport.

**Zone editing**

1. User taps a field/zone on the preview (recipient address, body paragraph, sender name, etc.).
2. Sheet slides up to full height with an edit form for that field.
3. User edits, taps "Save".
4. Preview refreshes, sheet returns to preview mode (50% height).
5. Tapping outside or dragging down returns to conversation.

**Status strip**

- Compact fixed bar above the bottom nav / bottom floating controls.
- Shows: current step label | price estimate | delivery type badge.
- Height: 36 px, `text-xs`.
- Tap to expand into a summary sheet.

### Session Expiry Warning — Mobile

**Warning state** (configurable threshold, e.g. 1 hour remaining):

- Single-line banner directly below the app header.
- `bg-warning/10 border-b border-warning/20`. Height: ~44 px.
- Text: "⏱ Your session expires in {timeRemaining}. [Save via email →]"
- Dismissible (✕ button, 44×44 px touch target, right-aligned).
- Banner slides in from top (translateY: -100%→0, 200ms, ease-out). Does not push content — uses `position: sticky top-[headerHeight]` with a scroll-padding-top adjustment on the container.

**Critical state** (configurable threshold, e.g. 5 minutes remaining):

- Two-line banner, NOT dismissible. Replaces the warning banner.
- `bg-warning/20 border-b border-warning/40`.
- Line 1: "⚠️ Your session expires soon."
- Line 2: Email input (full-width, `type="email"`, `autocomplete="email"`, `inputmode="email"`) + "Save draft" button (full-width, below input, `bg-warning text-white`).
- Email input must not auto-focus on mount — user may be mid-typing in the conversation.
- On save success: replace banner with "✓ Check your email to resume this draft." (auto-dismisses after 5 s).
- On save failure: inline error below input, "Couldn't save. Try again."

**Keyboard interaction:**

- When the email input in the critical-state banner receives focus, the keyboard appears and conversation content scrolls.
- Use `window.visualViewport` to track keyboard height and adjust scroll position so the banner input remains visible above the keyboard.
- Do not use `position: fixed` for the banner — it causes reflow issues with the virtual keyboard on iOS Safari.

**Keyboard handling**

- Conversation input always visible above software keyboard.
- Use `window.visualViewport` resize events or `dvh`/`svh` CSS units.
- Sheet must not resize unpredictably when keyboard opens.

**Attachment flow**

- Tap attachment icon in conversation or toolbar.
- Bottom sheet opens with three options: 📷 Camera, 🖼 Photo Library, 📄 Files.
- On selection, uploader runs with progress indicator.
- Uploaded attachments shown as thumbnail chips in conversation.

**Signature flow**

- Tap signature zone in preview or "Add signature" in conversation.
- Bottom sheet opens with two tabs: "Type name" (renders in signature font) and "Upload image".
- Confirm saves to draft state.

---

### 5.4 Checkout (Mobile)

- **Single column, scrolling form.** No side-by-side fields on mobile.
- **Order summary card**: at top, default expanded, collapsible chevron. Shows: service type, delivery type, price in CHF.
- **Address fields**: use `autocomplete` attributes; stack all fields vertically.
- **Stripe Payment Element**: renders responsively by default; no custom styling that breaks responsiveness.
- **Legal checkbox**: directly above CTA, always visible (not behind scroll).
- **CTA button**: full-width, sticky at bottom (`sticky bottom-4` or `fixed bottom-[env(safe-area-inset-bottom)]`). Label: "Pay {formattedTotal} and send".
- Disable CTA until form is valid.

### TWINT Payment on Mobile

TWINT is a native Swiss payment method handled via Stripe's PaymentElement:

- User taps TWINT button → Stripe opens TWINT deep link (launches TWINT app if installed)
- If TWINT app not installed: Stripe shows fallback (QR code or app store link)
- User confirms payment in TWINT app → returns to episto checkout page
- Return handling: Stripe webhook confirms payment, frontend polls or receives SSE update
- Success: navigate to confirmation page
- Failure: show error on checkout page, user can retry or choose another method
- Timeout: if user doesn't return within 5 minutes, show "Payment not completed. [Try again]"

Touch target: TWINT button must be at least 48×44px with the official TWINT logo (purple).

---

### 5.5 Confirmation (Mobile)

**Layout:** Full-width, single-column, no sidebars. Vertical scroll.

**Structure (top to bottom):**

1. **Status icon + headline** — `CheckCircle` (success) or `AlertTriangle` (dispatch ambiguous/rejected), 40 px icon. Headline: "Letter dispatched for delivery" or "Dispatch pending confirmation". Honest language per guardrails.
2. **Status card** — `border border-border rounded-card p-4`. Shows: dispatch state label, timestamp, brief explanation. If state is ambiguous, shows "We'll update this page as we receive confirmation." — never implies delivery has occurred when only submission is confirmed.
3. **Reference number** — `font-mono text-2xl`, center-aligned. Tap copies to clipboard with toast feedback ("Copied!"). Label: "Your reference number".
4. **"What's next" timeline** — vertical stepper, 3–4 steps. On mobile: icon + label in a compact left-aligned list. No horizontal layout.
5. **Download PDF receipt** — secondary button, full-width, `mt-4`.
6. **"Send another letter" CTA** — primary button, full-width, `mt-2`. Returns to Draft Entry.

**Animations:**

- Page enters with a calm `opacity: 0→1, translateY: 8px→0` (300ms, ease-out). No confetti. No particle effects. No celebratory motion.
- Status icon animates in with a subtle scale-in (0.8→1.0, 300ms, spring) only if dispatch is successful.
- No animations if dispatch state is ambiguous or rejected — static render only.

**Mobile-specific rules:**

- No "send again to [same address]" prefill shortcut in MVP — too risky to misaddress.
- If the user navigates back from confirmation, do not resume the paid draft for editing — show the confirmation page again or route to `/status/:orderToken`.
- Reference number must be visible without scrolling on screens ≥ 390 px wide.
- "Download PDF receipt" button must not be the primary visual action — keep it secondary, below the timeline.

---

## 6. Keyboard and Input Patterns

| Field type     | `inputmode` | `autocomplete`   |
| -------------- | ----------- | ---------------- |
| Email address  | `email`     | `email`          |
| Phone number   | `tel`       | `tel`            |
| First name     | `text`      | `given-name`     |
| Last name      | `text`      | `family-name`    |
| Street address | `text`      | `street-address` |
| Postal code    | `numeric`   | `postal-code`    |
| City           | `text`      | `address-level2` |
| Country        | `text`      | `country-name`   |

**Dismiss keyboard**

- Tapping outside an active input dismisses the keyboard.
- Provide a visible "Done" or dismiss affordance where `blur()` is not obvious.

**Form scrolling**

- Active input must always remain above the software keyboard.
- Test with both iOS Safari and Android Chrome — their keyboard heights differ.
- Use `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` on focus events.

**Dictation**

- Use same-origin microphone capture with backend-owned Azure AI Speech transcription.
- Show a waveform or animated mic indicator while recording.
- Fall back gracefully: if live dictation cannot complete, keep the voice affordance discoverable and
  use the buffered stop-then-transcribe path when audio was captured.
- After transcription, paste text into the draft input; allow immediate correction.

#### Dictation Error Recovery

Dictation will fail, mis-transcribe, or produce unexpected results. These situations must feel like minor bumps, not dead ends.

**Transcription errors:**

- Transcribed text always goes into the editable input field, NOT directly into the conversation as a sent message.
- The user must explicitly confirm (tap Send or press Enter) before the transcription is submitted.
- If the transcription is obviously wrong, the user can edit it in the input field before sending.
- Below the transcribed text in the input field, show a brief `text-xs text-tertiary` hint: "Tap to edit, then send" — this reminds the user they can fix it.

**Multi-language dictation:**

- The dictation locale sent to the backend must match the active letter locale (de-CH, fr-CH, it-CH, en-CH).
- If the user switches letter language mid-conversation, the next dictation session must use the new locale.
- If the user speaks a different language than the configured locale, transcription quality may degrade. Do NOT try to auto-detect language during dictation. Let the transcript land in the editable input field and let the user correct it if needed.
- **Do not show a language mismatch warning for dictation.** The friction of a warning is worse than the occasional bad transcription.

**Network-dependent speech recognition:**

- Live dictation requires an internet connection because audio is streamed to the backend speech adapter.
- If the user is offline when they tap the mic button: show `<Toast>` "Voice input needs an internet connection. Try typing instead." and do not activate the microphone.
- If recognition fails mid-dictation (network drops): stop the listening UI, keep any partial transcription already shown, and try the buffered fallback when audio was captured. If the fallback also fails, show `<Toast>` "Connection lost — we captured what we could."
- Do NOT leave the mic indicator animating after a failure. Stop the visual feedback within 500ms of the error.

**Microphone permission:**

- If the browser blocks microphone access: show `<Toast>` "Microphone access is needed for voice input. Check your browser settings." Do NOT repeatedly prompt — one toast per session is enough.
- The mic button remains visible even without permission, but tapping it shows the permission toast. Do not hide the button based on permission state — users may change permissions later.

**Long dictation:**

- Capture is bounded by the shared dictation limits; once the current capture cap is reached, stop cleanly, submit what was captured, and show `<Toast>` "Voice input timed out — we captured what you said so far."
- Do NOT auto-restart dictation after a timeout — let the user tap the mic again if they want to continue.

**Browser capability expectations (from `docs/04-product/dictation-and-speech.md`):**
Dictation availability depends on browser microphone capture and same-origin realtime transport support, not on browser-native speech recognition quality tables.

**What the UI should do:**

- Do NOT show a browser compatibility warning preemptively — this creates friction before the user has even tried.
- If dictation is unavailable because the browser cannot provide microphone capture or the live transport primitives: show `<Toast>` "Voice input isn't available in this browser right now. Try typing instead."
- If dictation produces poor results (garbled text): let the text go through to the input field for editing. The AI conversation layer is tolerant of imperfect input.
- **Never block the flow** because of browser limitations. The text input is always available as a fallback.

### Keyboard and Dictation Coexistence

When the soft keyboard is open:

- Dictation mic button remains visible above the keyboard (pinned to input bar)
- Tapping mic: keyboard stays open but becomes inactive while listening
- After dictation: text appears in input, keyboard reactivates for editing
- If dictation produces text while keyboard was showing suggestions: dismiss suggestions, show transcribed text

When dictation is active:

- Input field shows real-time transcript
- Keyboard is suppressed (does not appear)
- After dictation ends: keyboard appears automatically for editing

**Paste**

- All address fields must accept paste.
- Attempt to auto-parse pasted multi-line Swiss addresses into structured fields (street, number, PLZ, city) — surface as a suggestion, never silently overwrite.

---
