# episto Micro-Interactions & Animation Specification — Part 2

> Split from [micro-interactions.md](micro-interactions.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- 4. Component-Level Animations
- 5. Scroll-Linked Animations (Marketing Pages)
- 6. Loading States
- 7. Empty States

## 4. Component-Level Animations

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

## 4. Component-Level Animations

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

## 4. Component-Level Animations

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

## 4. Component-Level Animations

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

## 4. Component-Level Animations

### 4.10 Modals and Sheets

See §3 (Page Transitions) for enter/exit values. Additional rules:

- **Focus trap:** Focus moves to the first focusable element in the modal immediately after the enter animation starts (not completes). Do not wait for animation to finish.
- **Scroll lock:** `overflow: hidden` on `<body>` during open state. Restore on close.
- **Overlay click:** Triggers the close animation, not an instant removal.
- **Keyboard Escape:** Same as overlay click.

---

## 4. Component-Level Animations

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

## 4. Component-Level Animations

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

## 4. Component-Level Animations

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
