# episto — Page Specifications — Part 3

> Split from [page-specifications.md](page-specifications.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- 6. Draft Workspace (`/draft/:id`)

## 6. Draft Workspace (`/draft/:id`)

### Components

#### 6.1 `<AppHeader>` (workspace)

- Logo (small, left) — tap to confirm/discard dialog if unsaved work
- `<StepIndicator>` — centre: step dots with labels ("Draft · Review · Pay · Done")
- Price estimate — right: `text-sm` `{formattedEstimatedTotal}` (muted, updates as content changes)
- No explicit save button. Draft state auto-saves continuously; only warn if the user is about to leave with unsent local input.
- Workspace menu includes an obvious `Start new letter` action that routes to `/draft/new`; if another unfinished draft exists, the recovery card lets the user continue or truly start fresh. The confirmation CTA should read `Start new letter`, not repeat `Start fresh`, even though it uses the explicit fresh-start route under the hood.
- Workspace menu also includes the theme toggle so the user can switch appearance without leaving the flow.

#### Auto-Save Indicator

Draft state auto-saves on every meaningful change (message sent, field edited, zone updated). The user must feel confident their work is safe without being interrupted by save confirmations.

**Visual:** A small save status indicator in the header, right-aligned, `text-xs text-tertiary`:

- Default (saved): `"Saved"` with a subtle `Check` icon (12px). Appears 1s after the last change, fades in 200ms.
- Saving: `"Saving…"` with a `Loader2` icon (12px, `animate-spin`). Appears immediately when a save is triggered.
- Save failed: `"Not saved"` with `AlertCircle` icon in `text-warning`. Persists until save succeeds or user retries.
- Offline: `"Offline — recent changes are not saved yet"` in `text-warning`.

**Transitions:** The save indicator is the only element in the header that changes state during active work. It must transition smoothly (opacity 0→1, 200ms) and never jump or shift layout.

**Rule:** Never show a "Save" button. Auto-save is the only save mechanism. If auto-save fails silently, the user will lose work — which violates the core promise. The failed state must be visible and actionable.

#### Step Indicator

See [`chat-ui-audit.md` § Step Indicator — Locked Design](chat-ui-audit.md#step-indicator--locked-design) for the canonical specification. The indicator appears in FlowHeader across all draft flow pages, using compact mode on mobile and the full connected rail on desktop.

#### 6.2 `<ConversationPanel>`

Scrollable, fills available height.

**Message types:**

- AI message: avatar dot (`primary` colour), message in `<Card>` rounded, `text-sm`
- User message: right-aligned, `primary-light` bg
- System message: centred, `text-tertiary text-xs` (e.g. "Letter type detected: Cancellation")
- Field extraction card: `<FieldExtractionCard>` — shows extracted fields as key-value pairs with edit icons

**Scroll model:**

- The conversation thread is the only scroll container in the drafting workspace.
- The header, step strip, preview trigger, and composer remain fixed in place while the thread is shorter than the viewport.
- Auto-scroll-to-bottom is allowed only while the user is already near the bottom. Once the user scrolls upward, new AI output must not steal scroll position.
- Do not make the entire workspace column scroll as one page. That creates dead movement and makes the composer feel unstable.

**Empty-thread layout:**

- The empty state sits in the lower half of the workspace, visually tied to the composer.
- Do not vertically centre the empty state in the full viewport with a large dead zone above and below.
- The empty state is a compact starter card: icon, short title, short prompt, one supporting hint. It introduces the task; it does not compete with the composer.

**Input area** (pinned at bottom):

- `<Textarea>` auto-resize, `min-h-[48px] max-h-[120px]`
- Send button `<Button variant="ghost" size="icon">` with `Send` icon, or `Ctrl+Enter` / `Cmd+Enter`
- Microphone button `<Button variant="ghost" size="icon">` with `Mic` icon
- On prompt-first drafting screens, the step trigger sits inline with the composer controls as an icon button immediately left of attachments; on non-prompt screens it remains in the bottom dock
- Prompt-first drafting screens expose a single compact shortcut row above the composer: one manual-entry badge, a few prompt shortcuts, and a `More` action that opens a compact bottom sheet of additional shortcuts
- The shortcut row must stay inside the composer width. If chips exceed the available width, the row scrolls horizontally inside the composer instead of pushing the app wider
- If the user already typed text, selecting a prompt shortcut appends the shortcut into the input instead of sending it immediately and discarding the typed text
- Prompt-first drafting screens keep the bottom dock visible at all times, including while the composer is focused. The dock CTA may be disabled or warning-styled when the next step is not yet available, but it must not disappear on focus.
- Prompt shortcuts must be capability-aware: empty-body states show only substance/content prompts, while wording/formatting/refinement prompts appear only after body content exists.
- When the content step is auto-generating the first body draft from already confirmed context, the step opens behind a blocking loading dialog. The dialog closes only once body content exists; if generation fails, it switches to a recovery hero with a refresh action and a disabled support placeholder.
- Drafting headings, labels, helper text, and buttons follow sentence case per `docs/02-brand/voice-and-tone.md`; avoid title case and all-caps UI copy

**Composer rules:**

- The composer is a single surface. Voice encouragement, textarea, mic affordance, and send action belong to one visual object.
- On an empty draft, voice gets the strongest emphasis, but typing is immediately available in the same composer without a separate mode-selection screen.
- Do not stack a separate dictation promo/banner above the textarea once the composer is visible. That reads like an ad bolted onto the chat input.
- In typing mode, the mic remains clearly visible inside the composer as a secondary but prominent control. Dictation stays discoverable after the user chooses the keyboard.
- Placeholder copy should explicitly support both paths, for example "Type or dictate…", so the voice path stays mentally available.

**Preview separation:**

- On mobile, preview is a separate top-level toggle beside "Write", not a floating control inside or around the composer.
- The preview toggle must remain visually distinct from the composer and from the step indicator.
- Preview access should not compete for space with dictation copy, the textarea, or the send button.
- This separation is required to avoid turning the composer into a crowded toolbar.

**`<QuickReplyChips>`:**

- Row of `<Badge variant="outline">` chips with suggested responses
- Appear after AI asks a question
- Clicking a chip fills the input and auto-submits

#### Conversation Flow State Machine

The AI conversation follows a structured state machine — not free-form chat. Each state defines what the AI asks, what it extracts, and what quick-reply chips appear. An implementing LLM must not invent a generic chatbot; the conversation is a guided form-killer.

**States:**

| State                  | AI's Goal                      | Typical AI Message Pattern                                               | Quick-Reply Chips                                                |
| ---------------------- | ------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `intent_detection`     | Understand what kind of letter | "Got it — [mirror user input]. I'll need a few details."                 | Use-case chips if intent unclear                                 |
| `recipient_collection` | Get recipient name + address   | "Who is this letter addressed to? **Name and address?**"                 | "I have it ready", "I'm not sure"                                |
| `sender_collection`    | Get sender name + address      | "And your details — **your name and address?**"                          | "Same as last time" (if returning user), "Enter manually"        |
| `context_gathering`    | Get letter-specific details    | Varies by use case: dates, reference numbers, specifics                  | Contextual suggestions                                           |
| `draft_generation`     | AI produces first draft        | "I've drafted your letter. Take a look — anything you'd like to change?" | "Looks good", "More formal", "Change the tone", "Edit [section]" |
| `refinement`           | User requests changes          | "I've updated [section]. Here's the revised version."                    | "Looks good now", "Change something else"                        |
| `ready`                | Draft is complete              | "Your letter is ready to review when you are."                           | "Continue to review"                                             |

**Transition rules:**

- States progress linearly but can loop (`refinement` → `refinement`).
- The AI never skips `recipient_collection` — a letter always has a recipient.
- `sender_collection` can be auto-filled if the user has sent a letter before (account context).
- The user can always type free-form input at any state — the AI must handle off-script responses gracefully (e.g., "Actually, make it a complaint instead" during `context_gathering` → loops back to `intent_detection`).
- System messages announce state transitions: "Letter type: Cancellation" → "Recipient added" → "Draft ready".

**Example conversation (lease cancellation via use-case entry):**

```
AI:     Let's draft your lease cancellation letter. To get started:
        **what's the landlord's name and address?**

        [I have it ready] [I'm not sure of the address]

User:   Müller Immobilien AG, Bahnhofstrasse 42, 8001 Zürich

AI:     ✓ Recipient: Müller Immobilien AG, Bahnhofstrasse 42, 8001 Zürich

        Now, **your name and address** for the sender details?

        [Enter manually]

User:   Anna Meier, Seestrasse 15, 8002 Zürich

AI:     ✓ Sender: Anna Meier, Seestrasse 15, 8002 Zürich

        A few more details for the letter:
        **When should the lease end?** (If your contract specifies a notice period,
        the letter will reference it.)

        [End of next month] [Specific date…] [I'm not sure]

User:   [taps "End of next month"]

AI:     ✓ Lease end: [calculated date]

        **Is there anything specific you want to mention?** For example, a deposit
        refund request, key return arrangements, or special contract clauses.

        [No, keep it standard] [Yes, I want to add details]

User:   Please mention I want the deposit returned to my bank account.

        [The letter preview on the right now populates with the full draft]

AI:     Your letter is ready to review. I've included:
        • Formal lease cancellation notice
        • Reference to the standard notice period
        • Deposit return request

        Take a look at the preview — anything you'd like to change?

        [Looks good] [More formal] [Change something] [Continue to review]
```

**Anti-hallucination warning:** The conversation examples above are illustrative. The actual AI prompts and response formatting are defined in `docs/04-product/letter-generation.md` and `docs/04-product/ai-provider-and-prompts.md`. Do not implement conversation logic from these UX examples alone — they show the user-facing experience, not the backend prompt engineering.

#### Smart Defaults and Prefilling

The product should feel like it already knows you. Every default should feel like a shortcut, not a guess.

**Date auto-fill:**

- The letter date defaults to today's date, formatted per the active locale (e.g., "15. März 2026" for de-CH, "15 mars 2026" for fr-CH).
- The date appears pre-filled in the preview from the moment the first draft is generated.
- User can change the date via ZoneEditor at any time. The AI does NOT ask for the date in conversation unless the use case requires a specific date (e.g., "effective as of…").

**Locale-aware defaults:**

- The UI locale determines default letter language. A user browsing in `de-CH` gets a German letter draft by default.
- The AI should confirm the language if the user's input language doesn't match their locale: "You wrote in English, but your locale is set to German. Should I draft the letter in English or German?"
- Salutation and closing conventions follow Swiss norms per locale:
  - `de-CH`: "Sehr geehrte Damen und Herren" / "Freundliche Grüsse"
  - `fr-CH`: "Madame, Monsieur" / "Veuillez agréer, Madame, Monsieur, mes salutations distinguées"
  - `it-CH`: "Gentili Signore e Signori" / "Distinti saluti"
  - `en-CH`: "Dear Sir or Madam" / "Yours faithfully"

**Returning session prefilling (same guest session only):**

- If the user resumes the same guest session by cookie or resume link:
  - Sender name + address already captured in that session are pre-filled in the `<FieldExtractionCard>`.
  - The AI offers: "I still have your sender details — **Anna Meier, Seestrasse 15, 8002 Zürich**. Is that still correct?"
  - Quick-reply chip: "That's correct" / "Update my details"
- For first-time users or brand-new guest sessions: no prefilling. The AI asks for sender details normally.
- **Implementation note:** Prefilling from prior sessions requires a server-side lookup. Do not store sender details in `localStorage` or cookies — this is PII.

**Recipient search assistance:**

- Assisted search is for **companies / registered organizations only**.
- For company recipients, the UI may prefill the organization name from the AI step and offer an
  official registry-backed lookup before the user falls back to manual address entry.
- Current staging implementation uses the official company registry to find the organization and
  legal seat only; the user must still confirm the mailing address manually before continuing.
- Official company lookup must run through episto server-side infrastructure (adapter + internal
  proxy where needed). Do not expose registry credentials or make the browser call the registry
  directly.
- For private-person recipients, do not query consumer directories or general web search. Capture
  the address manually and then run the normal soft validation flow.
- Manual entry remains available even for companies because official registry data and real mailing
  destinations do not always match perfectly.

**Use-case context pre-loading:**

- When a user arrives via a use-case landing page (e.g., `/use-cases/lease-cancellation`), the conversation starts with that context pre-loaded.
- The AI's first message references the use case: "Let's draft your lease cancellation letter…" (not a generic "How can I help?").
- Use-case context also pre-selects relevant quick-reply chips and adjusts the conversation state machine's question ordering (e.g., for lease cancellation, asking for the landlord first makes more sense than asking for a generic "recipient").

#### AI Confusion and Fallback Recovery

The AI will sometimes not understand the user's intent. This must not be a dead end.

**Detection heuristics (backend-defined, UX-visible):**

- AI confidence score below threshold → fallback path
- User repeats the same message twice → AI wasn't helpful
- User sends "?" or "help" or "I don't understand" → explicit confusion signal

**Fallback UX — "I'm not sure I understood":**
When the AI can't parse intent or the request is outside scope:

```
AI:     I'm not sure I understood that. Let me try a different approach.

        What kind of letter do you need?
        [Cancel a contract] [Send a formal complaint] [Write a notice] [Something else]
```

The quick-reply chips provide structured recovery. "Something else" opens a free-text clarification prompt.

**Fallback UX — "This is outside what I can help with":**
If the user requests something genuinely outside scope (e.g., "Write me a wedding speech"):

```
AI:     I'm designed to help with formal Swiss correspondence —
        things like contract cancellations, formal notices, and official complaints.

        Would you like to start one of these instead?
        [Cancel a contract] [Send a formal complaint] [Write a notice]
```

No "Sorry, I can't do that" without an alternative. Always offer a constructive next step.

**Fallback UX — repeated AI failures:**
If the AI fails to respond 3 times in a row (backend errors):

- Show `<ErrorBanner>` with: "We're having trouble connecting. Your draft is saved."
- Switch conversation input to a simple form mode: structured fields for sender, recipient, subject, body — a manual fallback that lets the user complete the letter without AI assistance.
- Show this gracefully: "While we reconnect, you can continue filling in your letter details manually."

**Critical rules:**

- NEVER show a blank conversation with no explanation.
- NEVER say "An error occurred" without saying what the user can do.
- NEVER block the entire workspace because the AI is down — the manual fallback ensures the user can always finish.

#### Revision and Iteration UX

After the first draft, users often want to refine. This is where the "effortless" bar is set — revisions must feel as natural as the initial drafting.

**Revision via conversation:**

- User types: "Make it more formal" or "The tone is too aggressive" or "Add a paragraph about the deposit"
- AI responds with a brief acknowledgment + the change: "I've made the tone more formal. Here's the updated version."
- The letter preview updates in real-time as the AI generates the revision.
- Changed sections in the preview briefly highlight with a `primary-light` background pulse (300ms fade-in, 1s hold, 300ms fade-out) so the user can see what changed.

**Revision via ZoneEditor:**

- User clicks/taps a zone in the letter preview (e.g., the body paragraph).
- ZoneEditor opens (popover on desktop, Sheet on mobile) with an editable text field pre-filled with the current content.
- User edits directly and confirms.
- The conversation panel receives a system message: `"Body edited manually"` — so the AI knows the user changed something and won't overwrite it in subsequent revisions.
- The AI acknowledges: "Noted — I'll keep your changes to the body."

**Undo for AI revisions:**

- Each AI revision creates a draft version (stored as a lightweight snapshot — not full document copies).
- `Cmd/Ctrl + Z` in the workspace reverts to the previous version.
- A `<Toast>` appears: "Revision undone" with an "Redo" action link.
- Maximum undo depth: 10 versions per session.
- Mobile: undo is available via a small "↩ Undo" button in the conversation panel after each AI revision.

**What NOT to do:**

- Do not show a diff view by default — it's cognitive overhead. The highlight pulse is sufficient.
- Do not require the user to "accept" changes in a merge-conflict style UI.
- Do not lose the conversation context when the user edits via ZoneEditor — the AI maintains awareness.

**`<FieldExtractionCard>`:**

- Shows what the system has understood so far
- Fields: Sender, Recipient, Subject, Date, etc.
- Each field: label + value + pencil icon (opens inline edit or jumps to ZoneEditor)
- Missing fields: shown as `text-tertiary` "[not yet provided]" with `AlertCircle` icon

#### 6.3 `<LetterPreview>`

`paper` background (`#FAFAF7`), `shadow-paper` elevation, A4 proportions (desktop: actual width constrained to ~680px; mobile: full-width in sheet).

**Layout within preview:**

- Sender block (top-left, above the recipient block, matching Swiss window-envelope conventions)
- Recipient block (right-aligned in the preview)
- Date
- Subject line (`font-semibold`)
- Body paragraphs (serif, `text-sm`, line-height generous)
- Closing / salutation
- Signature placeholder
- Attachment list (bottom, `text-xs text-secondary`)

**Page count indicator:**

- Bottom-right of the preview area, outside the paper card: `text-xs text-tertiary` "Page 1 of 1" (or "Page 1 of N").
- Updates in real-time as content changes (e.g., body text grows past one page).
- On desktop: visible at all times below the paper card.
- On mobile (in sheet): visible at the bottom of the sheet, above the close/drag handle.
- If multi-page: small page navigation arrows (`ChevronLeft` / `ChevronRight`, 16px) appear beside the indicator. Desktop scrolls the full letter; mobile pages through individual pages in the sheet (see `micro-interactions.md` §4.2 "Multi-Page Preview Transitions").
- **Max page limit:** The system enforces a maximum of 5 pages. If the content exceeds this, show a warning below the page indicator: `text-xs text-warning` "Maximum 5 pages. Please shorten your letter." The AI should proactively mention this in conversation if the draft is approaching the limit.

**Blank template outline (pre-draft):**
Before the AI generates the first draft, the preview shows a blank template outline rather than an empty white rectangle. This communicates "your letter will go here" and reinforces the paper metaphor:

- Faint dotted zone outlines where sender, recipient, date, subject, body, and signature will appear.
- Zone labels in `text-tertiary text-xs`: "Sender", "Recipient", "Date", "Subject", "Body", "Signature" — positioned at the top-left of each zone.
- Same `paper` background and `shadow-paper` elevation as the populated state.
- No animation — this is a static placeholder. The animation happens when content fills in (see "First Draft Reveal Choreography" in `micro-interactions.md`).

**`<ZoneEditor>` interaction:**

- Each zone (sender, recipient, body, etc.) is hoverable on desktop
- Hover: subtle `primary-light` highlight + pencil icon overlay
- Click: opens inline edit popover or Sheet with field inputs
- On mobile: zones are tap targets; tap opens edit Sheet

**Real-time updates:** Letter re-renders as fields are extracted from conversation. Smooth transition, no jarring reflows.

#### Swiss Address Validation UX

Address validation is critical for dispatch — an invalid Swiss address means a wasted letter and wasted money. But validation must not feel like a bureaucratic checkpoint.

**When validation triggers:**

- Postal code (PLZ) validation fires on `blur` of the postal code field, NOT on every keystroke.
- Full address validation fires when the user finishes editing an address zone (closes the ZoneEditor popover/sheet), NOT during typing.
- For company search results, the same validation still runs after selection or confirmation. Search
  is an assistive shortcut, not a guarantee that the final mailing address is correct.
- The AI conversation collects addresses organically. When the AI parses a complete address from conversation, it validates in the background before confirming to the user.

**PLZ soft validation:**

- Valid Swiss PLZ: 1000–9999 (4 digits). If the entered value is outside this range or non-numeric, show immediately on blur: `text-error text-xs` "Swiss postal codes are 4 digits (e.g. 8001)" below the field.
- PLZ-to-city lookup: When a valid 4-digit PLZ is entered, the city field auto-fills if empty. If the city field already has a value that doesn't match, show a soft warning: `text-warning text-xs` "Postal code {plz} is usually associated with {expectedCity}" — but allow the user to keep their value. Some PLZ codes map to multiple cities.
- PLZ-to-city lookup comes from a static dataset (Swiss Post PLZ directory), NOT an API call. This means it works offline and is instant.
- **Auto-fill delight:** When the city auto-fills from PLZ, the city field briefly highlights with `bg-success/10` (100ms fade-in, 300ms hold, 200ms fade-out) and the field value appears with a subtle typing animation (characters appear left-to-right over 200ms). This creates a "the system is smart" moment. In `prefers-reduced-motion` mode, the city appears instantly with no highlight.

**Address completeness in the AI conversation:**
When the AI collects an address via conversation, it should confirm what it understood:

> "Got it — the recipient is:\n**Muster AG**\n**Bahnhofstrasse 10**\n**8001 Zürich**\nDoes that look right?"

This confirmation gives the user a chance to catch typos before they reach the review page. The AI should NOT silently swallow addresses.

**Recipient address outside Switzerland:**
episto dispatches physical letters within Switzerland. If the AI detects a non-Swiss address (country ≠ Switzerland, PLZ > 4 digits, or explicit country mention), it should inform the user: "Currently, episto can only send letters to Swiss addresses. For international delivery, download the final PDF and use your own international mailing channel." This is a hard block — the system cannot proceed with a non-Swiss recipient.

**Address formatting in preview:**
Swiss letter formatting follows specific conventions. The preview must render addresses as:

```
Herr / Frau [FirstName] [LastName]     (salutation line — optional)
[Company name]                         (optional, for business letters)
[Street] [Number]
[PLZ] [City]
```

No "Switzerland" line for domestic mail. No comma between street and number. PLZ always before city, no separator.

#### Session Save-via-Email Flow

Guest sessions expire (duration configurable, see `open-decisions.md`). The `<SessionExpiryBanner>` warns users and offers the option to save their session via email. This is the ONLY guest persistence mechanism — there is no account, no password.

**Banner appearance timeline:**

1. **Warning state** (configurable threshold, e.g. 1 hour remaining): `<SessionExpiryBanner>` slides in below the app header. Single line: "⏱ Your session expires in {timeRemaining}. [Save via email]". Dismissible (`X` button). `bg-warning/10`, `border-warning/20`.
2. **Critical state** (configurable threshold, e.g. 5 minutes remaining): Banner becomes non-dismissible, two lines:
   - Line 1: "⚠️ Your session expires soon."
   - Line 2: Email input + "Save" button, stacked full-width.

**The email save flow:**

1. User enters email address in the banner's inline input field.
2. User taps "Save" → button shows spinner (loading state).
3. Backend creates a `resume_token` and sends an email with a link: `{baseUrl}/resume/{token}`.
4. On success: banner changes to `bg-success/10` with `Check` icon: "Saved! We sent a resume link to {email}." Dismissible.
5. On failure (invalid email, send failure): banner stays, shows error below input: "Couldn't send the link — check your email address and try again."

**What the resume email contains:**

- Subject: "Your episto letter draft — resume link"
- Body: brief explanation + prominent "Resume your letter" CTA button linking to `/resume/{token}`
- Expiry note: "This link expires when your session expires ({expiryDate})."
- NOT a full copy of the draft — just a link. Draft data stays server-side.

**Resume page (`/resume/:token`) behavior:**

- Token valid + session active: redirect to `/draft/:id` (the original workspace) silently.
- Token valid + session expired but restorable: show "Welcome back! We've restored your draft." and redirect.
- Token valid + session expired and unrestorable: show "This session has expired and can't be restored. [Start a new letter]".
- Token invalid: 404 page.
- Token already used for a completed letter: redirect to `/status/:orderToken` when an order-access token exists.

**Critical rules:**

- The email input must NOT be repurposed to create an account. This is explicitly a session-save mechanism.
- The resume link must work on a different device (tablet → phone → desktop).
- No "sign up" nudge appears in the session save flow.
- The token is session-scoped and time-limited, not single-use. It always restores the same active draft while the guest session remains valid.

#### 6.4 `<StatusStrip>` (desktop)

Pinned at bottom:

- Left: current step label
- Centre: `<DeliverySelector>` — toggle between Standard / Registered with price delta
- Right: `<PriceSummary>` — running total `{formattedEstimatedTotal}` + "Continue to Review" → `/draft/:id/review`

Mobile: `<StatusStrip>` collapses to a minimal bar. "Continue" becomes a FAB or sticky bottom button.

#### Price Estimate Timing and Behavior

The price estimate in the header and `<StatusStrip>` is one of the most trust-critical UI elements. It must appear early, update transparently, and never surprise the user at checkout.

**When the price first appears:**

- The price estimate appears in the `<AppHeader>` as soon as the session is created — even before the first draft. At this point, it shows the base price: `"From {formattedBasePrice}"` in `text-tertiary text-xs`.
- The "From" prefix communicates that the final price depends on page count, delivery type, and attachments.

**How the price updates:**

- When the first draft is generated and page count is known: the price updates to `"{formattedEstimatedTotal}"` (dropping the "From" prefix). The number animates with a brief crossfade (opacity 0→1, 150ms) — see `micro-interactions.md` §4.8 for pricing animation.
- When the user toggles delivery type (Standard ↔ Registered): the price updates immediately with the same crossfade.
- When attachments are added/removed: the price updates to reflect the per-page attachment cost.
- When the body changes significantly (page count changes): the price updates on next auto-save.

**Price formatting rules:**

- Always format prices like `CHF 6.90` — never rounded, never without decimals.
- Use `{formattedEstimatedTotal}` from the pricing service — never compute in the UI.
- If the pricing service is unavailable: show `"Price unavailable"` in `text-warning` — never show CHF 0.00 or a stale cached price.

**Mobile:** The price estimate in the header is condensed to just `"{formattedEstimatedTotal}"` (no "From" prefix even early on, to save space). The full itemized breakdown appears in the `<StatusStrip>` bottom bar.

#### Draft-to-Review Transition

The "Continue to Review" button in `<StatusStrip>` (or sticky bottom button on mobile) is the gateway to the review step. Its availability communicates "your letter is ready enough."

**Enabled conditions** (ALL must be true):

1. Letter body has content (AI has generated at least one draft)
2. Recipient name is present (may be incomplete — address can be partial)
3. Sender name is present (may be incomplete — address can be partial)
4. No rendering failure is currently active

**Visual states:**

- **Disabled** (conditions not met): Muted appearance (`opacity-50`, `cursor-not-allowed`). Tooltip on hover/focus: "Complete your letter details to continue" — never just "Disabled" or no explanation.
- **Enabled** (conditions met): Full `primary` appearance. Subtle entrance animation — the button transitions from disabled to enabled with a 300ms ease-out opacity + color change, so the user notices it becoming available without being startled.
- **Ready + nudge** (enabled for >5s with no user action): A single gentle pulse animation (scale 1→1.02→1, 600ms, once) to draw attention without being aggressive. Only triggers once per session.

**What "Continue to Review" does:**

1. Triggers a final render of the current draft content.
2. Shows a brief loading state (button spinner, 0.5–2s typically).
3. Navigates to `/draft/:id/review`.
4. If rendering fails: stays on workspace, shows `<ErrorBanner>` "We couldn't prepare your preview. Your content is saved — try again."

**Mobile:** The sticky bottom button spans full width with safe-area padding. Same enabled/disabled logic. Same nudge animation.

---

## 6. Draft Workspace (`/draft/:id`)

### Loading States

- Initial load: `<Skeleton>` blocks in conversation panel and preview panel
- AI response pending: typing indicator (3-dot animation) in conversation panel
- Preview re-render: subtle shimmer on preview card, no full skeleton re-render
- Field extraction: individual field slots show `<Skeleton>` while updating

## 6. Draft Workspace (`/draft/:id`)

### Error States

| Error family        | Display                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| AI response failure | `<ErrorBanner>` in conversation panel: "Couldn't get a response. Try again." with retry button              |
| Session expired     | `<Dialog>` "Your session has expired. Start a new letter or use your resume link." No post-expiry save flow |
| Network offline     | `<ErrorBanner>` (top of page): "You're offline. Recent changes are not saved yet."                          |
| Rendering failure   | Warning in preview area: "Preview unavailable — your content is saved."                                     |

## 6. Draft Workspace (`/draft/:id`)

### Empty State

First load with no content: ConversationPanel shows a welcome message from the AI assistant and the first prompt question. LetterPreview shows a blank letter template outline with zone placeholders.
