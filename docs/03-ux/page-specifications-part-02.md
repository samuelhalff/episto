# Episto — Page Specifications — Part 2

> Split from [page-specifications.md](page-specifications.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- 4. Use-Case Landing Pages (`/use-cases/:slug`)
- 5. Draft Entry (`/draft/new`)
- 6. Draft Workspace (`/draft/:id`)

## 4. Use-Case Landing Pages (`/use-cases/:slug`)

### Route

`/use-cases/:slug`  
Valid slugs: `lease-cancellation`, `insurance-cancellation`, `contract-termination`, `formal-complaint`, `official-correspondence`, `demand-letter`

### SEO (template — populated per slug)

- **Title:** `{useCaseTitle} — Episto`
- **Meta description:** `Draft and send {useCaseDescription} in minutes with Episto. AI-assisted and ready for postal dispatch.`
- **Structured data:** `HowTo`, `FAQPage`
- **Canonical:** `https://episto.ch/use-cases/{slug}`

### Layout

`<MarketingLayout>`

### Emotional intent

**This is exactly my situation. I'm in the right place.** The user arrived from search or a specific link. The page must affirm their context and make the first step frictionless.

---

### Sections

#### 4.1 Hero (use-case specific)

- `<h1>` — e.g. "Cancel a subscription — fast, formal, correct."
- Subheading specific to this letter type
- Primary CTA: "Draft my {useCaseCtaLabel}" → `/draft/new?useCase={slug}`
- Illustration or mockup of a relevant letter (anonymised, no real data)

#### 4.2 "How this works for {useCaseTitle}"

Adapted step sequence with use-case-specific language:

- Step 1: "Tell us who you're cancelling with and when"
- Step 2: "Review your letter — formatted to Swiss standards"
- Step 3: "Send for postal dispatch in one flow"

#### 4.3 Sample Letter Snippet

A truncated, clearly anonymised excerpt of the type of letter produced.

- `<Card>` styled like `<LetterPreview>` — `paper` background, serif font
- Redacted fields shown as `████████` or `[Recipient Name]`
- Caption: `text-xs text-secondary` "Example only — your letter will be personalised."
- Not a full letter — just enough to establish trust and format recognition

#### 4.4 Pricing (same card as `/pricing`)

#### 4.5 FAQ (use-case specific)

3–5 questions specific to the letter type.

#### 4.6 CTA Band

#### 4.7 Related Use Cases

Horizontal scroll of `<EntryCard>` components linking to other slugs.

#### 4.8 `<SiteFooter>`

---

### Empty / Error States

- 404 for unknown slugs: redirect to `/` or custom 404 page with "Use case not found" and link to use-case grid
- If slug is valid but content not yet written: show generic use-case template, not a broken page

### Accessibility

- `<h1>` matches use-case name
- Sample letter snippet: `aria-label="Example letter — anonymised"`, `role="region"`

---

## 5. Draft Entry (`/draft/new`)

### Route

`/draft/new`  
Optional query param: `?useCase={slug}` — pre-fills context

### SEO

- `noindex` — application page, not for search indexing
- **Title:** `Draft a new letter — Episto`

### Layout

`<AppLayout>` — minimal. No marketing footer. Sticky header with logo and language selector only.

### Emotional intent

**This is easy. I know exactly what to do.** The user has committed to starting. The entry screen must be clear, focused, and low-friction. One primary action. No decision paralysis.

---

### Sections

#### 5.1 App Header

Logo left. Language selector right. No nav links.  
On mobile: same, compact.

#### 5.2 Entry Screen (full-screen, centred content)

If an unfinished guest draft exists within the current session TTL, this section switches to a recovery card before any new draft is created:

- Heading: "You have an unfinished letter"
- Supporting copy explains the user can continue where they left off or begin again without losing the older draft
- Primary CTA: "Continue draft" → `/draft/:id`
- Secondary CTA: "Start fresh" → creates a new guest session and new draft
- Optional metadata line: last updated timestamp in the current locale

The product must not silently redirect returning users into an old draft from `/draft/new`. Recovery is explicit and reversible.
Dedicated fresh-start entry points may bypass recovery intentionally when the user has already completed a previous letter and explicitly chooses to begin again; those routes must use an explicit signal such as `/draft/new?fresh=1`, not heuristic branching.

**Primary path — text input:**

- Heading: `text-2xl font-semibold` "What kind of letter do you need?"
- Large `<Textarea>` or styled `<Input>` — placeholder: "e.g. I need to cancel my gym membership at Migros Sport from next month"
- `<Button size="lg">` "Start drafting" → submits, creates session, navigates to `/draft/:id`
- Dictation button: `<Button variant="ghost" size="icon">` with `Mic` icon — prominent on mobile, visible on desktop
  - On click: activates same-origin microphone capture; backend-owned speech transcription fills the input
  - State: idle / listening (pulsing indicator) / processing

**Secondary path — quick-start cards:**
Section below input, `<Separator>` with "or choose a common type":
`<UseCaseGrid>` — compact card grid, 2 cols mobile / 3 cols tablet / 4 cols desktop
Clicking a card: sets `useCase` context, navigates directly to `/draft/:id` with pre-loaded context

**Tertiary path:**
Helper text only: `text-sm text-secondary` "Need to include supporting files? You can add attachments after your draft is ready."  
Do not offer a competing "upload a PDF instead" path here. The consumer MVP starts from guided drafting, not from document upload.

#### 5.3 Guest notice (if applicable)

`text-xs text-tertiary` at bottom: "No account needed. Your session is saved for {configuredSessionRetentionLabel}."  
`configuredSessionRetentionLabel` is a localized duration string derived from `SESSION_TTL_HOURS`
(locked default: 72 → displays as "72 hours" or equivalent locale form). Do not hardcode the
display string — compute from config. See [`open-decisions.md`](../08-guardrails/open-decisions.md)
§4 and [`i18n-rules.md`](../05-architecture/i18n-rules.md) for formatting conventions.

---

### Loading State

After "Start drafting" submit:

- Button shows spinner, disabled
- Navigates to `/draft/:id` once session created
- If session creation fails: inline error below button (validation error family)

### Error States

- Session creation failure: `<ErrorBanner>` "We couldn't start your draft. Please try again."
- Speech-to-text unavailable: keep the microphone affordance visible but disabled or explanatory, with clear copy such as "Voice input unavailable in this browser"
- Network offline: `<ErrorBanner>` "No connection. Please check your internet and try again."

### Empty State

The textarea starts empty and focused. Placeholder text provides guidance. No skeleton needed.

### Accessibility

- `<h1>` "Start your letter"
- `<Textarea>` has `aria-label="Describe the letter you need"`
- Dictation button: `aria-label="Start voice input"`, `aria-pressed` for active state
- Quick-start cards: keyboard navigable, `role="button"` or `<button>`, descriptive labels
- Focus is set to the textarea on page load (`autoFocus`)
- Recovery card buttons are reachable by keyboard and announced distinctly as "Continue draft" and "Start fresh"

---

## 6. Draft Workspace (`/draft/:id`)

### Route

`/draft/:id`  
`:id` — session/draft UUID

## 6. Draft Workspace (`/draft/:id`)

### SEO

- `noindex, nofollow`
- **Title:** `Drafting your letter — Episto`

## 6. Draft Workspace (`/draft/:id`)

### Layout

`<AppLayout>` — modified for workspace. No footer. Sticky header with step indicator and price summary.

## 6. Draft Workspace (`/draft/:id`)

### Emotional intent

**I'm in control. This is going exactly where I want.** The workspace is the core product experience. It must feel fluid, intelligent, and responsive. The user should feel guided without feeling railroaded. The letter preview must feel like the real thing.

---

## 6. Draft Workspace (`/draft/:id`)

### The First 30 Seconds

This is the most critical UX window in the entire product. The user has committed — they typed their intent and hit "Start drafting". The next 30 seconds determine whether this feels like magic or like another form wizard. Every millisecond of perceived latency, every word of the AI's first response, matters.

**Timeline:**

| Time   | What happens                       | What the user sees                                                                                                                                                                                                                                                                    |
| ------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0s     | Navigation starts                  | Instant route change. No full-page loading screen.                                                                                                                                                                                                                                    |
| 0–0.3s | Layout renders                     | Skeleton conversation panel (left) + blank letter template outline (right). On mobile: skeleton conversation panel only. The letter template outline shows faint zone placeholders (sender, recipient, body) — it looks like an empty page waiting to be filled, not a loading state. |
| 0.3–1s | Session context loaded             | If `?useCase=` param present: system message appears — `"Letter type: Lease cancellation"` — centered, `text-tertiary text-xs`. The AI's typing indicator starts (3-dot pulse).                                                                                                       |
| 1–2.5s | AI first message arrives           | The AI's welcome message fades in (200ms). The typing indicator is replaced. See "First AI Message" below.                                                                                                                                                                            |
| 2.5–4s | Quick-reply chips appear           | `<QuickReplyChips>` stagger in (50ms per chip, 200ms fade) below the AI message. These are contextual — see "First Quick Replies" below.                                                                                                                                              |
| 4–8s   | User responds (typical)            | User either types, taps a chip, or uses voice. The moment user input is submitted, the AI typing indicator appears within 100ms.                                                                                                                                                      |
| 8–15s  | First field extraction             | `<FieldExtractionCard>` appears in conversation, showing what the AI understood. Fields animate in as key-value pairs.                                                                                                                                                                |
| 15–25s | **First draft appears in preview** | This is THE wow moment. See "First Draft Reveal" below. The letter preview transitions from blank template to populated content. On mobile, the Preview toggle gains a visible update signal so the user notices the letter is ready to inspect.                                      |
| 25–30s | Refinement begins                  | AI sends a follow-up: "I've drafted your letter. Take a look — anything you'd like to change?" Quick-reply chips: "Looks good", "Make it more formal", "Change the tone", "I want to edit the [section]"                                                                              |

**Perceived latency rule:** The user must never stare at an empty screen for more than 300ms. Skeletons appear instantly. The AI typing indicator must appear within 100ms of the user sending a message. If the AI response takes longer than 3 seconds, show a contextual "thinking" label below the typing indicator (e.g., "Drafting your letter…" or "Researching the right format…").

#### First AI Message

The AI's first message varies by entry path:

**Path A — Free-text entry** (user typed "I need to cancel my gym membership"):

> "Got it — a cancellation letter for your gym membership. I'll need a few details to get this right. First: **what's the name and address of the gym?**"

**Path B — Use-case entry** (user came from `/use-cases/lease-cancellation`):

> "Let's draft your lease cancellation letter. To get started: **what's the landlord's name and address?**"

**Path C — Empty entry** (user arrived at `/draft/new` without context, typed nothing specific):

> "What kind of letter do you need to send? Describe the situation in your own words — I'll take it from there."

Key rules for the AI's first message:

- **One question at a time.** Never ask for multiple unrelated fields in the first message. Exception: name + address can be grouped because they form a logical unit.
- **Bold the question.** The primary question in each AI message is wrapped in `**bold**` so it's visually scannable.
- **No preamble.** Don't start with "Hello! I'm here to help you..." — get to the point.
- **Acknowledge the user's input.** Mirror back what they said in 5 words or fewer before asking the first question.
- **Locale-appropriate.** The AI message language matches the user's selected locale. The greeting style follows the formality norms in `voice-and-tone.md` §5 (formal "Sie/Vous/Lei" in the AI's responses).

#### First Quick Replies

Contextual chips that appear after the AI's first message:

**After Path A/B** (context known):

- "I have the address ready" (pre-fill signal — opens address input inline)
- "I'm not sure of the address" (AI pivots to ask for the company/recipient name only)
- "I need something different" (resets context)

**After Path C** (no context):

- Quick-start chips matching the top use cases: "Cancel a subscription", "End a lease", "Send a formal complaint", "Write to an authority", "Something else"

Chip visual: `<Badge variant="outline" className="cursor-pointer hover:bg-primary-light">` — see component-library.md `QuickReplyChips` for full spec.

#### First Draft Reveal

This is the emotional climax of the drafting flow. When the AI has gathered enough information (typically after 2–3 exchanges), it generates a full letter draft. The reveal must feel like a moment of delight:

**Desktop:**

1. The LetterPreview panel, which has been showing a blank template outline, receives the content.
2. Content appears zone-by-zone from top to bottom: sender block → recipient block → date → subject → body → closing → signature placeholder.
3. Each zone fades in (200ms, ease-out) with a 100ms stagger between zones.
4. Total reveal duration: ~800ms.
5. A subtle `shadow-paper` elevation increase animation (from `shadow-sm` → `shadow-paper`, 300ms) accompanies the content fill — the "page" feels like it's becoming real.
6. System message in conversation: `"Your letter is ready to review"` — centered, `text-tertiary`.

**Mobile:**

1. The Preview toggle receives a badge/update signal.
2. The user switches from `Write` to `Preview` using the segmented workspace toggle directly below the step strip.
3. The preview panel replaces the conversation panel, where content is already fully populated.

**Anti-hallucination rule:** The first draft is explicitly labeled as a draft. The AI message accompanying it must say "I've drafted your letter" or "Here's a first draft" — never "Your letter is ready to send" or "Your letter is complete". The user must review and confirm before any payment or dispatch flow begins.

---

## 6. Draft Workspace (`/draft/:id`)

### Layout Structure

#### Desktop (`>=1024px`)

```
┌────────────────────────────────────────────────────────────┐
│ <AppHeader>   Episto   Step 1 ●──○──○──○   {formattedEstimatedTotal}│
├────────────────────────┬───────────────────────────────────┤
│                        │                                    │
│  <ConversationPanel>   │     <LetterPreview>                │
│  (40% width)           │     (60% width)                    │
│                        │                                    │
│  AI messages           │  Paper card (paper bg, serif)      │
│  User input            │  ZoneEditors on hover              │
│  QuickReplyChips       │  Attachment thumbnails             │
│  FieldExtractionCards  │  Signature preview                 │
│                        │                                    │
├────────────────────────┴───────────────────────────────────┤
│ <StatusStrip>  Step label  |  Delivery toggle  |  Price     │
└────────────────────────────────────────────────────────────┘
```

#### Mobile (`<768px`)

```
┌────────────────────────┐
│ <AppHeader> minimal    │
├────────────────────────┤
│ <StepIndicator> strip  │
├────────────────────────┤
│ [ Write | Preview ]    │
├────────────────────────┤
│                        │
│  Active workspace view │
│  (conversation or      │
│   preview)             │
│                        │
└────────────────────────┘
```

The workspace toggle swaps between `<ConversationPanel>` and `<LetterPreview>` in-place on mobile.

---
