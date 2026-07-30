# Dispatch Failure Case Management Design

**Date:** 2026-07-30

## Context

The admin overview currently exposes only counts for ambiguous and failed
dispatches. That is insufficient for an operational incident: an administrator
cannot identify the customer, understand the provider outcome, inspect the
payment/refund state, or resolve the case from the dashboard.

The confirmed production incident that motivated this work was dispatch
`f4fca2bf-daa1-434d-82ae-c7f3a4f2abe9` for draft
`7d97abcd-7de0-4c20-b37c-a993851f32a5`. ePost delivery `8` received the
request, briefly accepted it, and later reported
`PHYSICAL_DELIVERY_FAILED`. The application had no provider reference, so the
case remained ambiguous until it was manually matched and reconciled.

## Goals

- Make every failed or ambiguous dispatch directly actionable from the admin
  overview.
- Provide a dedicated case page with the operational data needed to diagnose
  and resolve the incident without exposing letter content by default.
- Allow administrators to recheck provider-backed cases safely.
- Use one reconciliation service for scheduled jobs and manual rechecks.
- Preserve idempotency, prevent duplicate physical dispatches, and keep payment
  settlement/refund behavior consistent.
- Record sufficient structured provider diagnostics for future incident
  analysis without storing raw provider request or response payloads.

## Non-goals

- Automatic resubmission of a letter after an ambiguous or failed provider
  result.
- Displaying letter subject or body in the normal failure-case view.
- Storing raw ePost payloads, credentials, or provider access tokens.
- Building a generic provider-monitoring browser inside the episto admin.

## Admin experience

### Failure queue

The overview priority area will link to a failure queue page. The queue will
list rejected and unknown dispatch attempts, ordered by operational urgency and
last update. Each row will include:

- customer name when available, otherwise email or session identifier;
- customer email and locale;
- recipient name and postal location;
- dispatch state and provider;
- payment state and amount;
- failure category and concise diagnosis;
- last provider check and update time;
- a link to the dispatch case.

The existing numeric overview counters remain useful as summary metrics, but
each failure metric becomes a link to the relevant filtered queue.

### Dispatch case page

`/admin/dispatches/[id]` will be a metadata-first incident page containing:

- case identity, customer/session details, draft ID, and links to related admin
  pages;
- sender and recipient address data;
- delivery type, provider, provider reference, tracking number, and all
  submission/check timestamps;
- payment amount, breakdown, payment state, refund state, and refund reference;
- current draft and fulfillment state;
- a plain-language diagnosis with known facts, uncertainty, and recommended
  next action;
- application dispatch events, provider-check events, and support/audit events;
- recheck controls and explicit result/error feedback.

Letter content is not returned by this case endpoint. If support later needs
content, the administrator must use the existing reason-gated, audited
`view-content` action on the draft page.

### Recheck behavior

The case page offers `Recheck provider` for `unknown`, `submitted`, and
`rejected` dispatches when a provider reference exists. For `rejected`, the
action is diagnostic only and must never create a new dispatch.

The action is idempotent and protected by a per-dispatch lock. It queries the
provider status, stores normalized diagnostics, and applies the existing
settlement rules:

- accepted: retain the captured payment, record provider/tracking data, and
  finalize fulfillment;
- rejected: refund a captured payment through the one-time refund service and
  mark fulfillment failed/ready according to the existing state contract;
- submitted/unknown: retain the unresolved state and show the latest provider
  check result;
- provider/network error: retain the prior state, record the failed check time
  and normalized error, and return a retryable admin error.

No recheck path may call the physical submission endpoint.

If no provider reference exists, the API returns a clear `cannot recheck`
diagnosis. A provider monitoring lookup may be implemented only as an explicit,
documented provider capability with deterministic matching using stored case or
snapshot identifiers. It must not guess from customer or address data.

## Backend architecture

Introduce a dispatch reconciliation service that owns provider status lookup,
normalization, settlement, fulfillment updates, state transitions, and audit
metadata. The scheduled reconciliation worker and admin endpoint both call this
service.

Extend the admin dispatch API with:

- a queue endpoint returning customer, recipient, payment, and dispatch context;
- a case-detail endpoint returning all non-content operational data and a
  normalized timeline;
- a recheck endpoint accepting a required reason and returning the refreshed
  case state.

Provider diagnostics will be stored in structured, minimal columns or a
strictly bounded diagnostic object containing only normalized status, code,
message, provider reference, tracking number, and timestamps. Raw request and
response bodies remain prohibited.

The incident discovered during investigation will be represented accurately:
provider reference `8`, state `rejected`, provider error
`PHYSICAL_DELIVERY_FAILED`, payment refunded, and fulfillment failed.

## Error handling and safety

- Authorization remains enforced by the existing admin and allowlisted-IP
  middleware.
- Every manual recheck requires a reason and creates a support event containing
  the actor, dispatch ID, prior state, provider reference, and outcome.
- Concurrent rechecks return the current in-progress/current-state result and
  do not duplicate provider calls.
- A provider reference discovered by a monitoring lookup must be verified
  against immutable application identifiers before it can be attached to a
  dispatch.
- Rejected/unknown states are never resubmitted automatically.
- Payment refunds remain one-time and webhook-reconciled.
- Admin responses redact credentials, tokens, raw payloads, and letter content.

## Verification

Backend tests will cover the service and all state/payment/fulfillment branches,
including the production incident shape. Route tests will cover authorization,
case serialization, audit records, and recheck idempotency. Frontend tests will
cover links, metadata rendering, content absence, diagnosis copy, and loading/
error/success states. Typecheck, lint, focused tests, the full test suite, and a
production health check will run before deployment.
