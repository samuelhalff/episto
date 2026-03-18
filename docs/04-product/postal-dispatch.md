# Postal Dispatch and Tracking

> Cross-reference: [`provider-submission-model.md`](provider-submission-model.md) for the canonical
> operating model and responsibility split.
> [`../08-guardrails/swiss-post-api-reference-map.md`](../08-guardrails/swiss-post-api-reference-map.md)
> for the repo-wide map of API-dependent docs.
> Cross-reference: [`../08-guardrails/swiss-post-appendix.md`](../08-guardrails/swiss-post-appendix.md)
> for verified provider facts and forbidden assumptions.
> [`../08-guardrails/provider-certainties.md`](../08-guardrails/provider-certainties.md) for the
> full certainty/unknown matrix.

## Objective

Define dispatch behavior without inventing provider capability.

In Swiss Mail, "dispatch" means preparing the provider-bound submission package and submitting it to
the configured postal-provider path. It does not mean delivery, and it does not imply that Swiss
Mail runs its own physical print-and-mail workflow.

## Locked direction

- Standard and registered delivery are in scope for MVP
- Dispatch happens only after final user review and payment authorization
- Dispatch uses the backend-owned final PDF artifact plus validated metadata, never the client preview alone
- Provider logic sits entirely behind an adapter abstraction layer
- Dispatch state must be explicit, logged, and auditable
- Tracking or reference numbers are shown only when a real provider artifact exists

## Locked provider path

**Locked choice:** MVP dispatch integrates directly with the Swiss Post Digital Commerce API path.

This is a provider-choice decision, not proof that every payload, attachment rule, or tracking
capability is already known. The adapter still depends on current Swiss Post onboarding docs and
sandbox access before provider-specific mapping is implemented.

Rules:

- Adapter file: `dispatch/adapters/swiss-post.ts`
- Do not build MVP dispatch around ePost SmartSend or a fallback partner unless a newer decision
  record explicitly replaces this one
- Keep the app-side adapter contract stable even while Swiss Post-specific request/response details
  are being confirmed

## Address validation — LOCKED (GAP-14)

**Locked approach: soft validation with warnings.**

- Swiss PLZ format check: 4 numeric digits (enforced as a hard format rule)
- City lookup where available: warn if the city name does not match a known PLZ entry
- Warn on missing or incomplete fields (street number, locality) but do not block submission
- Never silently fix or overwrite an address the user has entered
- Full address validation API integration (live provider lookup) is a future enhancement — do not
  build it now

This approach is locked. Hard-blocking validation on every mismatch (Option C) was rejected as too
rigid for real-world addresses.

## Provider abstraction

App code must depend on a dispatch adapter, not on raw provider APIs.

## Submission unit

The dispatch adapter receives a canonical submission unit containing:

- server-generated final PDF artifact
- validated sender and recipient metadata
- selected delivery type
- idempotency and audit context
- optional supporting-file references only where the provider-confirmed path supports them

Do not infer provider payload shape from these app-level fields. Mapping stays inside the adapter.

**Minimum adapter responsibilities:**

| Responsibility | Notes |
|---|---|
| Validate request payload | Against canonical dispatch schema |
| Submit dispatch request | Provider-specific transport hidden inside adapter |
| Normalize provider response | Map to `DispatchAttemptResult` canonical type |
| Expose provider reference identifiers | Never assume all references are trackable |
| Expose supported status lookup capability | Only if the provider actually supports it |
| Map provider errors into canonical app errors | See error taxonomy in `../07-operations/` |

## Tracking rules

- "Tracking" is not a synonym for "reference number"
- Standard mail may have weaker post-send confirmation than registered mail
- Do not promise more visibility than the provider actually delivers
- Store raw provider status only in backend and admin layers — never as direct user-facing truth
- Separate the "reference" concept from the "tracking" concept in all code and UI text
- `accepted` means provider acceptance of the submission into its downstream workflow; it does not
  mean delivered

## Failure handling rules

| Scenario | Required behavior |
|---|---|
| Ambiguous submission state | Stay ambiguous until reconciled; never collapse to success |
| Retry after failure | Must be idempotent or explicitly guarded against duplicate dispatch |
| Refund trigger | Must be tied to real dispatch outcome, not UI-side optimism |

## Provider details still requiring confirmed docs

The following are not open product decisions anymore, but they are still provider-specific facts
that must not be guessed in code:

- Exact accepted payload format for the chosen Swiss Post flow
- Attachment support details and limits
- Exact difference in returned identifiers for standard vs registered mail
- Whether dispatch confirmation is synchronous or asynchronous
- Whether status webhooks are available

## Swiss Post onboarding checklist

Before implementing `dispatch/adapters/swiss-post.ts`, confirm all of the following from current
Swiss Post-issued material:

1. OAuth flow, token endpoint, scopes, and token lifetime
2. Exact dispatch endpoint for physical-letter submission
3. Required request fields for standard and registered delivery
4. Whether uploads/attachments are part of the same request or a separate flow
5. Which returned identifiers are references only vs true tracking identifiers
6. Whether acceptance is synchronous, asynchronous, or mixed
7. Whether status polling and/or webhooks are available
8. Sandbox rate limits, test credentials, and sample payloads

Do not mark the dispatch adapter production-ready until each item above is captured in
[`../08-guardrails/swiss-post-appendix.md`](../08-guardrails/swiss-post-appendix.md) or the
provider onboarding notes.
