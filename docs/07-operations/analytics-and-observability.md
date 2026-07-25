# Analytics and Observability

**Status:** Authoritative operational plan  
**Scope:** Product analytics, operational telemetry, dashboard expectations, and privacy-safe
measurement rules.  
**See also:** [`deployment-and-ci.md`](deployment-and-ci.md) ·
[`admin-and-support.md`](admin-and-support.md) ·
[`incident-response.md`](incident-response.md) ·
[`../08-guardrails/ai-quality-governance.md`](../08-guardrails/ai-quality-governance.md)

---

## Core rule

episto must measure product usage and operational health **without** becoming a letter-content
surveillance system.

That means:

- log and analyze **states, timings, failures, and corrections**
- never log full letter body content into analytics systems
- never log resume tokens, order-access tokens, or raw provider payloads into analytics tools
- keep product analytics and operational observability correlated through IDs and event families, not
  by copying sensitive content between systems

---

## 1. Telemetry layers

episto needs four distinct telemetry layers.

| Layer             | Purpose                                          | Examples                                                |
| ----------------- | ------------------------------------------------ | ------------------------------------------------------- |
| Platform health   | Detect outages, latency, and queue pressure      | HTTP latency, worker failures, queue depth              |
| Operational truth | Support reconciliation and incident review       | payment state changes, dispatch ambiguity, refunds      |
| Product flow      | Understand friction, abandonment, and conversion | draft started, review reached, checkout entered         |
| AI quality        | Measure drafting usefulness and degradation      | refusal rate, regeneration rate, manual-correction rate |

No single dashboard should mix these concerns casually. Keep dashboards scoped so operators can
answer one question quickly.

---

## 2. Vendor posture

### Operational observability

This is locked to the operational baseline already defined elsewhere:

- structured logs
- error tracking
- alerting

See [`deployment-and-ci.md`](deployment-and-ci.md).

### Product analytics

MVP should use a **privacy-first product analytics tool**. The exact vendor may remain configurable,
but the instrumentation model is fixed:

- section-level funnel events
- no content capture
- no token capture
- no session replay of letter body content

If a chosen analytics vendor cannot satisfy these rules, do not use it.

---

## 3. Privacy rules for analytics

The following must **never** be sent to product analytics:

- letter subject or body
- sender or recipient names
- physical addresses
- attachment filenames or contents
- resume tokens
- order-access tokens
- raw provider references unless they are first normalized to a safe internal identifier
- payment method details

Allowed analytics fields:

- internal opaque IDs (`sessionId`, `draftId`, `paymentAttemptId`, `dispatchAttemptId`)
- locale
- route
- event name
- timestamps and durations
- canonical states
- error families
- counts such as attachment count or page count

---

## 4. Product event taxonomy

### 4.1 Marketing and entry

| Event                   | When                                             | Required fields             |
| ----------------------- | ------------------------------------------------ | --------------------------- |
| `marketing_page_viewed` | Marketing page loaded                            | `route`, `locale`, `source` |
| `draft_entry_started`   | User reaches `/draft/new` and begins interaction | `locale`, `source`          |
| `template_selected`     | User starts from a use-case/template             | `templateSlug`, `locale`    |

### 4.2 Session and draft flow

| Event                            | When                                    | Required fields                              |
| -------------------------------- | --------------------------------------- | -------------------------------------------- |
| `session_created`                | Guest session created                   | `sessionId`, `locale`                        |
| `resume_banner_shown`            | Existing draft detected on `/draft/new` | `sessionId`                                  |
| `resume_link_opened`             | `/resume/:token` successfully resolves  | `sessionId`, `result`                        |
| `draft_created`                  | Draft record created                    | `sessionId`, `draftId`                       |
| `draft_first_response_completed` | First AI answer is complete             | `draftId`, `durationMs`                      |
| `draft_first_full_draft_ready`   | First complete draft exists             | `draftId`, `durationMs`, `pageCountEstimate` |
| `draft_conflict_seen`            | Client receives stale-write conflict UI | `draftId`, `surface`                         |

### 4.3 Files and review

| Event                 | When                              | Required fields                                   |
| --------------------- | --------------------------------- | ------------------------------------------------- |
| `file_upload_started` | User starts upload                | `draftId`, `kind`, `countExisting`                |
| `file_upload_failed`  | Upload rejected or storage failed | `draftId`, `kind`, `errorFamily`                  |
| `review_reached`      | User enters review step           | `draftId`, `pageCountEstimate`, `attachmentCount` |
| `review_blocked`      | User cannot continue from review  | `draftId`, `reason`                               |

### 4.4 Checkout and payment

| Event                    | When                                | Required fields                              |
| ------------------------ | ----------------------------------- | -------------------------------------------- |
| `checkout_started`       | Checkout route shown                | `draftId`, `deliveryType`, `priceCents`      |
| `payment_intent_created` | Backend creates PaymentIntent       | `draftId`, `paymentAttemptId`                |
| `payment_failed`         | Payment confirmation fails          | `draftId`, `paymentAttemptId`, `errorFamily` |
| `payment_captured`       | Canonical payment success confirmed | `draftId`, `paymentAttemptId`, `amountCents` |

### 4.5 Dispatch and post-payment

| Event                 | When                                     | Required fields                                  |
| --------------------- | ---------------------------------------- | ------------------------------------------------ |
| `dispatch_submitted`  | Submission attempt created               | `draftId`, `dispatchAttemptId`, `deliveryType`   |
| `dispatch_accepted`   | Provider acceptance confirmed            | `draftId`, `dispatchAttemptId`                   |
| `dispatch_ambiguous`  | Dispatch enters `unknown`                | `draftId`, `dispatchAttemptId`, `reasonCategory` |
| `order_status_viewed` | `/status/:orderToken` shown successfully | `draftId`, `dispatchState`                       |
| `refund_confirmed`    | Refund confirmed                         | `draftId`, `paymentAttemptId`, `amountCents`     |

---

## 5. AI quality telemetry

The AI path needs dedicated telemetry that does not expose customer content.

Required metrics:

- first-response latency
- full-draft latency
- refusal rate by refusal family
- timeout rate
- regeneration count per draft
- manual zone-edit count after AI generation
- draft-to-review conversion
- locale split across drafting outcomes

The purpose is not vanity tracking. It is to answer:

- is the AI useful enough?
- did quality regress after a prompt/model change?
- which locale or letter type is underperforming?

---

## 6. Operational dashboards

Before launch, operations should have at least:

### 6.1 Product funnel dashboard

- `/` → `/draft/new`
- `/draft/new` → first draft
- first draft → review
- review → checkout
- checkout → captured payment
- captured payment → submitted dispatch

Split by:

- locale
- device class
- delivery type

### 6.2 Operations dashboard

- payment success/failure rate
- dispatch submitted/accepted/rejected/unknown counts
- refund count
- ambiguous dispatch backlog
- queue depth
- worker failure rate

### 6.3 AI quality dashboard

- first-draft latency
- refusal rate
- manual-correction rate
- regeneration rate
- locale-specific quality split

---

## 7. Admin and support relationship

Analytics must support admin/support without replacing operational truth.

- Support timelines remain canonical for single-case investigation
- Product analytics explain **patterns**, not single-case legal truth
- Admin UI may show aggregated operational counters, but not raw analytics-vendor dashboards embedded
  into admin pages

If support needs to explain an individual payment or dispatch case, use canonical operational records,
not product-analytics events.

---

## 8. Launch gate

Before public launch:

- the event taxonomy above is implemented on all core product surfaces
- operational dashboards exist for payment, dispatch, and queue health
- AI quality telemetry exists for latency, refusal, and correction rates
- analytics paths are verified to exclude sensitive content and tokens
- at least one privacy-first product analytics tool is wired, or an equivalent self-hosted setup is
  proven

If any of these are missing, launch-readiness is incomplete.
