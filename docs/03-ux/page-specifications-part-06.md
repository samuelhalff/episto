# episto — Page Specifications — Part 6

> Split from [page-specifications.md](page-specifications.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- 13. Legal Pages (`/privacy`, `/terms`, `/imprint`)
- 14. Admin Dashboard (`/{locale}/admin/*`)
- Appendix A: Route Summary
- Appendix B: Shared Error Pattern
- Appendix C: i18n Notes
- Appendix D: Implementation Danger Zones

## 13. Legal Pages (`/privacy`, `/terms`, `/imprint`)

### Routes

- `/privacy`
- `/terms`
- `/imprint`

### SEO

- Indexed with unique titles per page
- Suggested titles:
  - `/privacy` → `Privacy policy — episto`
  - `/terms` → `Terms of service — episto`
  - `/imprint` → `Imprint — episto`
- Each page includes locale-specific canonical + `hreflang` tags for `de-CH`, `fr-CH`, `it-CH`, `en-CH`

### Layout

`<MarketingLayout>` with a single content column (`max-w-prose`) and normal header/footer.

### Emotional intent

**This is serious, readable, and transparent.** Legal pages should feel calm and professionally maintained. Users should be able to find the right section fast without parsing walls of text.

---

### Sections

#### 13.1 Shared Page Header

At the top of each page:

- `<h1>` page title
- `text-secondary text-sm` short description of the document purpose
- "Last updated" date shown near the title
- Link or `<Button variant="outline" size="sm">` to download a PDF version

The header stays compact. This is not a marketing hero.

#### 13.2 Auto-Generated Table of Contents

- Generated from visible `<h2>` headings on the page
- Desktop: sticky sidebar or inline block above the content column
- Mobile: collapsible `<Accordion>` labeled "On this page"
- Anchors scroll to the relevant section with consistent heading offsets below sticky header

#### 13.3 Prose Body

- Long-form rich text only; no calculators, forms, or promotional modules
- Use a readable prose rhythm with generous spacing and clear `h2` / `h3` hierarchy
- Links styled with `primary` colour and visible underline on hover/focus
- Body copy width constrained to reading measure; avoid full-width paragraphs

#### 13.4 Route-Specific Content Requirements

`/imprint`

- Company name
- Postal address
- Contact details
- Registration details required for a Swiss `.ch` presence

`/terms`

- Service description
- User obligations
- Payment
- Liability
- Data handling reference
- Dispute resolution
- Governing law (Swiss)

`/privacy`

- Data collected
- Purpose of processing
- Storage location and processing regions, exactly as approved in the final privacy text
- Retention
- Third parties: Stripe, Swiss Post, Federal Office of Topography (geo.admin.ch / swisstopo)
- User rights
- Contact

#### 13.5 Locale Availability

- All three pages are available in all four locales
- Language switching keeps users on the equivalent legal page when translation exists
- Last-updated date format follows locale rules from `../05-architecture/i18n-rules.md`

---

### Loading States

- Prefer static rendering; no loading skeletons on normal navigation
- If PDF generation is asynchronous, the download button may show a spinner after click only

### Error States

| Error                  | Display                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| PDF unavailable        | Inline text: "PDF version unavailable right now" while HTML page remains usable            |
| Missing locale variant | Fallback to default locale with clear language notice; do not 404 if source content exists |

### Empty State

No empty state. If legal content is unavailable, show a route-level `<ErrorPage>` rather than an empty shell.

### Accessibility

- Proper heading hierarchy: one `<h1>`, nested `<h2>` / `<h3>` only as needed
- Table of contents is a real list of anchor links
- PDF link text names the document, e.g. "Download Privacy Policy PDF"
- Legal copy meets readable contrast and line-height standards

---

## 14. Admin Dashboard (`/{locale}/admin/*`)

### Route

`/{locale}/admin/*` — protected, internal only

### SEO

- `noindex, nofollow` on all admin routes
- Not publicly accessible. Authentication required.

### Layout

`<AdminLayout>` — sidebar navigation + top bar.

### Emotional intent

**I can see everything I need and act quickly.** Admin users are internal operators handling support, dispatch issues, and system health. Density is acceptable; consumer-style polish is not required.

---

### Route Map

| Route                         | Purpose                                                     |
| ----------------------------- | ----------------------------------------------------------- |
| `/{locale}/admin/overview`    | Overview dashboard                                          |
| `/{locale}/admin/letters`     | Letter queue and status list                                |
| `/{locale}/admin/letters/:id` | Letter detail — full draft, dispatch events, payment events |
| `/{locale}/admin/dispatch`    | Dispatch queue, failed/ambiguous states                     |
| `/{locale}/admin/payments`    | Payment list, refund actions                                |
| `/{locale}/admin/sessions`    | Active and expired sessions                                 |
| `/{locale}/admin/files`       | File asset browser, retention status                        |
| `/{locale}/admin/risk`        | Suspicious activity flags and escalation queue              |

### Overview Dashboard (`/{locale}/admin/overview`)

- Metric cards: letters today, pending dispatch, failed dispatch, payments today, refunds pending
- Recent activity feed: last N events (dispatch state changes, payment events, support flags)
- No fake real-time unless WebSocket connection is confirmed

### Letter Detail (`/{locale}/admin/letters/:id`)

- Full draft content
- Timeline of state transitions (payment → dispatch → status events)
- Raw provider references (for support, not exposed to frontend users)
- Refund / re-dispatch actions (approval-gated in UI)

### Admin Accessibility

- Full keyboard navigation
- Table sorting and filtering keyboard-accessible
- Admin tools do not need to match consumer polish but must be functional and accessible

---

### Security Note

Admin routes must be protected at both the middleware and API level. Do not rely on frontend routing alone. See `../07-operations/security-and-privacy.md`.

---

## Appendix A: Route Summary

| Route                     | Layout                        | Auth               | SEO | Notes                                                     |
| ------------------------- | ----------------------------- | ------------------ | --- | --------------------------------------------------------- |
| `/`                       | `MarketingLayout`             | None               | Yes | SSG preferred                                             |
| `/how-it-works`           | `MarketingLayout`             | None               | Yes | SSG                                                       |
| `/pricing`                | `MarketingLayout`             | None               | Yes | Prices from config                                        |
| `/use-cases/:slug`        | `MarketingLayout`             | None               | Yes | SSG per slug                                              |
| `/templates`              | `MarketingLayout`             | None               | Yes | Searchable template catalogue; `ItemList` structured data |
| `/draft/new`              | `AppLayout`                   | None (guest)       | No  | Guest-first                                               |
| `/draft/:id`              | `AppLayout`                   | Session token      | No  | Core product                                              |
| `/draft/:id/review`       | `AppLayout`                   | Session token      | No  |                                                           |
| `/draft/:id/checkout`     | `MinimalLayout`               | Session token      | No  | Stripe embedded                                           |
| `/draft/:id/confirmation` | `MinimalLayout`               | Session token      | No  | Honest status only                                        |
| `/resume/:token`          | `AppLayout` / `MinimalLayout` | Resume token       | No  | Guest-draft recovery only                                 |
| `/status/:orderToken`     | `MinimalLayout`               | Order-access token | No  | Paid-order status, receipt, final artifact access         |
| `404 catch-all`           | `MinimalLayout`               | None               | No  | Friendly not-found page                                   |
| `/500`                    | `MinimalLayout`               | None               | No  | Static fallback for server errors                         |
| `/privacy`                | `MarketingLayout`             | None               | Yes | Legal prose, PDF download, all locales                    |
| `/terms`                  | `MarketingLayout`             | None               | Yes | Legal prose, PDF download, all locales                    |
| `/imprint`                | `MarketingLayout`             | None               | Yes | Swiss-required company details                            |
| `/{locale}/admin/*`       | `AdminLayout`                 | Admin auth         | No  | Internal only                                             |

---

## Appendix B: Shared Error Pattern

All pages use the same error component hierarchy:

| Severity      | Component                               | When to use                              |
| ------------- | --------------------------------------- | ---------------------------------------- |
| Field-level   | Inline `text-error text-sm` below field | Form validation                          |
| Inline notice | `<ErrorBanner>` (dismissable)           | Non-blocking failures                    |
| Full-screen   | `<ErrorPage>` centred card              | Route-level failures                     |
| Modal         | `<Dialog>`                              | Session expiry, destructive confirmation |

Error messages follow the taxonomy in `../05-architecture/error-taxonomy.md`. Never expose raw provider error codes to users.

---

## Appendix C: i18n Notes

All user-facing strings are in the i18n layer. This document uses English as the reference language. See `../05-architecture/i18n-rules.md` for:

- Locale routing uses `/[locale]/...` prefixes (`/de`, `/fr`, `/it`, `/en`)
- String key conventions
- Formal vs informal register per locale (Swiss German: formal `Sie`)
- Date and number formatting (Swiss locale: `.` thousands separator, `'` in CH-style, CHF currency)

---

_This document covers wireframe-level specifications. Visual polish, exact copy, and illustration assets are specified separately in `02-brand/design-system.md`, `02-brand/voice-and-tone.md`, and assets to be produced._

---

## Appendix D: Implementation Danger Zones

> **Purpose:** Explicit warnings for areas where an implementing LLM is most likely to produce incorrect or generic behavior. Read this before implementing any route.

### DZ-1: Do not build a generic chatbot

The `<ConversationPanel>` is a **guided workspace**, not a free-form chat interface. The AI follows a structured state machine (§6.2 "Conversation Flow State Machine") with defined states, transitions, and quick-reply chips. Implementation must not:

- Allow the AI to discuss topics unrelated to the current letter
- Implement a general-purpose conversation history that persists across sessions
- Use a generic "chat UI" component library without adapting it to the state machine model
- Show a greeting like "Hello! How can I help you today?" — the first message is always contextual

### DZ-2: Do not collapse dispatch states

The confirmation page (§9) shows the canonical dispatch states: `queued`, `submitted`,
`accepted`, `rejected`, `unknown`, and `reconciled`. An implementing LLM may be tempted to
simplify these into "sent" / "delivered" / "failed". **Do not.** Each state has specific copy and
visual treatment defined in `system-contracts.md`. "Submitted" is NOT "accepted". "Accepted" is
NOT "delivered". Delivery confirmations, if any, are a separate downstream status concept and must
not overwrite the dispatch state machine.

### DZ-3: Do not hardcode prices

Every price in the UI comes from a pricing service/config — never from a constant in the component. All prices use `{formatted*}` placeholders that are resolved at render time. See §6.4 "Price Estimate Timing" for when and how prices appear.

### DZ-4: Do not invent AI conversation prompts

The conversation examples in §6.2 are **UX illustrations**, not backend prompt definitions. The actual AI prompts, response formatting, temperature settings, and model selection are defined in `docs/04-product/ai-provider-and-prompts.md` and `docs/04-product/letter-generation.md`. Do not copy UX example strings into backend prompt templates.

### DZ-5: Do not skip the blank template outline

Before the first draft is generated, the `<LetterPreview>` shows a blank template outline with zone placeholders (§6.3). An implementing LLM may show an empty white rectangle or a loading spinner instead. This is wrong — the blank template is a deliberate UX signal that communicates "your letter will appear here" and makes the first-draft reveal feel magical by contrast.

### DZ-6: Do not build payment confirmation from client state

Payment success must come from the server (Stripe webhook), not from client-side inference after `confirmPayment()` resolves. The checkout → confirmation transition (§8→§9) must wait for server-side confirmation. See §8.4 "Mid-Payment Navigation Handling" for edge cases.

### DZ-7: Do not use generic error messages

Every error state in this document has specific copy. An implementing LLM may be tempted to use "Something went wrong" as a catch-all. This violates the voice-and-tone rules (`02-brand/voice-and-tone.md` §7). Every error must say: what failed, why (if known), and what the user can do.

### DZ-8: Do not build mobile as a compressed desktop

Mobile is not "desktop but smaller." The mobile workspace (§6 mobile layout) has fundamentally different interaction patterns: conversation is full-screen, preview is a separate workspace toggle, and the composer stays pinned while only the thread scrolls. An implementing LLM may apply responsive breakpoints to the desktop layout and call it done. This produces a cramped, unusable mobile experience. Build mobile-first, then expand for desktop.

### DZ-9: Do not fake the typing indicator

The AI typing indicator (3-dot animation) in the conversation panel must represent real server-side processing. It must not:

- Start before the request is sent to the backend
- Continue after the response is received (stop within 100ms of response arrival)
- Loop indefinitely without a timeout (max 30s, then show "Taking longer than expected…")
- Be animated independently of the actual AI generation state

### DZ-10: Do not implement auto-scroll naively

The conversation panel has specific scroll behavior rules (see `component-library.md` `ConversationPanel` "Scroll behavior"). Auto-scroll-to-bottom must pause when the user has scrolled up. A "↓ New messages" pill appears instead. Naive "always scroll to bottom" steals the user's reading position and is one of the fastest ways to make the product feel hostile.

### DZ-11: Do not build the conversation input as a single-line text field

The conversation input is an auto-resize `<Textarea>` (1–4 rows), not an `<Input type="text">`. Users sometimes type multi-line messages. The `enterkeyhint="send"` attribute enables the "Send" keyboard action on mobile. `Shift+Enter` creates a new line; `Enter` alone sends.

### DZ-12: Do not omit the legal checkbox from checkout

The legal checkbox (§8) is required before payment. It must reference the Terms of Service by link and include the "not a legal service" disclaimer. This is a compliance requirement, not a nice-to-have. An implementing LLM may skip it because it's not part of the Stripe `<PaymentElement>` and seems like boilerplate.
