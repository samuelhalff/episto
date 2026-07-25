# episto Micro-Interactions & Animation Specification — Part 1

> Split from [micro-interactions.md](micro-interactions.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- 1. Animation Principles
- 2. Timing and Easing Reference
- 3. Page Transitions
- 4. Component-Level Animations

## 1. Animation Principles

Animation in episto is **an instrument of clarity, not decoration**. The product is used in high-stakes moments — a tenant sending a formal notice, a professional dispatching a contract. Motion must reinforce confidence, not add noise.

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

## 4. Component-Level Animations

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

## 4. Component-Level Animations

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

## 4. Component-Level Animations

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

## 4. Component-Level Animations

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

## 4. Component-Level Animations

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
