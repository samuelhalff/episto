# Episto — Page Specifications — Part 5

> Split from [page-specifications.md](page-specifications.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- 9. Confirmation (`/draft/:id/confirmation`)
- 10. Guest Resume and Order Status Entry Points
- 11. Templates Gallery (`/templates`)
- 12. Error Pages (404, 500)

## 9. Confirmation (`/draft/:id/confirmation`)

### Route

`/draft/:id/confirmation`

### SEO

- `noindex, nofollow`
- **Title:** `Payment received — Episto`

### Layout

`<MinimalLayout>` — same as checkout. Centred content.

### Emotional intent

**I know what happened, and I know what happens next.** The confirmation screen must deliver calm closure, not celebration theater. It should feel like a receipt, not a dashboard. Status must be honest — do not claim delivery if only dispatch has been submitted. Reference numbers are real.

### Emotional pacing and entrance choreography

The confirmation page is the emotional payoff of the entire flow. It must feel like relief, clarity, and trust — in that order. The page loads in a deliberate sequence:

1. **0–0.2s:** Background renders immediately (`surface` colour, no flash of white or layout shift).
2. **0.2–0.6s:** The `CheckCircle` icon scales in from 0 → 1 with `ease-spring` (`cubic-bezier(0.34, 1.56, 0.64, 1)` — the standard spring curve from `design-system.md`). This is the first thing the user sees — it communicates "you're done" before any text loads.
3. **0.4–0.8s:** "Payment received" heading fades in (`opacity 0→1, 200ms, ease-out`).
4. **0.6–1.0s:** Reference number and subtext fade in together.
5. **0.8–1.2s:** `<DispatchStatusCard>` slides up from below (`translateY(12px)→0, opacity 0→1, 300ms`).
6. **1.0–1.4s:** "What happens next" timeline items stagger in (75ms per item).
7. **1.2–1.6s:** Action row and remaining sections fade in.

**Delight rule:** Do not use confetti, paper-plane celebration, or game-like effects here. This is a serious-letter product. A subtle icon scale-in and calm motion are enough. If dispatch is `rejected` or `unknown`, replace the `CheckCircle` with the appropriate warning/error icon and keep the motion even quieter.

**Sound:** No sounds. Ever. This is a formal letter product, not a game.

### Mobile confirmation priority order

On mobile, screen space is limited. Content must prioritize:

1. Success icon + "Payment received" — visible without scrolling
2. Reference number — visible without scrolling, tap-to-copy
3. Dispatch status — visible without scrolling
4. "What happens next" — may require scrolling
5. Download/view actions — may require scrolling
6. QR code, email notice, "Send another" — bottom of page

The "Send another letter" CTA is sticky at the bottom on mobile (`sticky bottom-0 p-4 bg-surface border-t`) so it's always accessible regardless of scroll position.

---

### Sections

#### 9.1 Minimal Header (same as checkout)

#### 9.2 `<ConfirmationCard>`

Centred card (`max-width lg`), `surface` background, `shadow-sm`:

- `CheckCircle` icon — `success` colour, large (48px)
- `<h1>` "Payment received"
- Subtext: `text-secondary` "Your letter has been submitted for dispatch." — NOTE: not "sent" or "delivered"
- Reference number: `<Badge variant="outline" className="font-mono">` REF-XXXXXX
- Copy-to-clipboard button beside reference number

**Important wording rule (from `../05-architecture/system-contracts.md` and `../08-guardrails/non-goals.md`):**

- "Payment received" ✅ — we know this is true
- "Submitted for dispatch" ✅ — we know this is true after submission
- "Your letter is on its way" ❌ — we do not know this
- "Delivered" ❌ — never show this on the confirmation screen

#### 9.3 `<DispatchStatusCard>`

Shows the current `DispatchState` with honest language:

| DispatchState | Display                                                 | Icon                   |
| ------------- | ------------------------------------------------------- | ---------------------- |
| `queued`      | "Your letter is queued for dispatch"                    | `Clock`                |
| `submitted`   | "Submitted for dispatch"                                | `Send`                 |
| `accepted`    | "Accepted for dispatch"                                 | `Check`                |
| `rejected`    | "Dispatch was rejected — we're investigating"           | `AlertCircle` (error)  |
| `unknown`     | "Status is being confirmed — we'll update you by email" | `HelpCircle` (warning) |
| `reconciled`  | "Status confirmed: [outcome]"                           | Depends on outcome     |

Do not show a tracking number unless the provider has returned one.  
If a tracking reference is available: show it with a `<Tooltip>` noting when tracking may update.  
If no tracking is available: `text-secondary text-sm` "Tracking information is not available for this delivery type." — never show a fake reference.

#### 9.4 "What happens next" Timeline

`<ol>` vertical timeline, 3–4 steps:

1. ✅ "Payment confirmed"
2. ✅ / `pending` "Letter submitted for dispatch"
3. `pending` "Provider processing"
4. `pending` "Further updates depend on provider confirmation"

Each step: icon, title, `text-xs text-secondary` description.  
Pending steps: muted, `text-tertiary`.

#### 9.5 Action Row

- `<Button variant="outline">` "Download receipt (PDF)" — generates/downloads payment receipt
- `<Button variant="ghost">` "Download signed confirmation document" — downloads the confirmation bundle from `/v1/drafts/:id/pdf` (or `/v1/orders/:orderToken/pdf` on the public status route)

Download bundle rules:

- Page 1 is the branded Episto confirmation record with the app logo, dispatch status, submission mode, provider reference, tracking number when available, and the operational fields needed for support and email follow-up.
- Remaining pages are the exact rendered letter PDF prepared for dispatch. The download artifact must not diverge from the mailed letter asset.
- If submission mode is `mock`, the UI copy and the PDF must state that no fee-bearing ePost submission occurred.

#### 9.6 QR Code (optional — secondary access mechanism)

`<Card>` "Access this letter on another device":

- QR code encoding `/status/{orderToken}` URL (the paid-order status route, not the draft resume route)
- Caption: `text-xs text-secondary` "Scan to view your order status on another device"
- Not required for MVP if token-based access is not in first release
- **Important:** The QR code is a **secondary** convenience mechanism. The primary access path is the signed order-status link carried in Swiss Mail dispatch emails after payment succeeds, with legacy hashed links accepted during the transition (see §9.7). Do not build the QR code as the sole or primary way to access order status.

#### 9.7 Email Notice — Multiple Emails

`<Card variant="info">`:

- Mail icon + "A payment receipt has been sent to {email}"
- `text-xs text-secondary` "You'll also receive a dispatch email if the status changes."

**Multiple email timeline (defined in `docs/04-product/email-flows.md`):**
The customer-facing sequence is Stripe receipt first, then Swiss Mail dispatch emails only when dispatch state changes:

1. **Payment receipt** — sent by Stripe when `PaymentState` → `captured`.
2. **Dispatch submitted / accepted** — sent by Swiss Mail when the dispatch pipeline enters a real new state worth reporting.
3. **Dispatch rejected** (error case) — sent when `DispatchState` → `rejected`. Contains: explanation, next steps, support contact.

The confirmation notice must say "payment receipt", not generic "confirmation email". The word "confirmation" implies dispatch success, which we cannot guarantee at this point.

#### 9.8 "Send another letter" CTA

`<Button variant="outline" className="w-full md:w-auto">` "Send another letter" → `/draft/new?fresh=1`

This CTA is an intentional fresh-start exception. It must bypass the recovery card and create a new guest session/new draft immediately, because the user is starting from a completed confirmation flow rather than returning to unfinished work.

---

### Loading States

- Initial load: `<DispatchStatusCard>` shows `queued` state if dispatch is in progress
- Polling (if implemented): card updates without full page reload; subtle badge pulse
- Receipt download: button spinner while PDF generates

### Error States

| Error               | Display                                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Dispatch rejected   | `<DispatchStatusCard>` error state + `<ErrorBanner>` "Dispatch failed. We are reviewing your case and will contact you at {email}." |
| Dispatch unknown    | `<DispatchStatusCard>` warning state — honest language, no false certainty                                                          |
| Receipt unavailable | Download button: "Receipt unavailable — contact support"                                                                            |
| PDF unavailable     | View button hidden or shows "Preview not yet available"                                                                             |

### Accessibility

- `<h1>` "Payment received"
- Status card: `aria-live="polite"` for status updates
- Timeline: `role="list"`, pending items visually distinct from completed
- QR code: `aria-label="QR code for accessing your letter"` + text alternative URL

---

## 10. Guest Resume and Order Status Entry Points

### Resume route

`/resume/:token`  
`:token` — opaque guest-resume token (not a UUID, not guessable)

### SEO

- `noindex, nofollow`
- **Title:** `Resume your letter — Episto`

### Layout

`<AppLayout>` or `<MinimalLayout>` — depends on state (see below)

### Emotional intent

**My letter is exactly where I left it.** This page must resolve anxiety ("did I lose my work?") within seconds.

---

### States and Behaviour

The page behaviour depends on what the token resolves to:

#### 10.1 Token valid — draft in progress

- If draft not yet paid → redirect to `/draft/:id` (workspace)
- Show brief notice: `<Toast>` "Welcome back — continuing your letter."

#### 10.2 Token valid — draft paid, dispatch in progress or complete

- Redirect to `/status/:orderToken` when the paid order has an order-access token
- Do not reopen the editable draft workspace
- Do not render paid-order status directly from `/resume/:token`

#### 10.3 Token valid — draft expired

- `<Card>` centred: "This session has expired."
- `text-secondary` "Sessions are kept for a limited time after your last activity."
- `<Button>` "Start a new letter" → `/draft/new`

#### 10.4 Token invalid / not found

- `<Card>` centred: "This link is invalid or has expired."
- Do not expose whether the token ever existed (security)
- `<Button>` "Go to homepage" → `/`

---

### 10.5 Order Status (`/status/:orderToken`)

#### Route

`/status/:orderToken`  
`:orderToken` — opaque paid-order access token, separate from the guest resume token

#### Purpose

This route is the paid-order, read-only status and receipt surface for guest users. It must never
reopen editable draft state.

#### Behaviour

- Show `<ConfirmationCard>` + `<DispatchStatusCard>` using canonical payment and dispatch state
- Show the order reference number and any real provider reference
- Keep "reference" and "tracking" labels separate unless tracking is truly available
- Allow access for the configured order-access window, independent of the shorter guest-draft session
- If the token is invalid or expired: show a calm invalid/expired state and direct the user to support
- No payment CTA
- No editable draft controls

#### Copy rule

The page must stay honest about ambiguity:

- `submitted` is not `accepted`
- `accepted` is not `delivered`
- `unknown` stays unknown until reconciliation confirms otherwise

### Loading State

- Token validation: full-page `<Skeleton>` or centred spinner for <500ms
- Then resolves to one of the four states above

### Accessibility

- All states have a clear `<h1>`
- Error / expired states: not alarming; calm, factual language

---

## 11. Templates Gallery (`/templates`)

### Route

`/templates`

### SEO

- **Title:** `Letter templates for Switzerland — Episto`
- **Meta description:** `Browse formal Swiss letter templates by category, filter by topic, and start from the right structure in minutes.`
- **Structured data:** `ItemList` for visible template cards, `BreadcrumbList`
- **Canonical:** `https://swissmail.ch/templates`
- Indexed. Search/filter state must not create alternate canonicals.

### Layout

`<MarketingLayout>` — standard marketing shell with `<SiteHeader>` and `<SiteFooter>`.

### Emotional intent

**There is clearly a template for my situation.** This page should feel like an organised catalogue, not a document dump. The user should be able to scan fast, narrow the list without friction, and trust that each entry maps to a real Swiss-style letter flow.

---

### Sections

#### 11.1 Page Intro

- `<h1>` "Letter templates for common situations in Switzerland"
- Supporting copy: `text-secondary max-w-2xl` explaining that templates are starting points, not legal advice (align with `../01-vision/product-scope.md`)
- Optional eyebrow `<Badge variant="outline">` "SEO template library"
- Background stays light: `surface` with subtle `border` bottom divider, not hero-like

#### 11.2 Search + Filter Bar

`<Card>` or sticky inline toolbar under the intro:

- Left: `<Input type="search">` with placeholder "Search templates, topics, or recipients"
- Right / below on mobile: category chips using `<Badge>` or chip-style `<Button variant="outline">`
- Categories, in this order:
  - Cancellations
  - Complaints
  - Notices
  - Demand Letters
  - Official Correspondence
  - Insurance Claims
- Include "All templates" reset chip
- Result count shown in `text-sm text-secondary`, e.g. "`N` templates"
- Search runs against title, short description, common aliases, and category label
- Filter interactions are instant; do not full-page reload for local filtering

**Behaviour:**

- If a dedicated SEO landing page exists for a template, card click goes to `/use-cases/:slug`
- If no editorial landing page exists yet, primary CTA goes directly to `/draft/new?useCase=:slug`
- Search/filter state may live in the query string for shareability, but canonical remains `/templates`

#### 11.3 Templates Grid

- Use `<EntryCard>` pattern adapted for a larger catalogue
- Grid: 1 column on mobile, 2 columns on tablet, 3 columns on desktop
- `gap-4 md:gap-6`, equal-height cards, no masonry
- Cards ordered by commercial priority first, then alphabetically within category
- Section header row above grid:
  - Left: active category label or "All templates"
  - Right: sort stays fixed to "Recommended" for MVP; no user-facing sort dropdown yet

#### 11.4 Template Card Anatomy

Each card contains:

- Category chip in `accent-light` or `surface-subtle`
- Template title
- One-sentence description in `text-secondary text-sm`
- Typical recipients or scenarios line, e.g. "Landlord, insurer, telecom provider"
- Optional "Popular" or "Recommended" `<Badge>` when backed by real usage/config, never fabricated
- Footer CTA:
  - Primary text: "View template" when destination is `/use-cases/:slug`
  - Primary text: "Start with this template" when destination is `/draft/new?useCase=:slug`

Visual rules:

- Card background: `surface`
- Hover: `border-primary/40`, subtle lift, no aggressive animation
- Entire card is clickable, but CTA remains explicit for accessibility and clarity

#### 11.5 Supporting Trust Band

Slim reassurance row below the grid:

- "Swiss-style formal formatting"
- "Mobile-first drafting"
- "Pay only when you send"

This is a lightweight `<ConfidenceBlock>` treatment, not a second sales page.

---

### Loading States

- Initial page render should be fully server-rendered / statically generated where possible; no blocking spinner for the shell
- If templates are hydrated client-side for filtering, show 6–9 `<Skeleton>` cards only inside the results grid
- On active search/filter changes, prefer immediate result swap over loading chrome

### Error States

| Error                          | Display                                                                                                                                |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Template catalogue unavailable | Inline `<ErrorBanner>` above grid: "Templates are temporarily unavailable. You can still start a blank draft." + Button → `/draft/new` |
| Search index failure           | Fall back to unfiltered grid + non-blocking notice; do not blank the page                                                              |

### Empty State

If search/filter returns no results:

- Centred `<Card>` with `surface-subtle` background
- `<h2>` "No templates match that search"
- `text-secondary` "Try a different keyword or browse all categories."
- Actions:
  - `<Button variant="outline">` "Clear filters"
  - `<Button>` "Start a blank letter" → `/draft/new`

### Accessibility

- Search input has a persistent `<label>`; placeholder is not the only instruction
- Category chips expose pressed state via `aria-pressed`
- Results region uses `aria-live="polite"` so result count updates are announced
- Card CTA labels include the template name for screen readers
- Decorative icons inside cards use `aria-hidden="true"`

---

## 12. Error Pages (404, 500)

### Routes

- 404: catch-all route
- 500: server error route / framework error boundary with a static HTML fallback

### SEO

- `noindex, nofollow` for both
- No canonical tags that compete with real content pages

### Layout

`<MinimalLayout>` for both states.

### Emotional intent

**Even when something fails, the product still feels calm and usable.** These pages must absorb frustration, not amplify it. Friendly language beats technical detail.

---

### Sections

#### 12.1 404 Page

Centred `<Card>`:

- Optional illustration (simple, low-contrast, decorative)
- `<h1>` "Page not found"
- Body copy: "The page you're looking for doesn't exist or has moved."
- CTA row:
  - `<Button>` "Go to homepage" → `/`
  - `<Button variant="outline">` "Draft a letter" → `/draft/new`

Rules:

- No visible "404" code in the UI
- Tone stays friendly, not jokey

#### 12.2 500 Page

Centred `<Card>` in the same layout:

- `<h1>` "Something went wrong on our end"
- Body copy: "We're looking into it. Please try again in a few minutes."
- CTA row:
  - `<Button>` "Try again" → reload current page
  - `<Button variant="outline">` "Go to homepage" → `/`
- Support line in `text-sm text-secondary` with `mailto:support@swissmail.ch`

Implementation note:

- The 500 page must exist as a static HTML fallback so it still renders if the app shell fails
- Keep dependencies minimal; no fragile client-only widgets

#### 12.3 Shared Styling Rules

- Centre content vertically on taller screens; top-align slightly on very small mobile screens
- Card width: comfortable on mobile first, max-width `md`
- Background stays neutral `surface-subtle`; no alarming red wash
- Brand mark may appear, but do not show navigation chrome that suggests the page is partially functional

---

### Loading States

None. Error pages should render immediately from server/static output without waiting on client data.

### Error States

These pages are the terminal error states. They must not trigger another layer of complex error UI or expose raw stack traces, request IDs, or provider codes to the user.

### Empty State

No empty state.

### Accessibility

- Each page has a clear `<h1>`
- CTA row remains keyboard reachable in logical order
- Decorative illustration uses empty `alt=""`
- 500 fallback page must remain readable with CSS or JS partially unavailable

---
