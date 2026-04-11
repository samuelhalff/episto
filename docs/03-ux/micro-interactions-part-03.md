# Episto Micro-Interactions & Animation Specification — Part 3

> Split from [micro-interactions.md](micro-interactions.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- 8. Error States
- 9. Completion and Delight Moments
- 10. CSS and Framer Motion Implementation
- 11. Tailwind Config Extension
- 12. Accessibility: Reduced Motion
- 13. What Does Not Animate
- Implementation Danger Zones

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
