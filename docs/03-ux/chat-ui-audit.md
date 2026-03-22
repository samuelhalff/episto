# Swiss Mail — Chat UI Audit

> **Status:** Audit — not yet actioned  
> **Scope:** Conversation panel layout, scroll behaviour, input anchoring, preview integration  
> **Stack:** Next.js · TypeScript · Tailwind CSS · shadcn/ui primitives + custom product components  
> **Last updated:** 2026-03  
> **Applies to:** `ConversationPanel`, `InputBar`, `FlowHeader`, `LetterPreview`, draft workspace (`/draft/[draftId]`)

---

## Table of Contents

1. [Reference Analysis — What the best chat UIs get right](#1-reference-analysis)
2. [Common Patterns (distilled rules)](#2-common-patterns)
3. [Gap Analysis — Swiss Mail vs. established patterns](#3-gap-analysis)
4. [Recommended Changes](#4-recommended-changes)
5. [Open Questions](#5-open-questions)

---

## 1. Reference Analysis

Six established chat interfaces, evaluated on the dimensions that matter for a conversation-driven drafting tool.

### 1.1 ChatGPT (chat.openai.com)

| Dimension | Behaviour |
|---|---|
| **Scroll anchoring** | Thread auto-scrolls during streaming. When user scrolls up, streaming continues but the viewport stays put. A "↓" pill appears at the bottom-centre of the thread; clicking it jumps to the latest message. Pill disappears when user scrolls back to bottom naturally. |
| **Input area** | Fixed to viewport bottom, outside the scroll container. Textarea grows from one line to ~6 lines, then itself scrolls internally. Max height is capped so messages never get pushed off-screen. |
| **Layout stability** | Zero CLS. The header is a thin static bar (model selector + new-chat button). It never collapses, expands, or animates. Sidebar is a separate overlay on mobile, slide-in on desktop — it never reflows the chat column. |
| **Side panels / previews** | "Canvas" slides in from the right, taking ~50% width on desktop. The chat column compresses but keeps its own scroll position. On mobile, canvas is a full-screen overlay with a back-arrow. The chat thread is entirely hidden, not reflowed. |
| **Mobile keyboard** | Uses `visualViewport` API. When the keyboard opens, the viewport shrinks and the input bar rides up with it. No double-scroll. The thread scroll container shrinks proportionally. |
| **Loading states** | Streaming cursor (blinking block) inside the latest assistant message bubble. Three-dot "thinking" indicator before first token arrives. Never a blank white space — the indicator occupies the same space the message will fill. |
| **Step/progress indicators** | N/A — no multi-step flow. |

### 1.2 Claude (claude.ai)

| Dimension | Behaviour |
|---|---|
| **Scroll anchoring** | Nearly identical to ChatGPT. Auto-scrolls during streaming; pauses when user scrolls up. "↓" pill at bottom of thread. Scroll position is preserved per-conversation when switching between chats. |
| **Input area** | Pinned to bottom. Grows up to ~8 lines, then gains internal scroll. File attachment chips appear above the textarea, inside the input container, pushing the textarea down slightly — but the entire input block is still anchored to the bottom. |
| **Layout stability** | Minimal header (conversation title, model badge). No collapse/expand. Sidebar is overlay on mobile, persistent on desktop. Chat column width is fixed once rendered. |
| **Side panels / previews** | "Artifacts" panel slides in from the right on desktop (~50% split). Chat column compresses smoothly (CSS transition ~200ms). Scroll position in chat is preserved during the transition. On mobile, artifact is a full overlay. |
| **Mobile keyboard** | Clean handling. Input stays visible. Thread shrinks. No jumps. |
| **Loading states** | "Thinking" block (expandable accordion) before response. Streaming text with blinking cursor. Thought-process block can be collapsed without affecting scroll. |
| **Step/progress indicators** | N/A. |

### 1.3 Gemini (gemini.google.com)

| Dimension | Behaviour |
|---|---|
| **Scroll anchoring** | Auto-scrolls during streaming. Scroll-to-bottom button appears on scroll-up. Notably, Gemini re-renders markdown in chunks, which can cause minor content-height jumps during streaming — a known weakness. |
| **Input area** | Bottom-pinned. Grows with content. Suggestion chips appear above the input bar (inside the sticky bottom region), not in the scroll area. |
| **Layout stability** | Generally stable but the markdown re-rendering during streaming causes occasional flicker. Header is minimal (model selector). |
| **Side panels / previews** | No persistent side panel. Code/canvas opens as an overlay or replaces the thread view. Less sophisticated than ChatGPT/Claude for split-panel UX. |
| **Mobile keyboard** | Standard viewport-shrink behaviour. Adequate but not notably polished. |
| **Loading states** | Animated dots, then streaming text. Markdown blocks snap into shape after rendering, which can feel jumpy. |
| **Step/progress indicators** | N/A. |

**Lesson from Gemini:** Incremental markdown rendering is hard. If Swiss Mail streams structured content (letter fields, formatted paragraphs), render the structure once at the end, not incrementally, to avoid CLS.

### 1.4 WhatsApp Web

| Dimension | Behaviour |
|---|---|
| **Scroll anchoring** | Gold standard for chat scroll. New messages append at bottom. If user is scrolled up, a green "↓ New messages" pill with unread count appears. Clicking it scrolls to bottom. Sending a message always scrolls to bottom. |
| **Input area** | Fixed at viewport bottom. Grows from 1 line to ~5 lines. Emoji picker opens as an overlay above the input bar — never pushes the input bar down. |
| **Layout stability** | Rock solid. Three-column layout (contacts / chat / info panel) with fixed column widths. Nothing reflows. Info/media panel slides in from right and takes the place of the contacts column or overlays it — chat column is untouched. |
| **Side panels / previews** | Contact info / media panel opens on the right. On narrow viewports, it overlays the contact list. On wide viewports, it's a third column. The chat column never changes width or scroll position. |
| **Mobile keyboard** | N/A (web app, but responsive handling is solid). |
| **Loading states** | Delivery ticks (sent → delivered → read). Typing indicator ("typing…") appears in the chat header, not in the message thread. Minimal — no skeleton states. |
| **Step/progress indicators** | N/A. |

**Key takeaway:** The chat column is sacred. Nothing — absolutely nothing — reflows it or steals its scroll position.

### 1.5 iMessage (macOS)

| Dimension | Behaviour |
|---|---|
| **Scroll anchoring** | Auto-scrolls on new messages if at bottom. "↓" arrow at bottom-right when scrolled up. Scroll position preserved when switching conversations (each conversation remembers its position). |
| **Input area** | Pinned below the message list. Grows vertically with content. The message list shrinks to accommodate. Tapback/reaction UI opens as a popover — never shifts the input bar. |
| **Layout stability** | Two-column master-detail. Column widths are user-resizable but never shift programmatically. Toolbar at top is fixed-height, never collapses. |
| **Side panels / previews** | Contact/attachment details slide in from the right as a third column or overlay. Chat column is never reflowed. |
| **Mobile keyboard** | iOS native — keyboard pushes the entire view up. Input bar is always visible. Thread scrolls to bottom on keyboard open. |
| **Loading states** | Typing indicator (three bouncing dots) appears as a message bubble at the bottom of the thread. Delivery status below the last sent message. |
| **Step/progress indicators** | N/A. |

### 1.6 Slack

| Dimension | Behaviour |
|---|---|
| **Scroll anchoring** | "New messages" divider line appears in the thread when returning to a channel. "↓ Jump to new" pill at bottom when scrolled up. Preserves scroll position per-channel. |
| **Input area** | Pinned at bottom. Rich text toolbar above textarea. Grows with content up to ~40% viewport, then scrolls internally. Formatting toolbar is always visible — it doesn't toggle and cause layout shift. |
| **Layout stability** | Sidebar + channel + thread panel. All column widths are fixed (user-resizable, not programmatic). Thread panel slides in from right without reflowing the main channel column. |
| **Side panels / previews** | Thread replies open in a right-side panel. The main channel column keeps its width and scroll position. On narrow viewports, thread panel overlays the channel. |
| **Mobile keyboard** | Standard iOS/Android handling. Input visible, thread shrinks. |
| **Loading states** | Typing indicator ("X is typing…") text below the message list, above the input bar. Message skeletons on initial channel load. |
| **Step/progress indicators** | Workflows show as structured blocks inside messages, not as separate UI chrome. Progress is in-thread, not in headers. |

**Key takeaway from Slack:** Multi-step progress belongs *inside* the conversation thread (as structured message blocks), not in a separate header bar.

---

## 2. Common Patterns

Distilled from all six interfaces into concrete, implementable rules.

### Rule 1: One scroll surface per view

The message thread is the **only** scroll container in the chat view. The header does not scroll. The input bar does not scroll. On mobile, there is one scroll surface — period.

### Rule 2: Input bar is viewport-anchored

The input area sits at the visual bottom of the viewport at all times. It is outside the thread scroll container. It grows upward when the user types multi-line content, capped at a max height (~120–160px), then gains its own internal scroll.

### Rule 3: Scroll-to-bottom affordance

When the user scrolls up in the thread, a floating pill/button appears (bottom-centre of the thread container). It shows unread count or a "↓" arrow. Clicking it smooth-scrolls to bottom. It auto-dismisses when the user scrolls back to bottom naturally.

### Rule 4: New content never shifts existing content

Messages append at the bottom. If the user is at the bottom, the viewport follows. If the user is scrolled up, the viewport stays put. Sending a message always scrolls to bottom. Receiving a message while scrolled up never jumps the viewport.

### Rule 5: Side panels don't reflow the chat column

Secondary content (preview, artifacts, details) either:
- Compresses the chat column via CSS transition (Claude, ChatGPT), or
- Overlays/replaces a non-chat column (WhatsApp, Slack), or
- Opens as a full overlay on mobile

The chat column's scroll position is **never** lost when a side panel opens or closes.

### Rule 6: Headers are static geometry

The top bar has a fixed height. It does not collapse on scroll, expand on hover, or animate. It is purely structural. Any dynamic status (typing, saving) is shown within fixed-size slots — text changes, geometry does not.

### Rule 7: Loading states live inside the thread

The typing/streaming indicator is a message bubble at the bottom of the thread, inside the scroll container. It occupies the same vertical space the response will fill. There is never blank white space between the last message and the input bar.

### Rule 8: Multi-step progress belongs in-thread, not in chrome

Slack embeds workflow steps as structured blocks inside the message stream. ChatGPT/Claude show no step indicators at all — the conversation *is* the progress. If progress must be shown, it should be a message card inside the thread, not a header widget.

### Rule 9: Mobile keyboard shrinks the viewport, not the layout

On mobile, the software keyboard causes the visual viewport to shrink. The input bar rides up with the keyboard. The thread scroll container shrinks proportionally. There is never a state where the input bar is hidden behind the keyboard.

### Rule 10: View switching preserves scroll position

When toggling between views (conversations in Slack, chats in WhatsApp), scroll position is preserved per-view. Switching away and back does not reset to top.

---

## 3. Gap Analysis

Current implementation files:
- `frontend/src/app/[locale]/draft/[draftId]/page.tsx`
- `frontend/src/components/product/ConversationPanel.tsx`
- `frontend/src/components/product/InputBar.tsx`
- `frontend/src/components/product/FlowHeader.tsx`
- `frontend/src/components/product/LetterPreview.tsx`

### 3.1 FlowHeader causes layout instability

**Problem:** FlowHeader is sticky (`z-40`) and contains a `StepIndicator` that adds a second row on mobile. The header height varies between mobile and desktop, and the step indicator strip adds visual weight that competes with the conversation.

**Violation of:** Rule 6 (static geometry), Rule 8 (progress in chrome).

**What the best apps do:** ChatGPT, Claude, WhatsApp — all have thin, fixed-height headers. None show a step indicator. Slack shows workflow progress as in-thread message blocks.

**Impact:** The step indicator is visual noise during active conversation. The user is talking to the AI — they know what step they're on. The indicator only becomes useful at the transition from drafting → review → payment, which happens on separate routes anyway.

### 3.2 Mobile tab toggle causes scroll position loss

**Problem:** On mobile, the workspace uses a tab toggle between "Conversation" and "Preview". Toggling between views likely unmounts and remounts components (or at minimum, toggles visibility with `hidden`), which can reset scroll position.

**Violation of:** Rule 10 (preserve scroll on view switch).

**What the best apps do:** WhatsApp preserves scroll position per-conversation. Claude preserves chat scroll when the artifact panel opens/closes. Slack preserves scroll per-channel.

**Impact:** User taps "Preview" to check the letter, taps "Conversation" to continue — and loses their place in the thread. This is especially frustrating during long drafting sessions.

### 3.3 Preview panel causes chat column reflow on desktop

**Problem:** The desktop layout is a 42%/58% split. The preview panel is always present, compressing the conversation to 42% of the viewport. This is fine as a steady state, but if the split changes (e.g., preview loading, panel resizing), the chat column reflows.

**Violation of:** Rule 5 (side panels don't reflow chat).

**Current layout:**
```
┌─────────────────────────────────────────────────┐
│ FlowHeader (sticky, z-40)                       │
├──────────────┬──────────────────────────────────┤
│ Conversation │ Preview                           │
│ 42%          │ 58%                               │
│              │                                    │
│ [scroll]     │ [scroll]                           │
│              │                                    │
│ ──────────── │                                    │
│ InputBar     │                                    │
│ (shrink-0)   │                                    │
└──────────────┴──────────────────────────────────┘
```

**Issue:** Two independent scroll containers side by side. The conversation panel is narrow (42%) which on a 1280px screen is ~538px — tight for a chat UI. Chat UIs typically give conversation the majority of horizontal space.

### 3.4 No "scroll to bottom" indicator

**Problem:** The ConversationPanel tracks `isStickToBottom` (within 80px tolerance) and auto-scrolls on new messages, but there is no visible "↓" pill/FAB when the user is scrolled up.

**Violation of:** Rule 3 (scroll-to-bottom affordance).

**What the best apps do:** Every single reference app (ChatGPT, Claude, WhatsApp, iMessage, Slack) shows a scroll-to-bottom button when the user scrolls up. It's table stakes.

**Impact:** User scrolls up to re-read a message, then has no quick way to jump back to the latest content. They must manually scroll to the bottom.

### 3.5 InputBar anchoring on mobile with keyboard

**Problem:** The InputBar uses `shrink-0` within a flex-col container. This works in the normal viewport, but when the mobile keyboard opens, `100dvh` recalculates. If the browser's `dvh` handling is inconsistent (common on older iOS), the input bar may be pushed behind the keyboard or the layout may jump.

**Violation of:** Rule 9 (keyboard shrinks viewport, not layout).

**What the best apps do:** ChatGPT uses the `visualViewport` API to detect keyboard presence and adjust the scroll container height. WhatsApp uses native platform handling. Claude uses viewport-relative positioning.

**Impact:** On some mobile devices, opening the keyboard may hide the input bar or cause a jarring layout shift.

### 3.6 Loading/streaming states are adequate but not smooth

**Problem:** The ConversationPanel shows a streaming cursor animation for AI responses. The initial state (before first token) uses a typing indicator. However:
- The empty state (welcome message + icon) occupies significant vertical space before any conversation starts
- Transition from empty state → first message may cause a visual jump
- No skeleton states for the initial workspace load

**Violation of:** Rule 7 (loading states inside thread).

**Partial compliance:** The streaming cursor is good. But the transition moments (workspace load, first message, mode switches) could be smoother.

### 3.7 Step indicator adds noise without conversation value

**Problem:** The `StepIndicator` in `FlowHeader` shows dots for the four-step flow (Draft → Review → Pay → Done). During active drafting (which is 90%+ of time in the workspace), this indicator is static — it always shows "step 1". It consumes vertical space and visual attention for zero information value.

**Violation of:** Rule 8 (progress in-thread, not in chrome).

**What Slack does:** Workflow progress is a structured card inside the message thread. The user sees it in context.

**Impact:** The header is doing too much. Logo + step indicator + save status + price = cognitive overload for a screen whose primary job is "talk to the AI, watch the letter form."

### 3.8 Summary table

| Pattern | Status | Severity |
|---|---|---|
| Single scroll surface | ⚠️ Two independent scroll containers on desktop | Medium |
| Input bar viewport-anchored | ✅ Correct with `shrink-0` | Low risk on edge devices |
| Scroll-to-bottom pill | ❌ Missing | High — table stakes for chat UI |
| No CLS from new content | ✅ Auto-scroll logic is sound | — |
| Side panel doesn't reflow chat | ⚠️ Fixed split, but 42% is too narrow | Medium |
| Static header geometry | ⚠️ Step indicator adds variable height | Medium |
| Loading states in-thread | ✅ Streaming cursor present | Minor polish needed |
| Progress in-thread, not chrome | ❌ Step indicator in header | Medium |
| Mobile keyboard handling | ⚠️ Relies on `dvh` only | Medium on older iOS |
| View switch preserves scroll | ❌ Tab toggle likely resets scroll | High on mobile |

---

## 4. Recommended Changes

### P0 — Layout Stability

**P0.1: Remove StepIndicator from FlowHeader during active drafting**

The step indicator adds no value while the user is conversing. Replace it with a minimal header: logo + draft title (or "New Letter") + save status. The step indicator can appear as a transition card *inside the conversation thread* when the draft is complete and the user is prompted to move to review.

*Reference:* Slack (workflow progress as in-thread cards), ChatGPT (no step indicator at all).

*Implementation:*
```
Before:  Logo | ● ● ○ ○ Step Indicator | Saved | CHF 2.49
After:   Logo | "New Letter" or draft title | Saved
```

The price moves to the review step (where it's decision-relevant). The header becomes a single fixed-height row on all viewports.

**P0.2: Widen conversation column on desktop**

Flip the split from 42/58 to 55/45 or 58/42, giving the conversation the majority of space. The preview is a reference panel, not the primary workspace. The user's attention is on the conversation — the preview updates passively.

*Reference:* Claude Artifacts (chat gets ~55% when artifact panel is open).

```
Before:
┌──────────────┬──────────────────────────────────┐
│ Chat 42%     │ Preview 58%                       │
└──────────────┴──────────────────────────────────┘

After:
┌──────────────────────────────┬──────────────────┐
│ Chat 58%                     │ Preview 42%       │
└──────────────────────────────┴──────────────────┘
```

*Tailwind:* Change `w-[42%]` → `w-[58%]` on the conversation column, `w-[58%]` → `w-[42%]` on the preview column.

**P0.3: Preserve scroll position on mobile view toggle**

When toggling between Conversation and Preview on mobile, preserve the thread's `scrollTop` value. Two approaches:

1. **Keep both mounted, toggle visibility with `hidden` class** — the DOM stays alive, scroll position is inherently preserved. (Simplest.)
2. **Store `scrollRef.current.scrollTop` before hiding, restore on show** — works if you must unmount for performance.

*Reference:* WhatsApp (per-conversation scroll preservation), Slack (per-channel scroll preservation).

### P1 — Scroll Behaviour

**P1.1: Add a scroll-to-bottom FAB**

When `isStickToBottom` is false, render a floating "↓" button at the bottom-centre of the thread container (not the viewport — it should scroll-anchor to the thread area).

```
Positioning:  absolute, bottom-4, left-1/2 -translate-x-1/2
Appearance:   40×40px circle, stone-900 bg, white arrow icon
              shadow-lg, opacity transition
Behaviour:    onClick → smooth scroll to bottom
              Auto-dismiss when user scrolls within 80px of bottom
              Fade in/out (200ms opacity transition)
```

*Reference:* ChatGPT, Claude, WhatsApp, iMessage, Slack — all five show this pattern.

**P1.2: Always scroll to bottom on message send**

When the user sends a message (submit from InputBar), unconditionally scroll to bottom. Every reference app does this. It re-anchors the user's attention to the latest exchange.

Current implementation likely does this via the auto-scroll logic, but it should be an explicit `scrollTo({ top: scrollHeight, behavior: 'smooth' })` on send, not dependent on proximity detection.

### P2 — Preview Integration

**P2.1: Make preview collapsible on desktop**

Add a toggle to collapse the preview panel entirely, giving the conversation 100% width. The toggle should be a small button at the panel boundary (like VS Code's sidebar toggle).

```
┌──────────────────────────────────────────┬─┐
│ Chat (100% when collapsed)               │▶│  ← toggle
└──────────────────────────────────────────┴─┘

┌───────────────────────────┬──────────────┐
│ Chat 58%                  │◀│ Preview 42% │
└───────────────────────────┴──────────────┘
```

*Reference:* Claude (artifact panel can be closed, chat goes full-width).

*Rationale:* Early in the conversation (first few messages), there's nothing meaningful to preview. The preview becomes useful after the first draft appears (~15–25s). Let the user (or the system) decide when to show it.

**P2.2: Mobile preview as bottom sheet (keep current pattern, fix scroll)**

The current mobile approach (preview in a bottom sheet) is actually correct — it matches the "overlay, don't reflow" rule. The issue is scroll position preservation (addressed in P0.3). Keep the bottom sheet pattern.

### P3 — Polish

**P3.1: Add skeleton state for initial workspace load**

Before the session loads and the first AI message arrives, show a skeleton inside the thread area: 2–3 grey pill shapes (message bubble skeletons) with a subtle pulse animation. This prevents the empty state from feeling blank.

```
┌──────────────────────────────────┐
│                                  │
│   ┌──────────────────┐           │
│   │ ░░░░░░░░░░░░░░░░ │  ← skeleton bubble
│   │ ░░░░░░░░░░       │
│   └──────────────────┘           │
│                                  │
│   ┌────────────┐                 │
│   │ ░░░░░░░░░░ │  ← skeleton bubble
│   └────────────┘                 │
│                                  │
│──────────────────────────────────│
│ InputBar                         │
└──────────────────────────────────┘
```

*Reference:* Slack (skeleton messages on channel load).

**P3.2: Smooth transition from empty state to first message**

The current empty state (welcome icon + prompt) should fade out (150ms) while the first AI message fades in (200ms). No abrupt jump. Use `animate-in fade-in` from Tailwind + a state flag.

*Reference:* ChatGPT (first message appears smoothly, no blank-to-content jump).

**P3.3: Use `visualViewport` API for mobile keyboard resilience**

Add a `useVisualViewport` hook that listens to `window.visualViewport.resize` and adjusts the thread container height. This is more reliable than `dvh` on older iOS Safari.

```typescript
// Pseudocode
useEffect(() => {
  const vv = window.visualViewport;
  if (!vv) return;
  const onResize = () => {
    container.style.height = `${vv.height - headerHeight}px`;
  };
  vv.addEventListener('resize', onResize);
  return () => vv.removeEventListener('resize', onResize);
}, []);
```

*Reference:* ChatGPT (uses visualViewport for keyboard handling).

**P3.4: Reduce FlowHeader to single-row on all viewports**

After removing the step indicator (P0.1), ensure the header is always a single row:

```
Mobile:   [Logo]  "New Letter"  [Saved ✓]
Desktop:  [Logo]  "New Letter"  [Saved ✓]          [···] menu
```

Fixed height: `h-14` (56px). No wrapping, no second row, no conditional rows.

*Reference:* ChatGPT (single-row header), Claude (single-row header), WhatsApp (single-row header).

### Summary of recommendations

| ID | Change | Priority | Effort |
|---|---|---|---|
| P0.1 | Remove step indicator from header; show progress in-thread | P0 | Small |
| P0.2 | Flip column split to 58/42 (chat/preview) | P0 | Trivial |
| P0.3 | Preserve scroll position on mobile view toggle | P0 | Small |
| P1.1 | Add scroll-to-bottom FAB | P1 | Small |
| P1.2 | Explicit scroll-to-bottom on send | P1 | Trivial |
| P2.1 | Collapsible preview panel on desktop | P2 | Medium |
| P2.2 | Keep mobile bottom sheet, fix scroll (see P0.3) | P2 | — |
| P3.1 | Skeleton state for initial load | P3 | Small |
| P3.2 | Smooth empty-to-first-message transition | P3 | Small |
| P3.3 | `visualViewport` hook for keyboard resilience | P3 | Medium |
| P3.4 | Single-row header on all viewports | P3 | Small |

---

## 5. Open Questions

1. **Should the preview panel auto-open on first draft render (~15–25s)?**
   Currently the preview is always visible on desktop. An alternative: start with chat at 100% width, then animate the preview panel open when the first draft content appears. This would eliminate the "empty preview" phase. Needs user testing.

2. **Step indicator: remove entirely or move in-thread?**
   P0.1 recommends removing from the header. Should we add an in-thread progress card (Slack-style) at key transitions, or rely entirely on the route change (draft → review → checkout) as the progress signal?

3. **Preview panel width: fixed or user-resizable?**
   The recommendation is a fixed 42% for preview. Should users be able to drag the divider (like VS Code)? Adds complexity but some power users may want it.

4. **Mobile: bottom sheet vs. full-screen overlay for preview?**
   Current implementation uses an 80vh bottom sheet. An alternative is a full-screen overlay with a close button (like ChatGPT's mobile canvas). The bottom sheet lets users see the top of the conversation while previewing — that may be more useful for a drafting tool.

5. **Voice mode layout implications?**
   The InputBar has a voice recording mode with animated bars and a different control layout. Does the voice UI need its own layout audit, or does it follow the same rules (input bar stays at bottom, thread above)?

