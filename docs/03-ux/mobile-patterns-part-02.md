# Mobile UX Patterns — Part 2

> Split from [mobile-patterns.md](mobile-patterns.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- 7. Performance on Mobile
- 8. Gesture and Animation
- 9. Mobile-Specific Edge Cases
- 10. Accessibility on Mobile
- Appendix: Quick Reference — Thumb Zone
- Appendix: Mobile Implementation Danger Zones

## 7. Performance on Mobile

**Targets**

| Metric                   | Target           |
| ------------------------ | ---------------- |
| Time to Interactive (3G) | < 3 s            |
| First Contentful Paint   | < 1.5 s          |
| Total Blocking Time      | < 200 ms         |
| JS bundle (first paint)  | < 150 KB gzipped |
| Largest Contentful Paint | < 2.5 s          |

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

| Interaction                        | Animation                                                   | Duration |
| ---------------------------------- | ----------------------------------------------------------- | -------- |
| Bottom sheet open                  | Spring from bottom, slight bounce                           | 300 ms   |
| Bottom sheet dismiss               | Ease-out slide down                                         | 200 ms   |
| Sheet drag                         | Follows finger 1:1, spring-snap on release                  | —        |
| Page forward navigation            | Slide left (new page in from right)                         | 250 ms   |
| Page back navigation               | Slide right (current page out to right)                     | 200 ms   |
| Pull-to-refresh                    | Rubber-band stretch, spinner appears at threshold           | —        |
| Hero parallax                      | Subtle scroll-linked background shift (desktop/tablet only) | —        |
| Tap feedback                       | `scale(0.97)`, revert                                       | 75 ms    |
| Toast / snackbar                   | Slide up from bottom, auto-dismiss after 3 s                | 200 ms   |
| Preview toggle — first draft ready | Badge/update signal appears on the Preview option           | 150 ms   |

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
- The mobile workspace toggle stays within the top app frame, outside the scrollable thread
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

### MDZ-1: Do not treat the mobile preview as a separate route

The mobile preview is part of the draft workspace, not a separate route. Do not use `router.push` to open it. Use local workspace state (`mobileView: "conversation" | "preview"`). The preview shares the same React context as the conversation panel — zone edits in preview must update the conversation state and vice versa.

### MDZ-2: Do not forget safe area insets

Every fixed-position element at the bottom of the screen (input bar, sticky CTA, status strip) must account for `env(safe-area-inset-bottom)`. On iPhone models with the home indicator, this adds ~34px. Without it, interactive elements are partially hidden behind the home indicator.

### MDZ-3: Do not use 100vh on mobile

`100vh` is wrong on mobile Safari — it includes the address bar height, causing content to be hidden behind it. Use `100dvh` (dynamic viewport height) or `100svh` (small viewport height) instead. The conversation panel height must use `dvh` units to properly account for the software keyboard.

### MDZ-4: Do not build desktop-first responsive

This entire document assumes mobile-first. All base styles target 375–430px viewport. Breakpoints EXPAND the layout — they never compress it. An LLM that starts with the desktop layout and adds `@media (max-width)` queries will produce a fundamentally worse mobile experience.

### MDZ-5: Do not auto-play animations on low-end devices

Use `navigator.hardwareConcurrency` or a similar heuristic to detect low-end devices. On devices with ≤4 cores, reduce animation complexity: skip non-essential completion effects, reduce stagger animations to instant, and use `will-change: auto` instead of `will-change: transform`.

### MDZ-6: Do not let mobile preview and composer compete for space

On mobile, preview and conversation are sibling workspace views. Do not float preview controls over the composer or nest preview interactions inside the input region. This causes layout collisions, unstable composer positioning, and poor thumb-zone behavior.
