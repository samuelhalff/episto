# episto — Page Specifications — Part 4

> Split from [page-specifications.md](page-specifications.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- 6. Draft Workspace (`/draft/:id`)
- 7. Review (`/draft/:id/review`)
- 8. Checkout (`/draft/:id/checkout`)

## 6. Draft Workspace (`/draft/:id`)

### Accessibility

- Conversation panel: `role="log"`, `aria-live="polite"` for new messages
- Letter preview: `role="region"`, `aria-label="Letter preview"`, `aria-live="polite"` for updates
- ZoneEditor triggers: `aria-label="Edit [field name]"`, keyboard activatable
- Microphone button: `aria-label="Start voice input"`, `aria-pressed`
- StepIndicator: `role="progressbar"` or `<nav aria-label="Progress">`
- Mobile preview sheet: focus trapped when open, returns focus on close

## 6. Draft Workspace (`/draft/:id`)

### Keyboard Shortcuts (Desktop)

Power users who send multiple letters should be able to work without touching the mouse. These shortcuts are active only in the draft workspace (`/draft/:id`).

| Shortcut           | Action                                                                         |
| ------------------ | ------------------------------------------------------------------------------ |
| `Enter`            | Send message (in conversation input)                                           |
| `Shift + Enter`    | New line in message input                                                      |
| `Cmd/Ctrl + Enter` | Continue to Review (when enabled)                                              |
| `Cmd/Ctrl + P`     | Toggle letter preview (mobile: open/close sheet; desktop: focus preview panel) |
| `Escape`           | Close any open ZoneEditor, Sheet, or Dialog                                    |
| `Cmd/Ctrl + Z`     | Undo last AI edit in preview (reverts to previous draft version)               |
| `Tab`              | Move focus through interactive zones in the letter preview                     |

**Implementation rules:**

- Shortcuts must not conflict with browser defaults. `Cmd/Ctrl + P` must be intercepted to prevent the browser print dialog — use `preventDefault()`.
- All shortcuts must have visible hints in tooltips or a discoverable help overlay (`?` key opens shortcut cheat sheet).
- Shortcuts are desktop-only and should not be registered on touch devices.
- The shortcut cheat sheet is a simple `<Dialog>` listing all shortcuts — not a complex help system.

---

## 7. Review (`/draft/:id/review`)

### Route

`/draft/:id/review`

### SEO

- `noindex, nofollow`
- **Title:** `Review your letter — episto`

### Layout

`<AppLayout>` — header with StepIndicator. No workspace split.

### Emotional intent

**I'm confident this is right. I'm ready to send it.** The review page is the last checkpoint before money changes hands. It must build confidence, not create anxiety. Everything must be scannable. Edit paths must be obvious but not prominent enough to create doubt.

### Entrance choreography (Draft → Review transition)

The transition from the drafting workspace to the review page is an emotional gear shift — from creative flow to calm scrutiny. The page must NOT just pop in. It should feel like "stepping back to see the whole picture."

1. **0–0.2s:** Page background renders immediately (`surface` colour). StepIndicator updates (step 2 becomes active — see `micro-interactions.md` §4.4).
2. **0.2–0.5s:** Page heading fades in (`opacity 0→1, translateY 8→0, 200ms, ease-out`).
3. **0.3–0.7s:** LetterPreview card slides up gently from below (`translateY(16px)→0, opacity 0→1, 300ms, ease-out`). The letter preview is the centrepiece — its entrance should feel like "here is your letter, ready for your approval."
4. **0.5–0.9s:** Completion checklist card fades in alongside the preview (or below on mobile). Each checklist item stagger: 50ms per item.
5. **0.7–1.0s:** Delivery selection, price summary, and CTA fade in together.

**On mobile:** The same sequence applies, but everything is single-column. The LetterPreview takes up the full viewport width, immediately communicating "look at your finished letter."

`prefers-reduced-motion`: All elements appear with a simple 100ms crossfade, no translation or stagger.

---

### Sections

#### 7.1 `<AppHeader>` with StepIndicator (step 2 active)

#### 7.2 Page Heading

`<h1>` "Review your letter before sending"  
`text-secondary text-sm` "Check everything looks correct. You can edit any section."

#### 7.3 `<LetterPreview>` (full, centred)

- Larger than workspace: max-width `720px`, centred, `shadow-paper`
- No ZoneEditors on hover — read-only by default
- "Edit" buttons positioned beside each major section (sender, recipient, body, signature)
- Clicking "Edit" → navigates back to `/draft/:id` with that zone in focus

#### 7.4 Completion Checklist

`<Card>` to the right (desktop) or below (mobile):

Checklist items:

- ✅ Sender details
- ✅ Recipient details
- ✅ Letter body
- ✅ Subject line
- ✅ / ⚠️ Signature (if not set: warning, not blocking)
- ✅ / ⚠️ Attachments (optional)

Each item: `Check` or `AlertTriangle` icon + label + optional "Add" / "Edit" link.  
Incomplete required fields: item shown with `error` colour + blocking message "Required before sending".

**Signature warning spec:** When no signature has been added, the signature checklist item shows:

- `AlertTriangle` icon in `warning` colour
- "No signature added" in `text-warning`
- "Add signature" link → opens `<SignaturePicker>` (Sheet on mobile, Popover on desktop)
- Below the icon row: `text-xs text-secondary` "Your letter will be sent without a signature. This is fine for most correspondence, but recommended for formal notices."
- This is a **soft warning** — it does NOT prevent the user from proceeding. The CTA remains enabled.

**Attachment optional item spec:** When no attachments are present:

- Grey `Check` icon (not red or yellow — attachments are genuinely optional)
- "No attachments" in `text-secondary`
- "Add attachment" link → opens `<AttachmentUploader>`
- No warning copy — adding attachments is not even recommended for most letters

#### 7.5 Address Warning Card

Shown only when recipient-address validation is incomplete or suspicious. This is a deliberate
friction moment for irreversible mailings, not a generic inline hint.

`<Card>` with `warning` treatment:

- Heading: "Please confirm this delivery address"
- Body copy: "We could not fully verify this address. Please make sure it is correct before you pay."
- Full recipient block rendered exactly as it will be sent
- Secondary helper text in `text-xs text-secondary`: "If anything is wrong, edit the recipient details before continuing."
- Explicit confirmation control:
  - `<Checkbox>` label: "Send to this address anyway"
  - Checkout CTA stays disabled until checked when this warning is present
- Primary edit action: "Edit recipient details" → returns to `/draft/:id` with recipient zone focused

Rules:

- Do not block purely because a provider or heuristic could not confirm the address.
- Do not hide the warning inside a tooltip, collapsed accordion, or generic error banner.
- Do not use blame language such as "You entered an invalid address."

#### 7.6 Delivery Selection — `<DeliverySelector>`

Card showing both options side by side (desktop) / stacked (mobile):

**Standard delivery card:**

- Label, estimated delivery, price
- `Badge` "Most common"

**Registered delivery card:**

- Label, "Proof of delivery", price
- `Badge accent` "Recommended for formal notices"
- `<Tooltip>` explaining what registered mail provides (and its limitations — see `../08-guardrails/provider-certainties.md`)

Selected option: highlighted with `border-primary` + `primary-light` background.

#### 7.7 Attachment Summary

`<Card>` listing all attached files:

- File name, page count, type
- Remove link (with confirmation)
- "Add attachment" link → opens `<AttachmentUploader>`

Attachment behavior is an extension of the active draft, not a separate upload flow. Upload begins
only after a draft exists and remains available on review; checkout is read-only for attachments.

If no attachments: `text-secondary text-sm` "No attachments" + "Add attachment" link.

#### 7.8 Price Summary — `<PriceSummary>`

Itemised:

- Letter (N pages): {formattedLetterPrice}
- Delivery: {formattedDeliveryPrice}
- Attachments (N pages): {formattedAttachmentPrice} — show only if attachment-related pricing is enabled at launch
- **Total: {formattedTotal}** (`font-bold text-lg`)

**Pricing row display rules (from `docs/04-product/pricing-structure.md`):**

- Only show pricing rows that are **enabled in the pricing configuration**. If attachment pricing is not enabled at launch, do not show an "Attachments: CHF 0.00" row — omit it entirely.
- Never show CHF 0.00 for a line item. If a line item has no cost, either omit the row or show "Included" instead of a zero price.
- All prices come from the pricing service/config. Never compute prices in the frontend — always use `{formatted*}` values returned by the API.

#### 7.9 CTA

- Primary: `<Button size="lg" className="w-full md:w-auto">` "Proceed to payment — {formattedTotal}" → `/draft/:id/checkout`
- Back link: "← Back to editing"

---

### Loading States

- Page load: preview card shows `<Skeleton>` while fetching latest draft render
- If render in progress: spinner within preview card area + "Preparing your letter preview…"

### Error States

- Required field incomplete: CTA disabled + inline warning in checklist
- Recipient address ambiguous: warning card shown with exact address + explicit confirmation checkbox before checkout
- Render failure: `<ErrorBanner>` "We couldn't generate your preview. Your content is saved — please try again."
- Session expired: `<Dialog>` (same as workspace)

### Empty State

No empty state — user cannot reach this page without a draft in progress.

### Accessibility

- Checklist items: `role="list"` + `role="listitem"`
- Incomplete fields: `aria-invalid` on related sections, `aria-describedby` pointing to error message
- Delivery selector: `role="radiogroup"`, each option `role="radio"` with `aria-checked`
- CTA disabled state: `aria-disabled="true"` + `<Tooltip>` explaining why

---

## 8. Checkout (`/draft/:id/checkout`)

### Route

`/draft/:id/checkout`

### SEO

- `noindex, nofollow`
- **Title:** `Checkout — episto`

### Layout

`<MinimalLayout>` — logo only, no nav, no footer links. Reduces abandonment. Single-column, centred.

### Emotional intent

**This is safe. I trust this.** Payment screens carry the highest anxiety in any flow. The layout must be uncluttered, the price unmistakable, and the trust signals credible. No distractions.

---

### Sections

#### 8.1 Minimal Header

Logo (centred or left). `<StepIndicator>` showing step 3 "Pay". No navigation.

#### 8.2 Two-Column Layout (desktop) / Single-column (mobile)

**Left / Top: Order Summary Card**
`<Card>` — `surface` background, `border`, `rounded-lg`:

- `<h2>` "Your order"
- Letter type (e.g. "Cancellation letter")
- Pages: N
- Delivery: Standard / Registered
- Attachments: N pages (if any)
- `<Separator>`
- Subtotal, VAT line (if applicable), **Total: {formattedTotal}** (large, `font-bold`)
- Lock icon + `text-xs text-secondary` "Secure checkout"

**Right / Below: Payment Form**

Email field:

- `<Input type="email">` labelled "Email address" — for receipt and status updates
- `text-xs text-secondary` "We'll send your receipt and letter status to this address."
- No account creation. Guest checkout.
- **Validation rule (from `docs/04-product/email-flows.md`):** Format check only (RFC 5322 simplified). Do NOT perform DNS/MX lookups or deliverability pings. Validate on blur, not on every keystroke. Error message: "Please enter a valid email address."

Stripe embedded payment element:

- Rendered by Stripe.js `<PaymentElement>` component
- Do not build a custom card form — use Stripe's embedded UI
- Stripe handles PCI compliance; do not handle raw card data
- Loading state: `<Skeleton>` while Stripe loads (typically <1s)

Legal checkbox:

- `<Checkbox>` + label: "I have read and agree to the [Terms of Service] and understand that episto is not a legal service."
- Link to `/terms` opens in new tab
- CTA disabled until checked

Disclaimer prominence rule:

- Drafting and review may include calm informational reminders or FAQ copy.
- The explicit legal-boundary acknowledgment happens here at checkout, once, before payment.

**CTA:**
`<Button size="xl" className="w-full">` "Send my letter — {formattedTotal}"  
Price embedded in button. `Send` icon left. Disabled until form valid + checkbox checked.

Trust row below CTA:

- `Lock` icon + "Secured by Stripe"
- 🇨🇭 Swiss cross icon + "Swiss postal delivery via licensed provider"
- `Shield` icon + "Your data stays in Europe"

These are NOT generic trust badges — they are Swiss-specific and product-specific. "Privacy-conscious infrastructure" is too vague. "Your data stays in Europe" is meaningful if true (verify with `docs/08-guardrails/provider-certainties.md` before using). If data residency cannot be confirmed, use "Encrypted and securely stored" instead.

#### 8.3 TWINT Payment (Mobile)

On mobile devices, Stripe's `<PaymentElement>` may surface TWINT as a payment option (Switzerland-specific). TWINT redirects the user to the TWINT app for approval, then returns them to episto.

**Flow:**

1. User selects TWINT in Stripe's payment method selector.
2. User taps "Send my letter" CTA.
3. Stripe redirects to the TWINT app (or TWINT web flow on tablets without the app).
4. User approves payment in TWINT.
5. TWINT redirects back to episto's checkout page.
6. episto receives Stripe webhook confirmation → navigates to `/draft/:id/confirmation`.

**Edge cases:**

- **User doesn't return from TWINT:** The checkout page shows a polling state: "Waiting for payment confirmation from TWINT…" with a spinner. After 60s without confirmation, show: "We haven't received payment confirmation yet. If you completed payment in TWINT, please wait a moment. Otherwise, try again." with a retry button.
- **TWINT app not installed:** Stripe handles this gracefully with a web fallback. Do not build a custom detection mechanism.
- **Payment succeeds but redirect fails:** Stripe webhook still fires. If the user returns to the checkout page manually, detect the completed payment and redirect to confirmation.

**Anti-hallucination rule:** TWINT integration is handled entirely by Stripe's SDK. Do not build a direct TWINT integration. The UX is Stripe's `<PaymentElement>` with TWINT enabled as a payment method — no custom TWINT UI is needed.

#### 8.4 Mid-Payment Navigation Handling

Users may accidentally navigate away during payment processing:

**Scenario: User taps browser back during Stripe processing:**

- Intercept with `beforeunload` event: browser shows standard "Leave site?" confirmation.
- If user confirms leaving: payment may still succeed via Stripe webhook. The Stripe payment receipt remains the fallback payment proof.
- If user stays: processing continues normally.

**Scenario: User closes tab during processing:**

- Payment may complete in the background (Stripe processes server-side).
- If payment succeeds: Stripe sends the payment receipt. User can return via the order-status link from later episto dispatch email.
- If payment fails: no charge. Draft remains available.

**Scenario: User's internet drops mid-payment:**

- Stripe retries internally. If the connection recovers within Stripe's retry window, payment may succeed.
- Show `<ErrorBanner>` on reconnect: "Your connection was interrupted. Checking payment status…" + automatic status check.
- If payment succeeded: redirect to confirmation.
- If payment failed or status unknown: "Payment status is unclear. If you were charged, contact support with reference {draftId}." + "Try again" button.

**Implementation rule:** Never assume payment failed because the client lost connection. Always check server-side payment status before showing a failure message.

---

### Loading States

- Stripe element loading: `<Skeleton>` rectangle placeholder
- Payment submission: button spinner + disabled, status message "Processing payment…"
- Do not show "Sending your letter" until dispatch is confirmed — payment and dispatch are separate states

### Error States

| Error                            | Display                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Card declined                    | Stripe surfaces inline within `<PaymentElement>` + `<ErrorBanner>` below: "Payment was not completed. No letter has been sent." |
| Payment failed (network/other)   | `<ErrorBanner>` + retry option                                                                                                  |
| Checkout expired / draft changed | `<Dialog>` "Your session has changed. Please review your letter again." → back to review                                        |
| Email invalid                    | Inline field error                                                                                                              |

### Empty State

No empty state — requires a valid draft and review completion to reach.

### Accessibility

- Email field: `<label>` associated with input, `aria-required="true"`
- Legal checkbox: `aria-required="true"`, `aria-describedby` pointing to terms link
- CTA disabled state: `aria-disabled="true"` with tooltip "Please complete all required fields"
- Stripe `<PaymentElement>`: Stripe handles internal accessibility; do not override
- Error messages: `role="alert"`, focused on appearance

---
