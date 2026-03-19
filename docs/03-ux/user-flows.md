# User Flows

> **Status:** Canonical journey map for end-to-end user movement through the product.
> **Scope:** Flow order, branch points, and trust/clarity rules.
> Cross-reference: [`docs/03-ux/page-specifications.md`](page-specifications.md) for per-screen
> layout and content specs. [`docs/03-ux/mobile-patterns.md`](mobile-patterns.md) for responsive
> and touch behavior. [`docs/06-build-packs/frontend-build-pack.md`](../06-build-packs/frontend-build-pack.md)
> for the route map and component list. [`docs/08-guardrails/swiss-post-api-reference-map.md`](../08-guardrails/swiss-post-api-reference-map.md)
> for API-dependent journey claims around dispatch, references, and tracking.
> If this file and a more concrete route, contract, or state-machine doc disagree, the more concrete
> implementation doc wins for that specific detail.

## Primary UX model

Swiss Mail is a **guided drafting workspace**, not a novelty chatbot.

The default structure:
- **Primary panel** (left on desktop, full-width on mobile): guided conversation and form-like
  prompts
- **Secondary panel** (right on desktop, toggleable on mobile): live letter preview
- Users can tap or click a preview zone to directly edit that section
- The terminal flow is always: review → choose delivery → pay → send

## Main flow map

1. Marketing entry: user starts on `/`, `/how-it-works`, `/pricing`, `/templates`, or a
   `/use-cases/:slug` page
2. Draft start: user enters the app at `/draft/new`
3. Active drafting: system creates a draft at `/draft/:id`
4. Review: user confirms the final version at `/draft/:id/review`
5. Checkout: user pays at `/draft/:id/checkout`
6. Confirmation: user lands on `/draft/:id/confirmation`

Branch points:
- Template discovery can start from `/templates` or `/use-cases/:slug` before `/draft/new`
- Resume Draft Flow can return the user to `/draft/new`, `/draft/:id`, or `/resume/:token`
- Language Switch Mid-Flow is available inside `/draft/:id` without resetting draft state
- Check Letter Status Flow starts from `/status/:orderToken`
- Send Another Letter Flow restarts at `/draft/new` from `/draft/:id/confirmation`

---

## Core MVP journey

### Step 1 — Start

User arrives at `/draft/new`. Common entry paths are:
- Direct from `/`
- From `/how-it-works` or `/pricing`
- From a use-case CTA on `/templates` or `/use-cases/:slug`

They describe their letter in natural language — by typing or by voice. The system creates a
session and a draft record, then routes them into `/draft/:id`.

→ See [`docs/03-ux/page-specifications.md`](page-specifications.md) for the entry screen spec.  
→ See [Template Browsing Flow](#template-browsing-flow).

### Step 2 — Field extraction

The system extracts known fields (sender, recipient, subject, requested outcome, tone) and
identifies missing required fields. The user is not asked everything at once.

The AI follows a structured conversation state machine (see `page-specifications.md` §6.2 "Conversation Flow State Machine" for the canonical state definitions and example exchanges). The states are:

1. **`intent_detection`** — Understand what kind of letter (often resolved from `/draft/new` input)
2. **`recipient_collection`** — Get recipient name + address (never skipped)
3. **`sender_collection`** — Get sender name + address (auto-filled for returning users)
4. **`context_gathering`** — Get letter-specific details (dates, reference numbers, specifics)
5. **`draft_generation`** — AI produces the first full draft (this is the "wow moment")
6. **`refinement`** — User requests changes (can loop)
7. **`ready`** — Draft is complete, user can proceed to review

**Effortless UX rule:** The conversation must feel like the user is describing their situation to a knowledgeable friend, not filling out a multi-page form. The AI mirrors the user's input, extracts what it can, and asks only for what's missing — one primary gap at a time.

→ See [`docs/04-product/letter-generation.md`](../04-product/letter-generation.md) for the
extraction pipeline.

### Step 3 — Targeted follow-up

The system asks for missing information one primary gap at a time. Tightly coupled structured
subfields may be grouped only when splitting them would create more friction than clarity, such as
address blocks or compact date-choice inputs. The preview updates continuously as each field is
confirmed.

At this stage the user may:
- Resume an unfinished guest draft from `/draft/new` or `/resume/:token`
- Switch UI locale in the workspace header without losing draft state

→ See [Resume Draft Flow](#resume-draft-flow).  
→ See [Language Switch Mid-Flow](#language-switch-mid-flow).

### Step 4 — Draft complete

Once all required fields are present, a first full draft is generated and displayed in the preview.
This is the **emotional climax of the drafting experience** — the moment the user's situation
transforms into a real, professionally formatted letter. The first-draft reveal has its own
choreographed animation sequence (see `micro-interactions.md` §4.2 "First Draft Reveal Choreography").

The user can:
- Edit any zone directly by tapping it in the preview
- Request a revised tone or wording from the conversation panel (see `page-specifications.md` §6.2 "Revision and Iteration UX")
- Add attachments (PDF/PNG/JPG) after the first draft exists
- Add a signature image or type their signature
- Undo AI revisions with `Cmd/Ctrl + Z` (desktop) or the "↩ Undo" button (mobile) — reverts to previous draft version

**Transition to review:** The "Continue to Review" button in the `<StatusStrip>` enables when the
letter has a body, a recipient name, and a sender name. See `page-specifications.md` §6.4
"Draft-to-Review Transition" for the exact enabled conditions and visual states.

→ File limits: [`docs/04-product/file-handling.md`](../04-product/file-handling.md)  
→ Signature options: [`docs/04-product/signatures-and-attachments.md`](../04-product/signatures-and-attachments.md)

### Step 5 — Review (`/draft/:id/review`)

User sees the complete draft in its final rendered form. They confirm the recipient address and
delivery type (standard or registered). This is the last chance to edit before committing.

The system performs:
- Field completeness check
- Address validation (two tiers — see `docs/04-product/postal-dispatch.md`):
  - **Hard block:** Non-Swiss address (country ≠ Switzerland) — cannot proceed until corrected
  - **Soft validation:** Swiss PLZ format (4 digits) and city-name mismatch — warnings shown, not blocking
- Page count check (max 5 pages)
- Rendered version hash is recorded

If the recipient address cannot be fully validated, the review step must show a prominent warning
with the exact postal address and require an explicit "send to this address anyway" confirmation
before the user can continue to checkout. The warning is cautionary, not accusatory: prevent silent
mistakes without making the user feel blamed.

→ Address validation behavior: [`docs/04-product/postal-dispatch.md`](../04-product/postal-dispatch.md)

### Step 6 — Delivery selection

User chooses standard or registered delivery.
The price summary updates to reflect the choice.
Total price in CHF must be visible and clearly labeled before proceeding.

### Step 7 — Checkout (`/draft/:id/checkout`)

User enters their email address (required) and payment details (Stripe). Email is the only
dependable contact handle for confirmations and support.

There is no separate signup step. Email collection happens within the checkout context.

→ Email policy: [`docs/04-product/auth-billing-accounts.md`](../04-product/auth-billing-accounts.md)  

### Step 8 — Dispatch

On payment confirmation:
1. Backend authorizes or captures payment (depending on the locked capture model)
2. Renders the final PDF artifact
3. Submits the dispatch request through the adapter
4. Transitions through the canonical dispatch state machine

### Step 9 — Confirmation (`/draft/:id/confirmation`)

User sees the confirmation screen with:
- A real provider reference number (if the provider issued one)
- A clear distinction between "reference" and "tracking" where applicable
- The email address the confirmation was sent to

**Never show fake progress.** If provider acceptance is pending, the status must say so.

From here the user can check letter status later through `/status/:orderToken` and start again at
`/draft/new`.

→ Tracking rules: [`docs/04-product/postal-dispatch.md`](../04-product/postal-dispatch.md)  
→ See [Check Letter Status Flow (Returning User)](#check-letter-status-flow-returning-user).  
→ See [Send Another Letter Flow](#send-another-letter-flow).

---

## Resume Draft Flow

Flow:
1. User closes browser mid-draft
2. Returns to the Swiss Mail homepage (`/`) within the session TTL (configurable — see `docs/08-guardrails/open-decisions.md`)
3. Frontend checks `GET /api/sessions/current` using the HttpOnly session cookie
4. If active draft found: banner appears on `/draft/new`: "You have an unfinished letter.
   [Continue →] [Start fresh]"
5. "Continue" → navigates to `/draft/:id` with full state restored
6. "Start fresh" → creates new session; old draft remains accessible via direct URL
7. If session TTL expired: no banner, clean start
8. Alternative: user clicks resume link from email → `/resume/:token` → validates → redirects to
   `/draft/:id`

Guest drafts remain recoverable for the configured session TTL. After that duration, the product should present a clean
start rather than implying data can still be restored. The exact TTL value is an open decision — do not hardcode a specific duration.

## Language Switch Mid-Flow

Flow:
1. User is in workspace with de-CH UI, writing a French letter
2. User clicks language selector in header → picks "FR"
3. UI re-renders in French: labels, buttons, and navigation update
4. Conversation history stays in its original language; past messages are not re-translated
5. The AI's next message uses the new locale
6. Letter content is not automatically translated; user must request translation explicitly
7. Draft state is preserved across the language switch with no data loss

## Send Another Letter Flow

Flow:
1. On confirmation page, user taps "Send another letter →"
2. New session created
3. If the device has approved locally saved sender details, sender address is auto-filled
4. User goes directly to `/draft/new` with sender details pre-populated
5. Template cards and intent capture proceed as normal

## Check Letter Status Flow (Returning User)

Flow:
1. User receives **immediate** confirmation email with a secure "Order Status" link (separate from draft resume link).
2. Clicks link → `/status/:orderToken` → shows current dispatch status and receipt.
3. This link is valid for 90 days (configurable), independent of the original drafting session TTL (configurable — see `docs/08-guardrails/open-decisions.md`).
4. Status shown using canonical `DispatchState` values (from `system-contracts.md` §3.3):
   - `queued` → "Your letter is queued for dispatch"
   - `submitted` → "Submitted for dispatch"
   - `accepted` → "Accepted for dispatch" (letter is in provider's possession — not yet delivered)
   - `rejected` → "Dispatch was rejected" (with next steps)
   - `unknown` → "Status is being confirmed" (honest ambiguity — never collapse to success)
   - `reconciled` → "Status confirmed: [outcome]"
4. "In transit" and "Delivered" are **not** canonical states. Do not show these labels.
   Further delivery progress (physical transit, delivery confirmation) is entirely provider-dependent
   and may not be available — see `docs/08-guardrails/provider-certainties.md`.
5. Reference number is shown with a tooltip: "This is a provider reference number. It is not a tracking link unless your delivery type supports tracking."

## Template Browsing Flow

Flow:
1. User lands on homepage, scrolls to the use-case section
2. Sees "View all templates →" link → navigates to `/templates`
3. Browses a filterable grid of template cards
4. Taps a card → navigates to `/use-cases/:slug` with a detailed landing page and sample letter
5. Taps "Draft my [type] letter" → `/draft/new?useCase=:slug` → workspace starts with pre-loaded
   context

---

## Mobile-first rules

- Primary actions (continue, submit, pay) reachable with one thumb
- Preview and conversation panels toggle on small screens — only one is active at a time
- No dense multi-column layout at any step of the payment or confirmation flow
- Voice/speech input must not block or interfere with manual correction

→ Full mobile pattern details: [`docs/03-ux/mobile-patterns.md`](mobile-patterns.md)

---

## Trust and clarity rules

| Rule | Behavior |
|---|---|
| No fake progress | Never show provider success before backend confirmation |
| No inflated reference labels | Never label a reference as "tracking" unless it supports tracking |
| No hidden costs | Price summary visible before the user commits to payment |
| No silent AI rewrites | AI must not rewrite user-confirmed facts after review |
| Ambiguous state stays ambiguous | If dispatch state is uncertain, tell the user so |

## Emotional Arc — The Feeling at Each Step

This table defines the emotional state we're designing for at each stage. Every micro-interaction, copy choice, and animation decision should serve this arc. If a design decision conflicts with the target emotion, the target emotion wins.

| Step | Route | Target emotion | The user should think… | Anti-pattern (breaks the arc) |
|---|---|---|---|---|
| Marketing | `/`, `/how-it-works` | **Intrigued, curious** | "This looks easy. Maybe I should try it." | Showing complex pricing tables or feature matrices that feel like enterprise software |
| Draft entry | `/draft/new` | **Unburdened, empowered** | "I just tell it what I need? That's it?" | Showing a multi-field form or requiring account creation |
| Active drafting | `/draft/:id` | **Impressed, in flow** | "It understood me. This is actually good." | Slow AI responses, layout shifts, losing typed content |
| First draft reveal | (within `/draft/:id`) | **Delighted, amazed** | "Wow — that looks like a real letter. Already." | Dumping all content at once with no choreography, or showing it in a text box instead of a formatted preview |
| Refinement | (within `/draft/:id`) | **In control, creative** | "I can tweak this easily. It keeps getting better." | Requiring re-generation from scratch, losing edits, or making revisions feel laborious |
| Review | `/draft/:id/review` | **Confident, calm** | "Everything looks right. I'm ready." | Showing scary warnings, requiring too many confirmations, or making editing difficult from this page |
| Checkout | `/draft/:id/checkout` | **Trusting, decisive** | "Fair price. Just need to pay and I'm done." | Hidden fees, surprise price changes, or complex payment flows |
| Confirmation | `/draft/:id/confirmation` | **Relieved, accomplished** | "Done. That was so much easier than I expected." | Claiming delivery when only dispatch is submitted, or showing a generic "thank you" without status |
| Return/status check | `/status/:orderToken` | **Reassured, informed** | "My letter is being handled. I can see what's happening." | Showing stale data, fake tracking, or "status unavailable" without explanation |

---

## Locked UX clarifications

- Draft questioning cadence: one primary gap at a time, with tightly coupled structured inputs
  grouped only when that reduces friction
- Attachment timing: uploads begin only after a draft exists and remain editable through review
- Non-legal-service disclaimer: calm informational copy before checkout, explicit acknowledgment at
  checkout
