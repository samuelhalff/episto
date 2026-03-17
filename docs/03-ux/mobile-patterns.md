# Mobile UX Patterns

> **Swiss Mail** — canonical mobile override reference.
> Phone is the primary device. All other layouts are progressive enhancements.
> This document governs responsive and touch behavior only. Route behavior, state transitions, and
> business logic still come from `user-flows.md`, `page-specifications.md`, and the architecture docs.

---

## 1. Mobile-First Philosophy

The product exists because people need to send formal Swiss letters from their phones — during commutes, waiting rooms, and urgent moments. Desktop is a bonus, not the baseline.

**Core principles:**

- Design every screen for a 390px viewport first. Scale up, never scale down.
- Primary actions live in the bottom third of the screen (thumb zone).
- One-hand operation must work for every step of the core flow: draft → preview → pay → confirm.
- Desktop layouts inherit mobile decisions; mobile layouts never inherit desktop assumptions.
- Performance is a feature. Users on mobile data must feel a snappy, lightweight experience. No gratuitous animations, oversized bundles, or layout shift.

**Competitive framing:**

SuperPost markets "write and send from your mobile phone" but their UX is retrofitted. DocuPost and Pingen are desktop-first, business-oriented products. Swiss Mail's advantage is building mobile-first from day one, so the mobile experience is the designed experience — not a shrunk desktop.

---

## 2. Responsive Breakpoints

All breakpoints use Tailwind's default scale. Mobile is the default — no prefix needed.

| Breakpoint | Range | Tailwind prefix |
|---|---|---|
| **Mobile** | 0 – 639 px | _(default)_ |
| **Small tablet** | 640 – 767 px | `sm:` |
| **Tablet** | 768 – 1023 px | `md:` |
| **Desktop** | 1024 – 1279 px | `lg:` |
| **Wide** | 1280 px + | `xl:` |

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

**The first 30 seconds on mobile:**
The mobile first-impression must be even more carefully choreographed than desktop, because the user has less screen real estate and no visible preview panel.

1. **0–0.3s:** Layout skeleton appears — message bubbles skeleton + input bar. No blank screen.
2. **0.3–1s:** If use-case context present, system message fades in. AI typing indicator starts.
3. **1–2.5s:** AI first message appears. Quick-reply chips stagger in (50ms per chip).
4. **2.5–8s:** User responds (types, taps chip, or uses voice).
5. **8–20s:** Conversation progresses through field collection.
6. **15–25s:** First draft is generated. The floating Preview FAB:
   - Pulses once (scale 1→1.15→1, 300ms, spring easing).
   - Gets a brief `accent` border glow (box-shadow pulse, 300ms in, 500ms hold, 300ms out).
   - A toast notification slides in from top: "Your letter is ready — tap to preview" with `FileText` icon.
7. **25–30s:** User taps FAB or toast → preview sheet opens with the populated letter.

**Critical mobile rule:** The Preview FAB must NEVER be invisible or disabled when a draft exists. If the draft has content, the FAB is always present and tappable. A badge dot on the FAB indicates "preview has changed since you last looked."

**Preview toggle**
- Floating action button (FAB): `"👁 Preview"`, bottom-right corner.
- Position: 16 px from right edge, above safe area (`fixed bottom-[calc(env(safe-area-inset-bottom)+80px)] right-4`).
- Size: 48 px circle with "Preview" label.
- Badge: dot indicator when preview has been updated since last viewed.
- Scroll behavior: FAB stays fixed during conversation scroll.
- During dictation: FAB moves up to avoid overlap with dictation indicator.

**Preview mode: Bottom sheet**
- Initial height: ~50% of viewport.
- Drag up for full-screen preview.
- Drag down to collapse back to conversation.
- Sheet contains a scaled-down PDF-style letter preview.
- Scrollable independently.

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

- Banner appears below the app header, above conversation content
- Warning state (1h remaining): single-line, dismissible, `bg-warning/10`
- Critical state (5min remaining): two-line with inline email input, NOT dismissible
- Email input + "Save" button: stacked full-width within the banner
- Banner does NOT push conversation content off-screen — it overlays with scroll offset adjustment

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
- User confirms payment in TWINT app → returns to Swiss Mail checkout page
- Return handling: Stripe webhook confirms payment, frontend polls or receives SSE update
- Success: navigate to confirmation page
- Failure: show error on checkout page, user can retry or choose another method
- Timeout: if user doesn't return within 5 minutes, show "Payment not completed. [Try again]"

Touch target: TWINT button must be at least 48×44px with the official TWINT logo (purple).

---

### 5.5 Confirmation (Mobile)

- **Status card**: centered, prominent. Shows dispatch state with honest language (see guardrails docs).
- **Reference number**: large `font-mono` display, tap-to-copy with toast feedback ("Copied!").
- **"What's next" timeline**: vertical stepper, 3–4 steps (Payment received → Processing → Dispatch submitted → Delivery estimate).
- **Download receipt**: secondary button, full-width.
- **"Send another letter" CTA**: primary button, full-width, at bottom. Returns user to Draft Entry.
- No decorative animations that could imply things are happening when they are not.

---

## 6. Keyboard and Input Patterns

| Field type | `inputmode` | `autocomplete` |
|---|---|---|
| Email address | `email` | `email` |
| Phone number | `tel` | `tel` |
| First name | `text` | `given-name` |
| Last name | `text` | `family-name` |
| Street address | `text` | `street-address` |
| Postal code | `numeric` | `postal-code` |
| City | `text` | `address-level2` |
| Country | `text` | `country-name` |

**Dismiss keyboard**
- Tapping outside an active input dismisses the keyboard.
- Provide a visible "Done" or dismiss affordance where `blur()` is not obvious.

**Form scrolling**
- Active input must always remain above the software keyboard.
- Test with both iOS Safari and Android Chrome — their keyboard heights differ.
- Use `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` on focus events.

**Dictation**
- Use the Web Speech API (`SpeechRecognition`) for in-browser dictation.
- Show a waveform or animated mic indicator while recording.
- Fall back gracefully: if speech API is not available, keep the voice affordance discoverable with
  a clear unavailable message rather than hiding it silently.
- After transcription, paste text into the draft input; allow immediate correction.

#### Dictation Error Recovery

Dictation will fail, mis-transcribe, or produce unexpected results. These situations must feel like minor bumps, not dead ends.

**Transcription errors:**
- Transcribed text always goes into the editable input field, NOT directly into the conversation as a sent message.
- The user must explicitly confirm (tap Send or press Enter) before the transcription is submitted.
- If the transcription is obviously wrong, the user can edit it in the input field before sending.
- Below the transcribed text in the input field, show a brief `text-xs text-tertiary` hint: "Tap to edit, then send" — this reminds the user they can fix it.

**Multi-language dictation:**
- The Web Speech API's `lang` property must match the active letter locale (de-CH, fr-CH, it-CH, en-CH).
- If the user switches letter language mid-conversation, the dictation language must update.
- If the user speaks a different language than the configured locale, the transcription quality may degrade. This is a known limitation of the Web Speech API — do NOT try to auto-detect language during dictation. Instead, let the (possibly garbled) transcription go through, and the AI conversation will handle the intent.
- **Do not show a language mismatch warning for dictation.** The friction of a warning is worse than the occasional bad transcription.

**Network-dependent speech recognition:**
- The Web Speech API requires an internet connection on most browsers (it sends audio to a cloud service).
- If the user is offline when they tap the mic button: show `<Toast>` "Voice input needs an internet connection. Try typing instead." and do not activate the microphone.
- If recognition fails mid-dictation (network drops): show the partial transcription in the input field (whatever was captured) + `<Toast>` "Connection lost — we captured what we could."
- Do NOT leave the mic indicator animating after a failure. Stop the visual feedback within 500ms of the error.

**Microphone permission:**
- If the browser blocks microphone access: show `<Toast>` "Microphone access is needed for voice input. Check your browser settings." Do NOT repeatedly prompt — one toast per session is enough.
- The mic button remains visible even without permission, but tapping it shows the permission toast. Do not hide the button based on permission state — users may change permissions later.

**Long dictation (>30 seconds):**
- The Web Speech API may time out after extended silence or very long continuous speech (browser-dependent).
- If a timeout occurs: submit what was captured, stop the indicator, and show `<Toast>` "Voice input timed out — we captured what you said so far."
- Do NOT auto-restart dictation after a timeout — let the user tap the mic again if they want to continue.

**Browser-specific dictation quality (from `docs/04-product/dictation-and-speech.md`):**
The Web Speech API's quality varies significantly by browser:
- **Chrome (Android/Desktop):** Full support for de-CH, fr-CH, it-CH, en-CH via Google STT. Best experience.
- **Safari (iOS/macOS):** Partial — may lack Swiss locale variants. Transcription may default to de-DE, fr-FR, it-IT. Results are usable but less accurate for Swiss German dialect words.
- **Firefox:** Limited — experimental, may not work at all on some versions.

**What the UI should do:**
- Do NOT show a browser compatibility warning preemptively — this creates friction before the user has even tried.
- If dictation fails on Safari/Firefox (API throws `not-allowed` or `service-not-allowed`): show `<Toast>` "Voice input isn't available in this browser. Try Chrome for the best experience, or type your message instead."
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

## 7. Performance on Mobile

**Targets**

| Metric | Target |
|---|---|
| Time to Interactive (3G) | < 3 s |
| First Contentful Paint | < 1.5 s |
| Total Blocking Time | < 200 ms |
| JS bundle (first paint) | < 150 KB gzipped |
| Largest Contentful Paint | < 2.5 s |

**Implementation rules**

- Lazy-load all images below the fold (`loading="lazy"`).
- Use `next/image` with correct `sizes` attribute to serve appropriately sized images per breakpoint.
- Skeleton screens for all async content — never blank screens while loading.
- Optimistic UI for form submission: show "Processing…" state immediately; reconcile with server response on settle.
- Avoid blocking `useEffect` chains on initial render; defer non-critical work.
- Minimise third-party scripts; load analytics/chat widgets after first interaction.
- Service worker for offline draft saving is a **future consideration** — do not implement in MVP, do not promise it in UI copy.

---

## 8. Gesture and Animation

**Principles**
- Animations should communicate state, not decorate.
- Every animation must have a `prefers-reduced-motion` fallback (instant transition or no animation).

**Specific patterns**

| Interaction | Animation | Duration |
|---|---|---|
| Bottom sheet open | Spring from bottom, slight bounce | 300 ms |
| Bottom sheet dismiss | Ease-out slide down | 200 ms |
| Sheet drag | Follows finger 1:1, spring-snap on release | — |
| Page forward navigation | Slide left (new page in from right) | 250 ms |
| Page back navigation | Slide right (current page out to right) | 200 ms |
| Pull-to-refresh | Rubber-band stretch, spinner appears at threshold | — |
| Hero parallax | Subtle scroll-linked background shift (desktop/tablet only) | — |
| Tap feedback | `scale(0.97)`, revert | 75 ms |
| Toast / snackbar | Slide up from bottom, auto-dismiss after 3 s | 200 ms |

**`prefers-reduced-motion`**

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Apply this globally. Sheet open/close should still function — just without animation.

---

## 9. Mobile-Specific Edge Cases

**Landscape orientation**
- Allow but do not optimize for.
- Ensure nothing breaks: no overflow, no hidden CTAs.
- Bottom sheet in landscape: cap height at 90% of viewport height.

**Very small screens (< 360 px wide — e.g., iPhone SE 1st gen)**
- Test all flows at 320 px width.
- No horizontal overflow allowed.
- Font sizes must not shrink below 14 px for body text (avoid inaccessible micro-text).
- Stacked CTA buttons must fit without clipping.

**iOS Safari safe areas**
- Use `env(safe-area-inset-bottom)` for fixed bottom elements (bottom nav, sticky CTAs, bottom sheets).
- `padding-bottom: env(safe-area-inset-bottom)` on bottom bar.
- Test on notched iPhone and Dynamic Island models.

### Safe Areas and Device Insets

- Use `env(safe-area-inset-*)` CSS variables for all edge-pinned elements
- Sticky bottom bars (status strip, CTA buttons): add `pb-[env(safe-area-inset-bottom)]`
- Top header: add `pt-[env(safe-area-inset-top)]` on standalone/PWA mode
- Floating action buttons (Preview FAB): position accounts for bottom safe area
- Bottom sheets: drag handle and content respect bottom inset
- Test on: iPhone with notch, iPhone with Dynamic Island, Android with gesture nav bar

**Android hardware back button**
- Use Next.js router `push` (not `replace`) for step-by-step navigation so back goes to previous step.
- Bottom sheets must intercept back button on Android — close the sheet instead of navigating away.

**Copy / paste**
- All reference numbers must be selectable and have a tap-to-copy action.
- All address blocks must be selectable.
- Never use `user-select: none` on content the user might need to copy.

**Deep links / resume tokens**
- Draft resume links (sent via SMS or email) must open directly into the correct draft workspace.
- Link must be usable without an account (guest session via token).
- Handle expired tokens gracefully with a clear message.

**Autofill conflicts**
- Some browsers autofill unexpected fields. Use explicit `autocomplete="off"` only where autofill would cause data errors (e.g., search fields or one-time codes). Do not blanket-disable autofill.

---

## 10. Accessibility on Mobile

**Screen readers: VoiceOver (iOS) and TalkBack (Android)**

Required testing checkpoints:
- All buttons have descriptive accessible labels (not just "Button" or an icon).
- All form fields have associated `<label>` elements (not just placeholder text).
- Bottom sheets announce their opening and receive focus on open.
- Dynamic content updates (AI response streamed, status updated) are announced via `aria-live="polite"` regions.
- Step indicators convey current step to screen readers (`aria-current="step"`).

**Focus management**
- When a bottom sheet opens, focus must move to the first interactive element inside the sheet.
- When a sheet closes, focus must return to the element that triggered it.
- Never allow focus to remain "trapped" outside of a visible interactive area.
- Tab order must be logical: top-to-bottom, left-to-right within each view.

**Color contrast**
- All body text: minimum 4.5:1 contrast ratio against background (WCAG AA).
- Large text / headings: minimum 3:1.
- Interactive element borders and focus rings: minimum 3:1.
- Never rely on color alone to convey status (e.g., add an icon or label alongside color).

**Touch target spacing**
- Minimum 8 px between adjacent tappable elements.
- Navigation items in bottom bar: equal spacing, each target ≥ 48 × 48 px.

**Announcements for async updates**
```html
<div aria-live="polite" aria-atomic="true" class="sr-only">
  <!-- Inject dynamic status text here, e.g., "Draft updated" or "Upload complete" -->
</div>
```
Place one such region near the top of each major view and update its text content when meaningful state changes occur.

**Keyboard / external keyboard support**
- Users may pair a Bluetooth keyboard with their phone.
- All flows must be operable without touch: tab, enter, escape, space must work as expected.
- Escape must close open sheets and overlays.

---

## Appendix: Quick Reference — Thumb Zone

```
┌──────────────────┐
│  ← Hard to reach │  Top zone: secondary info only
│                  │
│  Medium reach    │  Middle: readable content, passive UI
│                  │
│  ✅ Easy reach   │  Bottom third: ALL primary CTAs, inputs,
│  ✅ Easy reach   │  navigation, microphone, floating buttons
└──────────────────┘
```

Everything a user must tap to complete a task must live in the easy-reach zone. Secondary or destructive actions (cancel, go back, see legal text) may live higher.

---

_Last updated: 2026-03-15. See `docs/03-ux/user-flows.md` for flow-level decisions and `docs/05-architecture/frontend-architecture.md` for component structure rules._

---

## Appendix: Mobile Implementation Danger Zones

### MDZ-1: Do not treat the preview sheet as a separate page

The preview bottom sheet is part of the draft workspace, not a separate route. Do not use `router.push` to open it. Use component state (`isPreviewOpen: boolean`). The sheet shares the same React context as the conversation panel — zone edits in the sheet must update the conversation state and vice versa.

### MDZ-2: Do not forget safe area insets

Every fixed-position element at the bottom of the screen (input bar, sticky CTA, FAB, status strip, bottom sheet) must account for `env(safe-area-inset-bottom)`. On iPhone models with the home indicator, this adds ~34px. Without it, interactive elements are partially hidden behind the home indicator.

### MDZ-3: Do not use 100vh on mobile

`100vh` is wrong on mobile Safari — it includes the address bar height, causing content to be hidden behind it. Use `100dvh` (dynamic viewport height) or `100svh` (small viewport height) instead. The conversation panel height must use `dvh` units to properly account for the software keyboard.

### MDZ-4: Do not build desktop-first responsive

This entire document assumes mobile-first. All base styles target 375–430px viewport. Breakpoints EXPAND the layout — they never compress it. An LLM that starts with the desktop layout and adds `@media (max-width)` queries will produce a fundamentally worse mobile experience.

### MDZ-5: Do not auto-play animations on low-end devices

Use `navigator.hardwareConcurrency` or a similar heuristic to detect low-end devices. On devices with ≤4 cores, reduce animation complexity: skip confetti on confirmation, reduce stagger animations to instant, and use `will-change: auto` instead of `will-change: transform`.

### MDZ-6: Do not use pinch-to-zoom on the letter preview

The letter preview in the bottom sheet should be scrollable and pageable, but NOT pinch-to-zoomable. Pinch-to-zoom on an A4 preview within a sheet creates a confusing nested-scroll situation. Instead, provide a "Full screen" button that opens the preview in a full-viewport overlay where pinch-to-zoom IS enabled.
