# Email Flows

**Resolves:** GAP-11
**Status:** Email-required-at-checkout and provider choice are LOCKED.
**See also:** [`provider-submission-model.md`](provider-submission-model.md), [`postal-dispatch.md`](postal-dispatch.md), [`../08-guardrails/swiss-post-api-reference-map.md`](../08-guardrails/swiss-post-api-reference-map.md)

---

## Core decision: email is required at checkout

**LOCKED.**

Email address collection is mandatory at the start of the checkout flow, before the Stripe payment form is shown.

### Rationale

Every guest session that results in a payment needs a reliable delivery path for:

- Payment receipt (regulatory and trust expectation)
- Dispatch status updates (user needs to know what happened to their letter)
- Resume link (user may abandon draft mid-flow and return later)
- Undeliverable / refund notification (critical communication if dispatch fails)

Without an email address, these cannot be delivered. "Optional email" creates support burden and trust failure at exactly the worst moment (post-payment, pre-delivery confirmation).

### What "required" means

- The checkout form cannot proceed to the Stripe payment step without a valid email address
- Email validation: format check (RFC 5322 simplified) — NOT a deliverability ping
- Email is stored against the `Session` record immediately on submission
- Email collection happens **before** the Stripe PaymentIntent is created — email is stored on the session and used for receipt delivery

### What it does not mean

- The user is not creating an account
- The email is not used for marketing without separate explicit opt-in
- The email is deleted per the session retention policy (see `docs/05-architecture/data-model.md`)

---

## Email collection point

**Position in flow:** Beginning of checkout, before Stripe form, after final letter review.

```
[Draft Review] → [Delivery Options] → [Email Collection] → [Payment (Stripe Elements)] → [Confirmation]
```

### UI requirements

- Single email input field, clearly labeled
- Helper text: "Used for your payment receipt and dispatch status updates. We won't use it for marketing."
- Inline format validation on blur
- No pre-population in MVP; any future saved-details layer must be specified separately before implementation
- On submission, email is saved to session before the Stripe PaymentIntent is created

---

## Email templates

All email templates must be:

- Responsive (mobile-first)
- Plain-text fallback included
- Sent from `noreply@swissmail.ch`
- Reply-to set to `support@swissmail.ch`
- All user-facing strings passed through the i18n layer (templates must support de-CH, fr-CH, it-CH, en-CH)
- Free of letter body content (privacy)
- Free of full recipient address in email body

### Locked launch email triggers

At launch, the product may send:

- payment receipt
- dispatch submitted
- dispatch accepted
- dispatch under review / ambiguous
- refund confirmed
- resume link

Do not add abandoned-cart drips, marketing sequences, or "your letter is on the way" claims in
MVP transactional email.

---

### Template 1: Payment receipt

**Trigger:** `PaymentState` transitions to `captured`
**Timing:** Sent immediately on capture confirmation from Stripe webhook

**Subject (i18n key):** `email.receipt.subject` → e.g., "Your Sendly payment receipt – {formattedTotal}"

**Content:**
- Sendly logo / header
- "Thank you for your order."
- Order reference number
- Date and time of payment
- Itemized price breakdown (same as checkout summary)
- Total charged in CHF
- Delivery type (Standard / Registered)
- Recipient name (first + last, no address)
- Sender name
- Secure order-status link for the paid order
- Dispatch status is communicated separately; this receipt must not overstate postal progress
- One-sentence refund policy
- Link to support

**Must NOT include:**
- Letter body or content
- Full recipient address
- Dispatch tracking link (tracking is only available if provider supplies it)
- Any claim of delivery or acceptance

---

### Template 2: Dispatch confirmation

**Trigger:** `DispatchState` transitions to `submitted` (job handed to dispatch queue / provider)
**Timing:** Sent when backend receives submission acknowledgment from dispatch adapter

**Subject (i18n key):** `email.dispatch_submitted.subject` → e.g., "Your letter has been submitted to Swiss Post"

**Content:**
- "Your letter has been submitted to Swiss Post for processing."
- Order reference number
- Secure order-status link for later status checks
- Estimated delivery timeframe, if and only if the dispatch provider supplies a deterministic estimate — otherwise omit entirely; do not invent a timeframe
- "You will receive another notification if there are updates to your letter's status."
- Link to support

**Important:** This email confirms submission to the provider pipeline, NOT delivery to the recipient. Wording must be precise.

---

### Template 3: Dispatch status update

**Trigger:** `DispatchState` transitions to `accepted` and provider supplies a handoff-to-postal signal
**Condition:** Only sent if the dispatch adapter receives a confirmed provider-acceptance signal beyond mere submission — this is NOT sent on `submitted` alone

**Subject (i18n key):** `email.dispatch_accepted.subject` → e.g., "Your letter has been accepted for dispatch"

**Content:**
- "Swiss Post has accepted your letter submission for further processing."
- Order reference number
- Secure order-status link for later status checks
- Tracking reference number, if the provider supplies one — clearly labeled as "reference number" not "tracking number" unless real tracking is available
- Disclaimer: "Standard letters are not individually tracked. Registered letters include delivery confirmation."
- Link to support

**Important:** Do not send this email if the dispatch state is ambiguous. If status is `unknown` or `reconciled` (manually resolved), use a separate cautious wording — do not imply certainty. See `docs/05-architecture/system-contracts.md` for `DispatchState` enum.

---

### Template 4: Resume link

**Trigger:** User requests a resume link, OR automatically sent 48 hours after the last draft
activity if payment is still incomplete and the session has an email address
**Condition:** Only sent to sessions where an email address has been collected

**Subject (i18n key):** `email.resume.subject` → e.g., "Continue your Sendly draft"

**Content:**
- "You have an unsent letter draft. Continue where you left off."
- Secure resume link (signed, time-limited token — 72-hour default expiry from config)
- Warning: "This link expires in {configuredResumeExpiryLabel}." — duration from config
- "If you no longer need this draft, you can ignore this email. It will be deleted automatically."
- No letter content in email body

**Security requirements:**
- Resume tokens are opaque, high-entropy credentials
- Tokens are time-limited for MVP, not single-use
- Token expiry matches the configured guest-access window
- Tokens are stored hashed server-side, not in plaintext

---

### Template 5: Dispatch under review

**Trigger:** `DispatchState` transitions to `unknown`, or support/manual reconciliation places the
case under review
**Timing:** Sent once the backend determines that the provider outcome cannot be stated
deterministically yet

**Subject (i18n key):** `email.dispatch_under_review.subject` → e.g., "We're reviewing your letter's dispatch status"

**Content:**
- "We've submitted your letter, but Swiss Post has not confirmed the outcome yet."
- Order reference number
- Secure order-status link for later status checks
- "No action is needed from you right now."
- "We'll update you as soon as the status is confirmed."
- Link to support

This template must not imply rejection, refund, delivery, or provider acceptance.

---

### Template 6: Refund notification

**Trigger:** `DispatchState` transitions to `rejected` (deterministic), OR payment refund is confirmed
**Timing:** Sent when `PaymentState` transitions to `refunded` (confirmed via Stripe webhook)

**Subject (i18n key):** `email.refund.subject` → e.g., "Your letter could not be dispatched – refund issued"

**Content:**
- "Unfortunately, your letter could not be dispatched."
- Reason (if deterministic and user-actionable): e.g., "The recipient address could not be validated." Use plain language. Do not expose raw provider error strings.
- "A full refund of {formattedRefundAmount} has been issued to your original payment method."
- "Refunds typically appear within 5–10 business days, depending on your card issuer."
- Order reference number
- Secure order-status link for the paid order
- "If you believe this is an error or need assistance, please contact support."
- Link to support

**If reason is ambiguous (dispatch state unknown / under manual review):**
- Do NOT send this template yet
- Send Template 5 with honest status
- Do not claim refund has been issued until Stripe confirms it

---

## Email provider

**Status: LOCKED**

| Provider | Notes |
|---|---|
| **Resend** | Locked transactional email provider; clean API, React Email fit, good MVP ergonomics |

Do not hardcode provider-specific API calls outside the email adapter module.

### Architecture rule

All email sending must go through an **email adapter** in the backend, following the same adapter pattern as dispatch and payment. No direct provider SDK calls from feature modules.

```
Feature module → EmailService (internal interface) → EmailAdapter (provider-specific)
```

This allows provider switching without changing feature code.

---

## Template technology

**Recommended:** [React Email](https://react.email/) for template authoring, compiled to HTML + plain-text.

Alternative: MJML (less TypeScript-native but battle-tested).

Requirements:
- Templates must compile to static HTML — no runtime rendering of sensitive data in template engine
- Plain-text fallback required for every template
- Templates must support all four locales (de-CH, fr-CH, it-CH, en-CH)
- i18n strings injected at send time, not baked into compiled template

---

## Sender and reply-to configuration

| Field | Value |
|---|---|
| From | `noreply@swissmail.ch` |
| Reply-To | `support@swissmail.ch` |
| Display name | `Sendly` |

The `noreply` address must not bounce silently — configure it to forward or discard with logging so bounce loops don't affect deliverability scores.

---

## Unsubscribe and opt-out

- **Transactional emails** (receipt, dispatch, refund, resume): No unsubscribe link required — these are triggered by user action and carry legal / contractual weight
- **Marketing emails** (if introduced later): Must include one-click unsubscribe and comply with Swiss DSG / EU GDPR where applicable
- For MVP, all emails are transactional. No marketing emails in MVP.

---

## Deliverability configuration

Before any email is sent in production, the following DNS records must be configured for `swissmail.ch`:

| Record | Purpose | Status |
|---|---|---|
| **SPF** | Authorizes sending IPs | Required before launch |
| **DKIM** | Signs outgoing messages | Required before launch |
| **DMARC** | Policy for auth failures | Required before launch (`p=none` initially, tighten post-launch) |
| **MX** (for `noreply@`) | Handles bounces correctly | Required |

These are not optional. Sending transactional email without SPF/DKIM/DMARC risks deliverability failure and damages domain reputation.

---

## Privacy and data handling

- Email address stored in `Session` record in the database
- Email is **not** shared with the dispatch provider
- Email is **not** included in the PDF or letter content
- Email is deleted according to the configured session/content retention policy
- After retention cleanup, only minimal transactional metadata may be retained (order reference, payment confirmation reference) — not the email address itself
- Email addresses must never appear in application logs

---

## Open decisions

| Decision | Status |
|---|---|
| Template technology (React Email vs MJML) | Open — recommend React Email |
| Exact token expiry for resume links | Config-driven — must match retention config |
| Marketing email opt-in (post-MVP) | Out of scope for MVP |
