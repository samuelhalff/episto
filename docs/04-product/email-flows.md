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

## episto email templates

All episto email templates must be:

- Responsive (mobile-first)
- Plain-text fallback included
- Sent from `contact@episto.ch`
- Reply-to set to `contact@episto.ch`
- All user-facing strings passed through the i18n layer (templates must support de-CH, fr-CH, it-CH, en-CH)
- Free of letter body content (privacy)
- Free of full recipient address in email body

### Locked launch email triggers

At launch, the product may send:

- payment receipt (Stripe)
- dispatch submitted
- dispatch accepted
- dispatch under review / ambiguous
- refund confirmed
- resume link

**What is actually wired, as of 2026-07-28** — this list is the permission set, not the
shipped set, and the two drifted far enough apart once to leave a template enqueued with no
renderer. Renderers live in `backend/src/workers/email-templates.ts`; a template only sends if
something enqueues it.

| Template                | Renderer | Enqueued from                                                                                |
| ----------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `payment-receipt`       | yes      | `payments/receipt-notifications.ts` on capture                                               |
| `dispatch-submitted`    | yes      | **nothing — no longer enqueued (2026-08-21).** Renderer retained; see the note below         |
| `dispatch-accepted`     | yes      | `dispatch/dispatch-notifications.ts` — the single customer dispatch email (see note)         |
| `dispatch-failed`       | yes      | `dispatch/dispatch-notifications.ts`, on a settled rejection only                            |
| `refund-confirmed`      | yes      | `payments/refund-ledger.service.ts`, once per Stripe refund as it transitions to `succeeded` |
| `resume-link`           | yes      | **nothing — not shipped.** Template 4 below describes a trigger that does not exist          |
| `dispatch-under-review` | yes      | `dispatch/dispatch-review-notifications.ts`, from the `dispatch-liveness` sweep              |

**Single dispatch-confirmation email at acceptance (LOCKED, 2026-08-21).** There is exactly
**one** customer email about the dispatch itself, and it is `dispatch-accepted`, sent once the
dispatch is **accepted** (synchronously in `submit-dispatch.worker.ts`, or later from
reconciliation). It carries:

- the **Swiss Post tracking link** (`swissPostTrackingUrl` → `https://www.post.ch/swisspost-tracking?...`),
  for registered mail with a real tracking number, and
- the **attached justificatif d'envoi** PDF (`buildConfirmationBundlePdf`, best-effort — a render
  failure or an oversized bundle still sends the email with the tracking link, just no attachment).

The immediate `dispatch-submitted` email was **removed on purpose**: the Swiss Post tracking
number does not exist at submission time (Swiss Post assigns it later — see
[`postal-dispatch.md`](postal-dispatch.md#tracking-number-timing-and-customer-delivery)), so a
submission-time email cannot carry the one thing the customer actually needs. The customer still
gets an **immediate payment receipt** at capture, so "did my payment go through" is answered
instantly; the dispatch email follows once there is real tracking to report.

> **Regression guard:** do not re-add an immediate customer email on bare `submitted` state, and do
> not point the tracking link at an episto URL. The customer must be able to track **independently
> of episto, on Swiss Post**, weeks later from the durable email — episto retains little and must
> never be the tracking channel, nor a support channel for "where is my tracking number". Guarded by
> `backend/tests/dispatch-workers.test.ts`, `backend/tests/dispatch-notifications.test.ts`, and
> `backend/tests/email-templates.test.ts`.

The one still-unshipped template is deliberate, not forgotten. A resume-link email needs an address
collected _before_ checkout. The session can carry one (`PATCH /api/v1/sessions/me` accepts
`email`), but no step in the draft flow asks for it before the checkout form — so in practice the
address arrives at the moment there is nothing left to resume.

**Under-review dwell policy (implemented).** The under-review email is sent once, when a dispatch
attempt has been in `unknown` for at least 24 hours (`UNDER_REVIEW_DWELL_HOURS` in
`backend/src/modules/dispatch/dispatch-review-notifications.ts`) and still has no definitive
outcome. Sending the moment the state goes `unknown` would tell customers their letter is in doubt
far more often than it actually is, because most `unknown` states resolve on the next reconcile
poll. 24 hours is the point at which silence is worse than an honest "we don't know yet".

Mechanics worth knowing before changing it:

- The dwell is measured from the `dispatch_status_events` row that put the attempt into `unknown`,
  not from `dispatch_attempts.updated_at` — reconciliation writes `last_checked_at` on every poll,
  which would restart the clock forever.
- Once-only is enforced by `dispatch_attempts.under_review_notified_at` (migration 0028), claimed
  with a conditional `UPDATE ... WHERE state = 'unknown' AND under_review_notified_at IS NULL`. That
  same condition is what keeps an attempt that resolved between scan and send silent. The BullMQ job
  id (`dispatch-under-review-<attemptId>`) is the second belt.
- The sweep runs inside the existing `dispatch-liveness` worker, which already walks `unknown`
  attempts on a schedule. There is no separate cron for it, and there should not be one.
- A session with no email (erased under a deletion request) is a quiet skip, not an error.

Launch ownership rules:

- Stripe is the payment receipt sender for launch.
- episto sends dispatch-submitted, later accepted/rejected updates, and refund/resume emails.
- episto dispatch emails do not link back to episto order-status pages at launch.
- Only registered-mail acceptance emails may include a Swiss Post tracking link when a real tracking number exists.

Do not add abandoned-cart drips, marketing sequences, or "your letter is on the way" claims in
MVP transactional email.

---

### Template 1: Payment receipt

**Sender:** Stripe
**Trigger:** `PaymentState` transitions to `captured`
**Timing:** Stripe sends the receipt on successful capture using the checkout email.

episto does not send a duplicate app-level payment receipt at launch. The confirmation page must describe this as a payment receipt, while dispatch progress remains a separate episto email flow.

---

### Template 2: Dispatch submitted — RETAINED BUT NOT SENT (2026-08-21)

> **This email is no longer enqueued.** The renderer and strings are kept so the template can be
> revived if the tracking-availability constraint ever changes, but nothing calls
> `enqueueDispatchSubmittedEmail` anymore. See the single-dispatch-confirmation note above. The
> description below is retained for historical context only.

**Former trigger:** `DispatchState` transitions to `submitted` (job handed to dispatch queue / provider)
**Timing:** Sent when backend receives submission acknowledgment from dispatch adapter

**Subject (i18n key):** `email.dispatch_submitted.subject` → e.g., "Your letter has been submitted to Swiss Post"

**Content:**

- "Your letter has been submitted to Swiss Post for processing."
- Order reference number
- Estimated delivery timeframe, if and only if the dispatch provider supplies a deterministic estimate — otherwise omit entirely; do not invent a timeframe
- Do not promise additional status emails in this template; later notifications are sent only when a separate confirmed trigger actually fires
- Link to support

**Important:** This email confirms submission to the provider pipeline, NOT delivery to the recipient. Wording must be precise.

---

### Template 3: Dispatch accepted — the single customer dispatch email

**Trigger:** `DispatchState` transitions to `accepted` and provider supplies a handoff-to-postal signal
**Condition:** Only sent if the dispatch adapter receives a confirmed provider-acceptance signal beyond mere submission — this is NOT sent on `submitted` alone

**Subject (i18n key):** `email.dispatch_accepted.subject` → e.g., "Your letter has been accepted for dispatch"

**Content:**

- "Swiss Post has accepted your letter submission for further processing."
- Order reference number
- Tracking reference number, if the provider supplies one — clearly labeled as "reference number" not "tracking number" unless real tracking is available
- Registered letters include a **Swiss Post tracking link** (`https://www.post.ch/swisspost-tracking?...`)
  when the provider supplies a real postal tracking number — this is the customer's independent,
  durable way to check status on Swiss Post, with no episto involvement
- The **justificatif d'envoi** (proof-of-sending bundle: statement + letter + enclosures, with the
  tracking number filled in) is **attached** to this email, so the customer keeps a court-usable
  copy without revisiting episto. Attachment is best-effort and capped
  (`MAX_JUSTIFICATIF_ATTACHMENT_BYTES`); if it can't be built, the email still sends with the
  tracking link.
- Standard and registered letters otherwise use the same template structure; tracking is the only differentiator when it exists
- Disclaimer: "Standard letters are not individually tracked. Registered letters include delivery confirmation."
- Link to support

**Important:** Do not send this email if the dispatch state is ambiguous. If status is `unknown` or `reconciled` (manually resolved), use a separate cautious wording — do not imply certainty. See `docs/05-architecture/system-contracts.md` for `DispatchState` enum.

---

### Template 4: Resume link

**Trigger:** User requests a resume link, OR automatically sent 48 hours after the last draft
activity if payment is still incomplete and the session has an email address
**Condition:** Only sent to sessions where an email address has been collected

**Subject (i18n key):** `email.resume.subject` → e.g., "Continue your episto draft"

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

**Trigger:** a dispatch attempt has been in `DispatchState` `unknown` for at least 24 hours and
still has no definitive outcome (see the dwell policy above)
**Timing:** once per dispatch attempt, from the `dispatch-liveness` sweep — never on entry into
`unknown`, which usually resolves on the next reconcile poll

**Subject (i18n key):** `email.dispatch_under_review.subject` → e.g., "We're reviewing your letter's dispatch status"

**Content:**

- "We've submitted your letter, but Swiss Post has not confirmed the outcome yet."
- Order reference number
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
- "If you believe this is an error or need assistance, please contact support."
- Link to support

**If reason is ambiguous (dispatch state unknown / under manual review):**

- Do NOT send this template yet
- Send Template 5 with honest status
- Do not claim refund has been issued until Stripe confirms it

---

## Email provider

**Status: LOCKED**

| Provider   | Notes                                                                                |
| ---------- | ------------------------------------------------------------------------------------ |
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

| Field        | Value               |
| ------------ | ------------------- |
| From         | `contact@episto.ch` |
| Reply-To     | `contact@episto.ch` |
| Display name | `episto`            |

The `noreply` address must not bounce silently — configure it to forward or discard with logging so bounce loops don't affect deliverability scores.

---

## Unsubscribe and opt-out

- **Transactional emails** (receipt, dispatch, refund, resume): No unsubscribe link required — these are triggered by user action and carry legal / contractual weight
- **Marketing emails** (if introduced later): Must include one-click unsubscribe and comply with Swiss DSG / EU GDPR where applicable
- For MVP, all emails are transactional. No marketing emails in MVP.

---

## Deliverability configuration

Before any email is sent in production, the following DNS records must be configured for `episto.ch`:

| Record                  | Purpose                   | Status                                                           |
| ----------------------- | ------------------------- | ---------------------------------------------------------------- |
| **SPF**                 | Authorizes sending IPs    | Required before launch                                           |
| **DKIM**                | Signs outgoing messages   | Required before launch                                           |
| **DMARC**               | Policy for auth failures  | Required before launch (`p=none` initially, tighten post-launch) |
| **MX** (for `noreply@`) | Handles bounces correctly | Required                                                         |

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

| Decision                                  | Status                                      |
| ----------------------------------------- | ------------------------------------------- |
| Template technology (React Email vs MJML) | Open — recommend React Email                |
| Exact token expiry for resume links       | Config-driven — must match retention config |
| Marketing email opt-in (post-MVP)         | Out of scope for MVP                        |
