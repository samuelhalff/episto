# Episto Micro-Interactions & Animation Specification

> **Status:** Canonical — implement from this document.  
> **Scope:** MVP. Light mode. Mobile-first.  
> **Stack:** Next.js · TypeScript · Tailwind CSS · Framer Motion · CSS animations  
> **Companion doc:** `docs/02-brand/design-system.md` §8 — Motion & Animation (duration tokens and easing are defined there; this document extends them with component-level behavior)  
> **Last updated:** 2026-03
> This document governs motion and interaction feedback only. It does not redefine route flow,
> product truth, or backend state semantics.

---

## Table of Contents

1. [Animation Principles](#1-animation-principles)
2. [Timing and Easing Reference](#2-timing-and-easing-reference)
3. [Page Transitions](#3-page-transitions)
4. [Component-Level Animations](#4-component-level-animations)
   - 4.1 [Buttons](#41-buttons)
   - 4.2 [Letter Preview](#42-letter-preview)
   - 4.3 [Conversation Panel](#43-conversation-panel)
   - 4.4 [Step Indicator](#44-step-indicator)
   - 4.5 [Toast Notifications](#45-toast-notifications)
   - 4.6 [Attachments](#46-attachments)
   - 4.7 [Form Validation](#47-form-validation)
   - 4.8 [Pricing](#48-pricing)
   - 4.9 [Skeleton Screens](#49-skeleton-screens)
   - 4.10 [Modals and Sheets](#410-modals-and-sheets)
   - 4.11 [Dropdowns and Popovers](#411-dropdowns-and-popovers)
   - 4.12 [Toggle and Checkbox](#412-toggle-and-checkbox)
   - 4.13 [Dictation](#413-dictation)
5. [Scroll-Linked Animations (Marketing Pages)](#5-scroll-linked-animations-marketing-pages)
6. [Loading States](#6-loading-states)
7. [Empty States](#7-empty-states)
8. [Error States](#8-error-states)
9. [Celebration and Delight Moments](#9-celebration-and-delight-moments)
10. [CSS and Framer Motion Implementation](#10-css-and-framer-motion-implementation)
11. [Tailwind Config Extension](#11-tailwind-config-extension)
12. [Accessibility: Reduced Motion](#12-accessibility-reduced-motion)
13. [What Does Not Animate](#13-what-does-not-animate)

---

## 1. Animation Principles

Animation in Episto is **an instrument of clarity, not decoration**. The product is used in high-stakes moments — a tenant sending a formal notice, a professional dispatching a contract. Motion must reinforce confidence, not add noise.

### Five Governing Principles

| Principle           | What It Means                                                                                                                                                                         | Red Flag                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Purposeful**      | Every animation communicates exactly one thing: a state change, a spatial relationship, or an action outcome. If you cannot name what the animation is communicating, remove it.      | Animation that "looks nice" with no functional role                       |
| **Quick**           | Most animations complete in under 300ms. The user is never waiting for an animation to finish before interacting.                                                                     | Anything that blocks the next interaction                                 |
| **Consistent**      | The same category of change uses the same motion pattern everywhere. Appearing things always enter the same way. Dismissal always exits the same way.                                 | Two components with similar roles behaving differently                    |
| **Respectful**      | `prefers-reduced-motion: reduce` cuts all durations to near-zero. Animations enhance the experience — they never gate it. The product is fully functional with motion off.            | Content that is invisible until an animation reveals it                   |
| **Swiss precision** | Clean, geometric, restrained. Think Stripe checkout, not a gamified onboarding flow. No bouncing elements, no elastic overshoots on navigation, no particle effects in the main flow. | Spring physics on anything other than direct touch/press feedback         |
| **Responsive**      | Interaction feedback must start immediately. Motion confirms responsiveness; it must never mask slow code or late state updates.                                                      | Spinner appears late, tap feels ignored, transition hides computation lag |

### Tone

The one sentence that governs all motion decisions: _"This is a professional tool. Move with purpose."_

Responsiveness target for core flows: interaction feedback should be effectively immediate to the
user, and implementation should support an INP under 200 ms on representative devices and browsers.

---

## 2. Timing and Easing Reference

These tokens are defined in `docs/02-brand/design-system.md` and the Tailwind config. Use them by name; never hardcode raw values inline.

### Duration Tiers

| Tier           | Duration  | Tailwind token        | When to use                                             |
| -------------- | --------- | --------------------- | ------------------------------------------------------- |
| **Fast**       | 150ms     | `duration-fast`       | Button press, hover color, toggle, tooltip appear       |
| **Normal**     | 200ms     | `duration-normal`     | Dropdown open/close, toast enter/exit, skeleton→content |
| **Slow**       | 300ms     | `duration-slow`       | Modal enter, sheet slide, page fade, card hover         |
| **Deliberate** | 500ms     | `duration-deliberate` | Progress step advance, letter preview re-render signal  |
| **Extended**   | 600–800ms | (inline only)         | Letter-sent celebration, hero entrance stagger          |

### Easing Curves

| Name       | Curve                               | Tailwind token | Rule                                                              |
| ---------- | ----------------------------------- | -------------- | ----------------------------------------------------------------- |
| **Enter**  | `cubic-bezier(0, 0, 0.2, 1)`        | `ease-enter`   | All elements entering the screen                                  |
| **Exit**   | `cubic-bezier(0.4, 0, 1, 1)`        | `ease-exit`    | All elements leaving the screen                                   |
| **In-out** | `cubic-bezier(0.4, 0, 0.2, 1)`      | `ease-inout`   | Position changes within the screen                                |
| **Spring** | `cubic-bezier(0.34, 1.56, 0.64, 1)` | `ease-spring`  | Direct touch/press feedback only (button press, checkbox, toggle) |
| **Linear** | `linear`                            | n/a            | Spinner rotation, skeleton shimmer (time-based loops)             |

**Rule:** Enter curve for anything appearing. Exit curve for anything disappearing. Spring only for direct physical feedback. Never spring on navigation, layout, or autonomous transitions.

---

## 3. Page Transitions

### Marketing Pages

All marketing page content enters with a coordinated fade + slide:

```
opacity: 0 → 1
translateY: 20px → 0
duration: slow (300ms)
easing: ease-enter
```

Children within a section stagger at **50ms intervals** per element. The first element starts immediately on mount; subsequent elements are delayed by `index × 50ms`. Maximum stagger depth: 6 elements (after 6, remaining elements share the last delay slot — no 500ms waits).

> **Stagger disambiguation:** This 50ms stagger applies to marketing page _entry transitions_ (when the user navigates to a marketing page). It is distinct from the **75ms** scroll-reveal stagger in §5 ("Stagger Within Sections"), which governs elements entering the viewport as the user scrolls. Use 50ms for page-load transitions, 75ms for scroll-reveal stagger — never mix the two.

### App Navigation — Forward

A forward step in the letter workflow (e.g., Conversation → Preview → Checkout):

```
Incoming page:  translateX: 40px → 0,  opacity: 0 → 1,  duration: slow (300ms),  ease-enter
Outgoing page:  translateX: 0 → -40px, opacity: 1 → 0,  duration: slow (300ms),  ease-exit
Both play simultaneously.
```

Use `40px` (not `100%`) — full-screen slides feel heavy on mobile. A partial offset communicates directionality without the visual weight.

### App Navigation — Back

Reverse of forward:

```
Incoming page:  translateX: -40px → 0
Outgoing page:  translateX: 0 → 40px
```

The back chevron or swipe gesture triggers this. The spatial direction mirrors the conceptual direction (stepping back in a process).

### Implementation note

Use Framer Motion `AnimatePresence` with `mode="wait"` at the route boundary. Wrap each page component in a `motion.div` with `initial`, `animate`, and `exit` variants. Keep the variant object in a shared `pageTransition.ts` file — do not inline per-page.

```ts
// shared/pageTransition.ts
export const pageVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0, 0, 0.2, 1] } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } },
};
export const pageVariantsBack = {
  initial: { opacity: 0, x: -40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0, 0, 0.2, 1] } },
  exit: { opacity: 0, x: 40, transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } },
};
```

### Modal and Dialog Open

```
Backdrop:  opacity: 0 → 0.5,          duration: normal (200ms), ease-enter
Panel:     opacity: 0 → 1,            duration: slow (300ms),   ease-enter
           translateY: 8px → 0
           scale: 0.97 → 1
```

### Modal and Dialog Close

```
Panel:     opacity: 1 → 0,            duration: normal (200ms), ease-exit
           scale: 1 → 0.97
Backdrop:  opacity: 0.5 → 0,          duration: normal (200ms), ease-exit
```

Close is deliberately 100ms faster than open. Opening warrants attention; closing should get out of the way.

### Bottom Sheet (Mobile)

```
Open:   translateY: 100% → 0,   duration: slow (300ms),   ease-enter
Close:  translateY: 0 → 100%,   duration: normal (200ms), ease-exit
```

Support drag-to-dismiss with spring physics during the drag gesture only. On release, if velocity threshold or position threshold is met, animate to closed; otherwise snap back.

---

## 4. Component-Level Animations

### 4.1 Buttons

Buttons have three animation layers: hover, press, and async state.

#### Hover

```css
transition:
  background-color 150ms ease-out,
  box-shadow 150ms ease-out;
```

No `transform` on hover. The hover state communicates availability, not invitation — keep it subtle. Shadow increases from `shadow-sm` to `shadow-md` on primary buttons only.

#### Press (active)

```css
transform: scale(0.98);
transition: transform 100ms cubic-bezier(0.34, 1.56, 0.64, 1); /* spring */
```

The 2% scale reduction gives physical confirmation of the press. Spring easing makes the release feel slightly snappy. Duration is 100ms — the fastest tier, because this is direct touch feedback.

#### Loading state

When a button triggers an async action:

1. Disable pointer events immediately (prevent double-submit).
2. Crossfade: button label fades out (`opacity: 1 → 0`, 150ms) while spinner fades in (`opacity: 0 → 1`, 150ms). Both play simultaneously.
3. Button width is locked (`min-w` set to current width before transition) — the button must not resize.
4. No scale change during loading.

```tsx
// Pattern — LoadingButton
<button style={{ minWidth: buttonRef.current?.offsetWidth }}>
  <AnimatePresence mode="wait">
    {isLoading ? (
      <motion.span
        key="spinner"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <Spinner />
      </motion.span>
    ) : (
      <motion.span
        key="label"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        {children}
      </motion.span>
    )}
  </AnimatePresence>
</button>
```

#### Success state (primary CTA only)

After a successful primary action (e.g., "Send Letter" completing):

1. Spinner crossfades to a checkmark icon (150ms crossfade).
2. Button background transitions to `success` green (200ms, ease-out).
3. Hold for 800ms.
4. Then navigate away or revert state — the success flash is confirmation, not a destination.

This applies **only** to the single primary CTA at the end of the checkout flow. Do not apply to every button that succeeds.

---

### 4.2 Letter Preview

The letter preview is the signature interaction of the product. It must feel like a physical document that the user is composing in real time.

#### Initial Load

```
opacity: 0 → 1,              duration: deliberate (500ms), ease-enter
translateY: 24px → 0,        duration: deliberate (500ms), ease-enter
box-shadow: 0 0 0 0 → paper card shadow,  duration: deliberate (500ms), ease-enter
```

The shadow growing as the card rises reinforces the paper-lifting-off metaphor. The translateY is 24px (not 100% or viewport-relative) — we are not slamming a sheet down, we are revealing something that was already there.

#### Content Update (AI fills a field)

When the AI extracts a value and populates a zone in the letter:

1. The affected zone pulses with a very subtle `accent-light` background tint (`#FBF0EB`). Duration: 200ms in, 400ms hold, 200ms out (total 800ms).
2. Text within the zone crossfades: old value fades out (100ms), new value fades in (150ms).
3. No layout shift — the zone's dimensions are reserved.

Do not animate text that the user is actively typing. Only animate content that the system filled autonomously.

#### Revision Highlight

When the AI revises content after a user request (e.g., "make it more formal"), the changed sections need a stronger visual signal than a routine field update:

1. Changed zone(s) receive a `primary-light` background highlight: fade-in 300ms, hold 1s, fade-out 300ms.
2. If multiple zones changed, they highlight simultaneously (not staggered) — the user should be able to scan all changes at once.
3. A thin `primary` left-border (2px) appears on changed zones during the highlight period, providing a secondary visual anchor.
4. Unchanged zones remain visually stable — no animation, no opacity change.

This is distinct from the Content Update animation (which uses `accent-light` for routine field extraction). The `primary-light` color and longer duration signal "you asked for this change, here's what changed."

`prefers-reduced-motion`: Skip background fade. Show a static `primary-light` background for 2s, then remove.

#### Auto-Save Indicator

The auto-save status indicator lives in the workspace header, right-aligned. Its animation must be imperceptible during normal operation — the user should barely notice saves happening.

| State        | Icon                 | Text        | Color           | Animation                                                      |
| ------------ | -------------------- | ----------- | --------------- | -------------------------------------------------------------- |
| Idle (saved) | `Check` (12px)       | "Saved"     | `text-tertiary` | Fade-in 200ms, appears 1s after last change                    |
| Saving       | `Loader2` (12px)     | "Saving…"   | `text-tertiary` | Crossfade from previous state (150ms). Spinner: `animate-spin` |
| Save failed  | `AlertCircle` (12px) | "Not saved" | `text-warning`  | Crossfade 150ms. Persists until resolved                       |
| Offline      | `WifiOff` (12px)     | "Offline"   | `text-warning`  | Crossfade 150ms. Persists until reconnected                    |

**Transitions:** The indicator must never shift layout (reserve fixed width). State changes crossfade — the icon and text simultaneously transition with `opacity: 1→0→1` (total 150ms). No slide, no scale.

**Rule:** The save indicator is a background confidence signal, not a notification. It must never draw attention during normal "saving → saved" cycles. Only the failure states (`Not saved`, `Offline`) should be visually prominent enough to notice.

#### Zone Hover (Desktop)

When a user hovers over an editable zone in the preview:

```css
background-color: transition to surface-subtle (#F8FAFC), 150ms ease-out
border: 1px dashed border (#E2E8F0) appears, 150ms ease-out
cursor: pointer
```

The dashed border signals "this area is editable" without adding permanent UI chrome.

#### Zone Edit Mode

When a zone is activated for editing:

```
Zone:         slight scale up (1 → 1.005), 150ms ease-enter — barely perceptible, just enough to feel "lifted"
Edit panel:   slides in from right (translateX: 24px → 0) + opacity 0 → 1, 200ms ease-enter
              OR bottom sheet on mobile
```

On exit from edit mode: reverse, 150ms.

#### Preview Scale / Zoom

```css
transform: scale(n);
transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1); /* ease-inout */
```

Scale transitions use ease-in-out because this is a position change, not an enter/exit event.

### Multi-Page Preview Transitions

Mobile preview sheet page navigation:

- **Page forward (→):** Current page slides left + fades out (200ms), new page slides in from right + fades in (200ms). Easing: ease-out.
- **Page backward (←):** Reverse direction (slide right).
- **Page indicator:** "Page X of Y" updates with a brief scale pulse (1.0 → 1.05 → 1.0, 150ms).
- **Page break line (desktop):** Dashed border with "Page N" label, fades in when that section scrolls into view (300ms).

**Page count change (1→2, 2→3, etc.):**
When the letter grows to a new page (body text exceeds one page):

- The "Page 1 of N" indicator updates with the scale pulse above.
- The page count number animates: old number fades out (opacity 1→0, translateY 0→-4px, 100ms) and new number fades in (opacity 0→1, translateY 4px→0, 150ms) — a vertical slide-crossfade.
- If approaching the 5-page limit (page 4→5): the indicator briefly flashes `text-warning` for 500ms, then returns to normal. This is a pre-warning before the hard limit warning appears.

`prefers-reduced-motion`: Instant update, no slide or flash.

`prefers-reduced-motion`: Instant page swap, no slide animation.

#### First Draft Reveal Choreography

This is the emotional climax of the drafting experience — the moment when the user's request transforms into a real, formatted letter. It must feel like a moment of delight: the letter "materialises" rather than just "appearing."

**Desktop choreography:**

| Step | Delay   | Element              | Animation                                           | Duration | Easing     |
| ---- | ------- | -------------------- | --------------------------------------------------- | -------- | ---------- |
| 1    | 0ms     | Sender block         | `opacity: 0→1, translateY: 8px→0`                   | 200ms    | ease-enter |
| 2    | 100ms   | Recipient block      | `opacity: 0→1, translateY: 8px→0`                   | 200ms    | ease-enter |
| 3    | 200ms   | Date line            | `opacity: 0→1, translateY: 8px→0`                   | 200ms    | ease-enter |
| 4    | 300ms   | Subject line         | `opacity: 0→1, translateY: 8px→0`                   | 200ms    | ease-enter |
| 5    | 400ms   | Body paragraphs      | `opacity: 0→1` (no translateY — body is the anchor) | 300ms    | ease-enter |
| 6    | 600ms   | Closing + signature  | `opacity: 0→1, translateY: 4px→0`                   | 200ms    | ease-enter |
| 7    | 0–800ms | Paper card elevation | `box-shadow: shadow-sm → shadow-paper`              | 800ms    | ease-inout |

Total reveal duration: ~800ms. The shadow elevation animates across the full duration, giving the sense of the page "becoming real" as content populates it.

**Mobile choreography:**

The reveal happens while the preview sheet is closed. When the user opens the preview:

1. Content is already fully populated (no stagger — the user expects to see their letter immediately).
2. Instead of a stagger, a single brief `shadow-paper` scale pulse (scale `1→1.01→1`, 300ms, spring easing) signals "this is new."

**Accompanying UI cues:**

When the first draft is ready:

1. **Desktop:** System message in conversation panel: `"Your letter is ready to review"` (centered, `text-tertiary text-xs`). A subtle scroll-into-view ensures the preview panel shows the top of the letter.
2. **Mobile:** The floating Preview FAB pulses once (scale `1→1.15→1`, 300ms, spring easing) with a brief `accent` border glow (`box-shadow: 0 0 0 3px accent-light`, 300ms in, 500ms hold, 300ms out). A toast notification slides in: "Your letter is ready — tap to preview" with a `FileText` icon.

**`prefers-reduced-motion`:** Skip stagger and elevation animation. Content appears instantly. FAB pulse is replaced by a static badge dot.

**Anti-hallucination rule:** The first draft reveal is purely a visual animation sequence. It must not affect the underlying draft state or trigger any backend calls. The content rendered is the exact output of the AI draft generation — no client-side reformatting, no content injection.

---

### 4.3 Conversation Panel

The conversation panel is the AI interaction surface. It should feel responsive and live without being distracting.

#### AI Message Appear

1. Typing indicator appears first: three dots (`•••`) fading in and pulsing in sequence (see §10 for keyframe).
2. When the AI response is ready, typing indicator fades out (100ms).
3. Message card enters: `opacity: 0 → 1` + `translateY: 12px → 0`, 200ms, ease-enter.

The 12px slide communicates arrival from below — messages build up from the bottom.

#### User Message

```
translateX: 16px → 0
opacity: 0 → 1
duration: fast (150ms)
ease-enter
```

User messages arrive from the trailing edge (right on LTR). This mirrors standard chat conventions and provides spatial contrast with AI messages.

#### Quick-Reply Chips

When a set of quick-reply options appears after an AI message, chips stagger in:

```
Each chip: opacity 0 → 1, translateX -8px → 0, duration: normal (200ms), ease-enter
Stagger:   50ms delay per chip
Direction: left-to-right (chips animate from slight left offset, moving right into position)
```

#### Field Extraction Card

When the AI detects structured data and presents an extraction card (e.g., "I found this address — is this correct?"):

```
Card expands below the message:
height: 0 → auto (use Framer Motion layout animation)
opacity: 0 → 1
duration: 250ms, ease-enter
```

Use Framer Motion `layout` prop on the surrounding container to allow smooth height animation without requiring measured heights.

#### Intent Recognition Confirmation

When the AI first recognizes the user's letter type (e.g., "Got it — a cancellation letter for your gym membership"), this is a key trust-building moment. The AI message that confirms intent deserves slightly elevated treatment:

```
AI message with intent confirmation:
1. Standard message appear animation (opacity 0→1, translateY 8→0, 200ms)
2. After message appears: a brief, subtle "sparkle" on the use-case keyword
   — the word "cancellation" (or "complaint", "notice", etc.) gets a brief
   primary-light background highlight (0→primary-light, 150ms in, 400ms hold, 200ms out)
3. The FieldExtractionCard begins expanding below this message (250ms, as above)
```

This highlight serves two purposes: it confirms "the AI heard you" and it draws the user's eye to the keyword to verify accuracy. If the AI misunderstood, the highlighted word makes the mistake immediately visible.

`prefers-reduced-motion`: Skip the sparkle. The message still appears normally.

#### Address Validation Success

When the AI confirms a complete, valid Swiss address, the address block in the FieldExtractionCard gets a brief positive reinforcement:

```
Address field row:
1. Value text transitions from text-tertiary (placeholder) to text-primary (filled): 150ms crossfade
2. Check icon appears to the right: scale 0→1, 200ms, ease-spring
3. Field row background: brief success-light flash (0→success-light, 100ms in, 300ms hold, 200ms out)
```

This is subtle — a fleeting green background pulse that says "this looks right" without requiring the user to process an explicit "validated!" message.

`prefers-reduced-motion`: Check icon appears instantly (no scale animation). No background flash.

---

### 4.4 Step Indicator

The step indicator shows progress through the letter workflow (Draft → Review → Pay → Confirm).

#### Step Complete

When the current step is marked complete:

1. Active dot scales up slightly (scale 1 → 1.2), then scales down to 1 while simultaneously switching to the `success` fill color. Duration: 300ms, ease-spring.
2. Checkmark icon fades in inside the dot over 150ms.
3. The next step dot receives a subtle pulse (scale 1 → 1.1 → 1, 400ms, ease-inout) to draw attention forward.

#### Progress Line Fill

```css
width: 0% → 100%;
transition: width 500ms cubic-bezier(0.4, 0, 0.2, 1); /* ease-inout, deliberate */
background-color: primary (#1e3a5f);
```

The line fill is the most deliberate animation in the indicator — it communicates meaningful progress, so it earns the longer duration.

---

### 4.5 Toast Notifications

Toasts appear at top-right on desktop, top-center on mobile (below the safe area).

#### Enter

```
translateY: -16px → 0
opacity: 0 → 1
duration: normal (200ms)
ease-enter
```

A downward entry (from above the visible area) is natural for top-anchored notifications and does not conflict with bottom-sheet interactions on mobile.

#### Auto-Dismiss

- A thin progress bar along the bottom of the toast shrinks from 100% to 0% over the display duration (typically 4–6 seconds).
- When the bar reaches 0%, the toast exits.

```
Exit: translateY: 0 → -12px, opacity: 1 → 0, duration: normal (200ms), ease-exit
```

#### Manual Dismiss (X button or swipe)

- **X button:** Triggers the same exit animation as auto-dismiss.
- **Swipe (mobile):** During drag, `translateX` follows the touch position with no easing. On release:
  - If swipe distance exceeds 60px or velocity exceeds threshold: animate out (translateX: current → 120%, 150ms, ease-exit).
  - If below threshold: snap back (translateX: current → 0, 200ms, ease-spring).

#### Multiple Toasts

New toasts push existing ones down (or up, depending on stack direction) using Framer Motion `layout` animation. Gap between toasts: 8px.

---

### 4.6 Attachments

#### Upload Start

File card appears with `opacity: 0 → 1`, `translateY: 8px → 0`, 200ms, ease-enter. Progress bar is visible at 0% immediately.

#### Upload Progress

The progress bar fills smoothly, tied directly to `XMLHttpRequest.upload.onprogress` or the equivalent. Use CSS transition for smoothness, not stepped updates:

```css
.progress-bar {
  transition: width 100ms linear;
}
```

#### Upload Complete

```
Progress bar: opacity 1 → 0, 150ms, ease-exit
Checkmark icon: scale 0 → 1 + opacity 0 → 1, 200ms, ease-spring
```

The checkmark uses spring easing — this is the one moment in the upload flow where a small physical pop is appropriate and delightful.

#### Upload Error

```
File card border: transitions to error (#DC2626), 150ms
Error icon replaces progress bar (crossfade 150ms)
Card: shake animation (see §4.7), triggered once
```

#### Remove File

```
Card: scale 1 → 0.95, opacity 1 → 0, height → 0, duration: normal (200ms), ease-exit
```

The height collapse uses Framer Motion `layout` on the containing list to reflowing siblings smoothly.

---

### 4.7 Form Validation

#### Error Appear

Two simultaneous animations:

1. **Input shake:** `translateX: 0 → -4px → 4px → -4px → 4px → -2px → 2px → 0` (7 keyframes, 300ms, ease-in-out). This is the physical signal that something is wrong.
2. **Error text:** `opacity: 0 → 1`, instant (no duration). Error messages appear without animation — the shake is the signal, the text is information.

The shake must complete before the user can re-submit. Disable the submit button for 300ms after a validation shake.

```css
@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  15% {
    transform: translateX(-4px);
  }
  30% {
    transform: translateX(4px);
  }
  45% {
    transform: translateX(-4px);
  }
  60% {
    transform: translateX(4px);
  }
  75% {
    transform: translateX(-2px);
  }
  90% {
    transform: translateX(2px);
  }
}
```

#### Error Clear

```
Error text: opacity 1 → 0, duration: fast (150ms), ease-exit
Input border: returns to default border color, 150ms ease-out
```

No animation on the input itself when the error clears. The error was a signal; its disappearance is a silent acknowledgement.

#### Success Validation (inline)

For fields with synchronous validation (e.g., postcode format):

```
Input border: transitions to success-border (#BBF7D0) instantly when valid
No animation — instant, silent confirmation
```

No success icon, no checkmark animation, no green flash. Success is the default expected state. Confirmation is quiet.

---

### 4.8 Pricing

#### Price Morph

When the price changes (e.g., user selects registered vs. standard mail):

```
Old price: opacity 1 → 0, translateY 0 → -8px, duration: fast (150ms), ease-exit
New price: opacity 0 → 1, translateY 8px → 0,  duration: normal (200ms), ease-enter
```

Implement as a Framer Motion `AnimatePresence` keyed on the price value string. This communicates that a genuine recalculation happened, not just a display update.

For the checkout pricing summary, use this crossfade — not a numeric counter. Transactional amounts must update cleanly without ambiguity about what the user is being charged. The workspace running total uses a counting animation instead (see [Price Update Animation](#price-update-animation) below).

#### Delivery Type Switch

When switching between delivery options (standard, registered, etc.):

```
Price section: opacity 1 → 0 → 1 (crossfade), duration: fast (150ms), ease-exit + ease-enter
```

The entire pricing summary area crossfades as a unit — not piece-by-piece — to avoid visual noise during the recalculation.

#### Breakdown Expand

The pricing breakdown (itemized cost breakdown) expands on demand:

```
height: 0 → auto (Framer Motion layout)
opacity: 0 → 1
duration: 250ms, ease-enter
```

The expand is triggered by a "Details" button or chevron. Use `overflow: hidden` on the container during the animation.

#### Price Update Animation

When the running total changes (page added, attachment uploaded, delivery type changed):

- **Number transition:** Old value morphs to new value using a counting animation (200ms, ease-out). Example: "CHF 2.90" → counts up to → "CHF 3.30"
- **Direction indicator:** If price increased, brief green flash on the delta. If decreased (rare — e.g., removing attachment), brief amber flash.
- **Price summary card:** The total line briefly pulses with `bg-primary/5` (150ms) to draw attention.
- **Status strip (workspace):** Price badge scales from 1.0 → 1.05 → 1.0 (200ms spring easing) on update.
- **First appearance:** Price fades in from 0 opacity when first calculated (not present until draft has content).

This counting animation applies to the workspace running total and status strip only. Checkout pricing uses the crossfade pattern described in [Price Morph](#price-morph) above.

`prefers-reduced-motion`: No counting animation, instant value swap. No flash or pulse.

---

### 4.9 Skeleton Screens

Skeletons are shown immediately on load — no blank pages, no loading spinners as the primary page state.

#### Shimmer Animation

```css
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-surface-subtle) 25%,
    var(--color-border) 50%,
    var(--color-surface-subtle) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
```

Left-to-right sweep. Duration: 1.5s. The shimmer communicates that work is happening, not that the UI is frozen.

#### Content Replace

When real content is ready:

```
Skeleton: opacity 1 → 0, duration: normal (200ms), ease-exit
Content:  opacity 0 → 1, duration: normal (200ms), ease-enter
Both play simultaneously (crossfade).
```

Position the skeleton and content identically so the crossfade is seamless. No layout shift.

#### Shape Matching Rules

- Skeleton block dimensions must match the expected content dimensions exactly.
- Text line skeletons: match `line-height` and approximate width.
- Avatar/icon skeletons: match size and border-radius.
- Card skeletons: match full card height including padding.
- Never show a skeleton taller than the real content — the collapse on load is a layout shift.

---

### 4.10 Modals and Sheets

See §3 (Page Transitions) for enter/exit values. Additional rules:

- **Focus trap:** Focus moves to the first focusable element in the modal immediately after the enter animation starts (not completes). Do not wait for animation to finish.
- **Scroll lock:** `overflow: hidden` on `<body>` during open state. Restore on close.
- **Overlay click:** Triggers the close animation, not an instant removal.
- **Keyboard Escape:** Same as overlay click.

---

### 4.11 Dropdowns and Popovers

```
Open:
  opacity: 0 → 1
  scale: 0.97 → 1
  translateY: -4px → 0 (for top-anchored) or 4px → 0 (for bottom-anchored)
  duration: normal (200ms), ease-enter

Close:
  opacity: 1 → 0
  scale: 1 → 0.97
  duration: fast (150ms), ease-exit
```

Close is faster than open. Dismissal should feel effortless.

**Origin point:** `transform-origin` should align with the trigger element edge (e.g., `top-right` if the dropdown is right-aligned below the trigger). This makes the scale feel anchored to where it came from.

---

### 4.12 Toggle and Checkbox

#### Toggle Switch

```css
/* Handle translation */
transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1); /* spring */

/* Track color */
transition: background-color 200ms ease-out;
```

The spring on the handle gives it physical weight. The track color follows slightly — do not transition both at the same duration; the handle arrives slightly before the track fully settles, which feels correct.

#### Checkbox

```
Unchecked → checked:
  Checkmark SVG draws in (stroke-dashoffset animation), 150ms, ease-enter
  Background fills (background-color transition), 150ms, ease-out

Checked → unchecked:
  Checkmark fades out (opacity 1 → 0), 100ms, ease-exit
  Background clears (background-color transition), 150ms, ease-out
```

```css
.checkbox-check {
  stroke-dasharray: 20;
  stroke-dashoffset: 20;
  transition: stroke-dashoffset 150ms cubic-bezier(0, 0, 0.2, 1);
}
.checkbox-check.checked {
  stroke-dashoffset: 0;
}
```

### 4.13 Dictation

#### Recording Pulse Ring

When voice dictation is active, the microphone button emits a pulsing ring:

- **Pulse ring:** `box-shadow: 0 0 0 0px` → `0 0 0 12px var(--accent)` at 0% opacity, 1.5s cycle.
- **Audio level visualization:** Ring pulse intensity scales with voice volume (0.5×–1.5× amplitude). Louder speech produces larger, more visible rings.
- **Stop animation:** Rings contract inward (200ms) then disappear.

```css
@keyframes dictation-pulse {
  0% {
    box-shadow: 0 0 0 0 var(--accent);
  }
  100% {
    box-shadow: 0 0 0 12px rgba(var(--accent-rgb), 0);
  }
}

.dictation-active {
  animation: dictation-pulse 1.5s ease-out infinite;
}
```

The audio level scaling is applied via a CSS custom property (`--pulse-amplitude`) updated by JavaScript on each `analyserNode` frame, multiplying the ring's target spread (e.g., `calc(12px * var(--pulse-amplitude))`).

`prefers-reduced-motion`: Static accent border replaces pulsing ring. No animation.

---

## 5. Scroll-Linked Animations (Marketing Pages)

These apply only to the marketing/landing pages (`components/marketing/`). Do not use scroll-linked animations inside the app workflow.

### Section Reveal

Elements enter when they cross into the viewport (detected via `IntersectionObserver` with `threshold: 0.15`):

```
opacity: 0 → 1
translateY: 24px → 0
duration: slow (300ms), ease-enter
```

Elements are pre-positioned with `opacity: 0` and `translateY: 24px` via CSS class. When the IntersectionObserver fires, a class is toggled to trigger the transition. No JavaScript animation library needed for basic reveal.

### Stagger Within Sections

Children within a section (e.g., three feature cards) stagger at **75ms intervals**:

```
Card 1: delay 0ms
Card 2: delay 75ms
Card 3: delay 150ms
```

Maximum 5 elements in a stagger group. Beyond that, remaining elements share the last delay value.

### Parallax

Used on the hero section **only**. Applied to background decorative elements (e.g., a subtle geometric pattern or paper texture in the background), not to text or CTAs.

```
translateY: scrollY * 0.3 (background moves at 30% of scroll speed)
```

Implement with a scroll event listener throttled to `requestAnimationFrame`. Never apply parallax to interactive elements or text.

### Sticky Header

```css
.site-header {
  background-color: transparent;
  backdrop-filter: blur(0px);
  transition:
    background-color 150ms ease-out,
    backdrop-filter 150ms ease-out;
}
.site-header.scrolled {
  background-color: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
}
```

The "scrolled" class is applied when `window.scrollY > 16`. The transition is 150ms — fast enough to feel responsive to scroll, slow enough to not flicker.

### Statistic Counter Animation

For numbers displayed as statistics (e.g., "CHF {formattedBasePrice} per letter" — value from config, not hardcoded):

1. Value starts at `0` when the section enters the viewport.
2. Counts up to the real value over 800ms, ease-out.
3. Use a custom hook with `requestAnimationFrame` — not a third-party counter library.

Do not animate prices that are shown inside the checkout or pricing components — those are transactional, not promotional.

---

## 6. Loading States

### Full Page Load

Show skeleton layout **immediately** on mount. No blank page, no fullscreen spinner. The skeleton matches the structure of the page that will load.

### Button Action

See §4.1 — spinner replaces button label in place. Button dimensions held.

### Inline Content Load

For a specific content area refreshing (e.g., a list reloading after a filter change):

```
Old content: opacity 1 → 0.4 (dim, not disappear), 150ms ease-out
Skeleton overlaid: opacity 0 → 1, 150ms ease-enter
When ready:
Skeleton: opacity 1 → 0, 200ms
New content: opacity 0 → 1, 200ms
Old content opacity resets.
```

Never fully hide old content while loading — the dim state preserves layout continuity.

### Background Task (Processing)

For operations that run server-side (e.g., PDF rendering):

A thin accent-colored progress bar (`#B85C38`) at the very top of the page (z-index: highest):

```
Enter:    width 0% → 70%  in 1.2s ease-out (simulated progress)
          Holds at 70% until server responds.
Complete: width 70% → 100% in 200ms linear, then fade out.
Exit:     opacity 1 → 0, 300ms, ease-exit
```

The 70% hold is intentional — do not fake 100% before the task is complete. 70% communicates "working" without lying about completion.

### Letter Rendering

When the backend is generating the PDF preview, show a special rendering indicator inside the preview card:

```
A thin horizontal line sweeps left-to-right across the bottom of the letter card.
Color: border-strong (#CBD5E1).
Animation: translateX(-100%) → translateX(100%), 1.2s linear, infinite.
```

This "scanning" motion on the letter itself communicates rendering activity in a way that is thematically connected to the product. It stops and the line fades out (200ms) when the preview is ready.

### AI Regeneration Loading

When user requests a tone change, rewrite, or translation:

1. **Conversation panel:** AI typing indicator appears ("Rewriting...")
2. **Letter preview:** Current body text dims to `opacity: 0.4` (200ms ease)
3. **Preview overlay:** Subtle shimmer animation sweeps across the dimmed body (same pattern as skeleton loading, but at 30% opacity)
4. **On completion:** New text fades in from `opacity: 0` to `1` (300ms ease-out), changed sections briefly highlight with `bg-primary/5` (same as initial generation)
5. **Old text disposal:** Previous text is replaced, not animated out — instant swap under the opacity transition
6. **Duration indicator:** If regeneration takes > 3 seconds, show a thin progress bar at the top of the preview panel (indeterminate, primary color)
7. **Undo appearance:** "↩ Undo" link fades in at status strip (200ms) simultaneously with new text

`prefers-reduced-motion`: Skip shimmer and highlight. Text swaps instantly at full opacity.

---

## 7. Empty States

### No Drafts

Empty state illustration appears with:

```
Illustration: opacity 0 → 1, translateY 16px → 0, 300ms, ease-enter
Heading:      opacity 0 → 1, 300ms, 50ms delay, ease-enter
Body copy:    opacity 0 → 1, 300ms, 100ms delay, ease-enter
CTA button:   opacity 0 → 1, 300ms, 150ms delay, ease-enter
```

The stagger creates a reading-order reveal. Each element is already in its final position — only opacity animates after the first element.

### No Attachments — Drop Zone

The upload drop zone has a subtle hover pulse:

```css
.drop-zone {
  border: 1.5px dashed var(--color-border);
  transition:
    border-color 150ms ease-out,
    background-color 150ms ease-out;
}
.drop-zone:hover,
.drop-zone.drag-over {
  border-color: var(--color-primary);
  background-color: var(--color-primary-light);
}
```

On `drag-over`: instant border color change to `primary`. No animation needed — the instant feedback confirms the drag target.

### No Results (Search)

```
Empty state card: opacity 0 → 1, 200ms, ease-enter
No translateY — search results are in a list; a slide would be spatially confusing.
```

---

## 8. Error States

### Form Error

See §4.7 — shake + error text appear.

### Network / Connectivity Error

Toast notification appears (see §4.5). The "Retry" button within the toast:

- On retry click: spinner appears in button (see §4.1 loading state).
- If retry fails again: the button shakes (same keyframe as form validation shake, but applied to the button, not the input). Error toast remains.
- If retry succeeds: toast auto-dismisses with success state.

### Payment Failure

Payment failure shows a dedicated status card (not just a toast):

```
Status card: opacity 0 → 1, translateY 8px → 0, 300ms, ease-enter
Left border: color: error (#DC2626), instant
Attention indicator: a pulsing dot (scale 1 → 1.3 → 1, 1.5s, infinite) next to the error message
```

```css
@keyframes attention-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.7;
  }
}
.attention-dot {
  animation: attention-pulse 1.5s ease-in-out infinite;
}
```

The pulsing dot stops once the user has acknowledged the error (clicked "Try Again" or "Use Different Card"). Do not let it pulse indefinitely — it is a call to action, not ambient decoration.

### Dispatch Ambiguity

When dispatch status is unknown or ambiguous, the status indicator shows a warning state (not error):

```
Warning badge: opacity 0 → 1, 200ms, ease-enter
No pulsing, no shake — ambiguity is not the user's fault; it does not warrant alarm animations.
```

### Session Expiry Warning Animation

- **Banner entry:** Slides down from top (200ms ease-out), pushes content down.
- **Warning state (1h):** Static banner, no animation after entry.
- **Critical state (5min):** Banner background pulses subtly between `bg-error/10` and `bg-error/15` (2s cycle, infinite). Draws urgent attention without being alarming.
- **Countdown (if shown):** Minutes update every 60 seconds with a brief fade transition on the number.
- **Dismissal (warning only):** Slides up + fades out (150ms ease-in).
- **Email save success:** Banner content cross-fades to "✓ Saved — check your email" (200ms), then slides up after 3 seconds.

`prefers-reduced-motion`: No pulse on critical state. Banner appears/disappears without slide.

---

## 9. Completion and Delight Moments

These are brief completion moments that acknowledge meaningful progress without making the product feel playful or trivial. They must remain opt-out via reduced-motion and must never overpower trust-critical screens.

### Confirmation completion moment

This is the emotional release point of the product. The confirmation screen includes:

1. **Status icon emphasis:** The confirmation icon scales in gently from 0.92 → 1.0 over 220ms.
2. **Success heading:** Fades in after 150–200ms.
3. **Dispatch status card:** Slides in after the heading so the user immediately sees what happened next.

**Implementation:** Do not use confetti, paper-plane flyouts, or full-screen celebration effects on the confirmation route. This is a high-trust product, not a consumer game.

**Reduced-motion:** Use a simple crossfade only.

**Replay rule:** Keep animations subtle enough that replay on a normal reload is acceptable, but never stack or loop completion effects.

### First Letter Completion

For a user's first-ever completed letter (tracked in session or account state), a short supporting line may fade in below the confirmation card after the main status is already visible. Do not add extra animation layers.

---

## 10. CSS and Framer Motion Implementation

### When to Use Which Tool

| Situation                               | Tool                                                      | Reason                                             |
| --------------------------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| Hover, focus, color, border transitions | CSS `transition`                                          | Cheaper, GPU-accelerated, no JS overhead           |
| Enter/exit with unmounting              | Framer Motion `AnimatePresence`                           | CSS cannot animate unmounting elements             |
| List reordering or layout changes       | Framer Motion `layout` prop                               | Automatic FLIP animation                           |
| Stagger groups                          | Framer Motion `staggerChildren`                           | Clean declarative API                              |
| Drag and spring physics                 | Framer Motion `drag` + `spring`                           | Physics engine baked in                            |
| Infinite loops (shimmer, spinner)       | CSS `@keyframes`                                          | `animation` property, not `transition`             |
| Scroll-linked values                    | Native `IntersectionObserver` or CSS `animation-timeline` | No Framer Motion scroll hooks in the critical path |

### Framer Motion Variants Pattern

Define animation variants in dedicated files, not inline in JSX:

```ts
// components/product/LetterPreview/variants.ts
export const cardVariants = {
  hidden: { opacity: 0, y: 24, boxShadow: "0 0 0 0 rgba(0,0,0,0)" },
  visible: {
    opacity: 1,
    y: 0,
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
    transition: { duration: 0.5, ease: [0, 0, 0.2, 1] },
  },
};

export const zoneHighlightVariants = {
  idle: { backgroundColor: "transparent" },
  pulsing: {
    backgroundColor: "#FBF0EB",
    transition: { duration: 0.2, ease: [0, 0, 0.2, 1] },
  },
  fading: {
    backgroundColor: "transparent",
    transition: { duration: 0.4, ease: [0.4, 0, 1, 1] },
  },
};
```

### CSS `@keyframes` Catalog

```css
/* Skeleton shimmer */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Form shake */
@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  15% {
    transform: translateX(-4px);
  }
  30% {
    transform: translateX(4px);
  }
  45% {
    transform: translateX(-4px);
  }
  60% {
    transform: translateX(4px);
  }
  75% {
    transform: translateX(-2px);
  }
  90% {
    transform: translateX(2px);
  }
}

/* Spinner rotation */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Typing indicator dots */
@keyframes typing-dot {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

/* Attention pulse */
@keyframes attention-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.7;
  }
}

/* Letter scan line */
@keyframes scan {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(100%);
  }
}

/* Dictation pulse ring */
@keyframes dictation-pulse {
  0% {
    box-shadow: 0 0 0 0 var(--accent);
  }
  100% {
    box-shadow: 0 0 0 12px rgba(var(--accent-rgb), 0);
  }
}

/* Session expiry critical pulse */
@keyframes expiry-pulse {
  0%,
  100% {
    background-color: var(--color-error-10);
  }
  50% {
    background-color: var(--color-error-15);
  }
}
```

### Typing Indicator (AI)

```css
.typing-dot:nth-child(1) {
  animation: typing-dot 1.2s ease-in-out infinite 0ms;
}
.typing-dot:nth-child(2) {
  animation: typing-dot 1.2s ease-in-out infinite 200ms;
}
.typing-dot:nth-child(3) {
  animation: typing-dot 1.2s ease-in-out infinite 400ms;
}
```

Three dots, each offset by 200ms. They travel up 4px and increase in opacity to indicate active thinking.

---

## 11. Tailwind Config Extension

Add to `tailwind.config.ts` → `theme.extend`:

```ts
animation: {
  'fade-in':         'fadeIn 200ms cubic-bezier(0, 0, 0.2, 1)',
  'fade-out':        'fadeOut 150ms cubic-bezier(0.4, 0, 1, 1)',
  'slide-up':        'slideUp 300ms cubic-bezier(0, 0, 0.2, 1)',
  'slide-down':      'slideDown 300ms cubic-bezier(0, 0, 0.2, 1)',
  'shake':           'shake 300ms ease-in-out',
  'shimmer':         'shimmer 1.5s ease-in-out infinite',
  'spin-slow':       'spin 1.2s linear infinite',
  'attention-pulse': 'attention-pulse 1.5s ease-in-out infinite',
  'scan':            'scan 1.2s linear infinite',
  'typing-dot':      'typing-dot 1.2s ease-in-out infinite',
},
keyframes: {
  fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
  fadeOut: { from: { opacity: '1' }, to: { opacity: '0' } },
  slideUp: {
    from: { opacity: '0', transform: 'translateY(24px)' },
    to:   { opacity: '1', transform: 'translateY(0)' },
  },
  slideDown: {
    from: { opacity: '0', transform: 'translateY(-24px)' },
    to:   { opacity: '1', transform: 'translateY(0)' },
  },
  shake: {
    '0%, 100%': { transform: 'translateX(0)' },
    '15%':      { transform: 'translateX(-4px)' },
    '30%':      { transform: 'translateX(4px)' },
    '45%':      { transform: 'translateX(-4px)' },
    '60%':      { transform: 'translateX(4px)' },
    '75%':      { transform: 'translateX(-2px)' },
    '90%':      { transform: 'translateX(2px)' },
  },
  shimmer: {
    '0%':   { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' },
  },
  'attention-pulse': {
    '0%, 100%': { transform: 'scale(1)', opacity: '1' },
    '50%':      { transform: 'scale(1.3)', opacity: '0.7' },
  },
  scan: {
    from: { transform: 'translateX(-100%)' },
    to:   { transform: 'translateX(100%)' },
  },
  'typing-dot': {
    '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
    '30%':           { transform: 'translateY(-4px)', opacity: '1' },
  },
},
```

---

## 12. Accessibility: Reduced Motion

`prefers-reduced-motion: reduce` must disable all animations and transitions without breaking functionality.

### Global CSS Rule (required)

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

This is a catch-all and must be present in the global stylesheet.

### Framer Motion Variants

For components using Framer Motion, conditionally disable motion:

```ts
import { useReducedMotion } from "framer-motion";

function LetterPreviewCard() {
  const shouldReduceMotion = useReducedMotion();
  const variants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } } // No position change
    : cardVariants; // Full animation
  // ...
}
```

### Non-negotiable rules

- Content is never invisible by default waiting for an animation. All `initial` states must be overridden immediately if motion is reduced.
- The letter preview and confirmation page are fully readable with motion off.
- Non-essential completion effects are skipped entirely — not slowed — when motion is reduced.
- The letter scan-line animation is skipped; replace with a static pulsing opacity instead (which the global rule will also flatten if needed).

---

## 13. What Does Not Animate

Some things must be **instantaneous**. Adding animation to these would create latency where none should exist.

| Interaction                                                                 | Why instant                                                        |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Any response to a keypress (text appearing in inputs, letter zone updating) | User caused it; animation would feel like lag                      |
| Form validation error text appearing on blur                                | The error is information, not an event                             |
| Inline helper text showing/hiding                                           | Utility text; not meaningful enough to animate                     |
| Disabled state changes                                                      | Disabling an element is an informational state, not a transition   |
| Loading spinner rotation starting                                           | The spin itself is the animation; the start of the spin is instant |
| Focus ring appearance                                                       | Accessibility requirement — must be instant and visible            |
| Text content changes within the letter that the AI did not trigger          | Any text the user typed directly; animation would fight the user   |
| Tooltip appear on keyboard focus                                            | Accessibility: keyboard users need immediate feedback              |

**The rule:** If the user directly caused it with input (typing, clicking, keyboard navigation), make the result instant. Animations are for system-initiated transitions, not user-initiated responses.

---

_This document is the animation playbook. If a motion decision is not described here, default to no animation. Add animation only when you can name what it communicates._

---

## Implementation Danger Zones

### ADZ-1: Do not use CSS `transition` for layout animations

Layout-triggering properties (`height`, `width`, `top`, `left`, `margin`, `padding`) should animate via `transform` and `opacity` where possible. Animating layout properties causes reflow on every frame, producing jank on mobile. The only exception is `max-height` for expand/collapse where `transform` cannot achieve the effect — and even then, test on low-end Android.

### ADZ-2: Do not animate faster than 120ms or slower than 500ms

Animations under 120ms are imperceptible and waste GPU cycles. Animations over 500ms feel sluggish. The canonical durations in this document (150ms, 200ms, 300ms, 400ms) were chosen for specific interaction types. Do not invent new durations without checking this doc first.

### ADZ-3: Do not chain animations synchronously

Staggered animations (e.g., the first-draft reveal choreography) must use `requestAnimationFrame` or CSS `animation-delay`, not JavaScript `setTimeout` chains. Timeout-based animation produces frame drops and timing drift.

### ADZ-4: Do not animate on mount without reason

Components should fade in when they represent a state change or arrival. Components that are part of the static layout (header, footer, navigation) should NOT animate on page load. An LLM may add `animate-fade-in` to every component for polish — this reads as "everything is loading all the time."

### ADZ-5: Do not override reduced-motion users' choice

`prefers-reduced-motion: reduce` is a medical accessibility need, not a preference. When active:

- All spring/bounce easings become linear
- All durations cap at 100ms (effectively crossfade)
- Confetti, parallax, and stagger sequences are fully suppressed
- The typing indicator becomes static text "…"
- The auto-save indicator uses text changes only, no icon animation

This is non-negotiable. Test every animation with `prefers-reduced-motion` forced on.

### ADZ-6: Do not use Framer Motion or GSAP for simple transitions

CSS transitions handle 90% of the animations in this document. Use CSS `@keyframes` for repeating animations (typing indicator, auto-save spinner). Only reach for a JS animation library if you need: interruptible physics-based springs, gesture-driven animations, or layout animations that CSS cannot express. Unnecessary JS animation libraries add bundle weight and hydration cost.
