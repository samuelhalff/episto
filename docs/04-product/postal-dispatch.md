# Postal Dispatch and Tracking

> Cross-reference: [`../08-guardrails/swiss-post-appendix.md`](../08-guardrails/swiss-post-appendix.md)
> for verified provider facts and forbidden assumptions.
> [`../08-guardrails/provider-certainties.md`](../08-guardrails/provider-certainties.md) for the
> full certainty/unknown matrix.

## Objective

Define dispatch behavior without inventing provider capability.

## Locked direction

- Standard and registered delivery are in scope for MVP
- Dispatch happens only after final user review and payment authorization
- Provider logic sits entirely behind an adapter abstraction layer
- Dispatch state must be explicit, logged, and auditable
- Tracking or reference numbers are shown only when a real provider artifact exists

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

## Failure handling rules

| Scenario | Required behavior |
|---|---|
| Ambiguous submission state | Stay ambiguous until reconciled; never collapse to success |
| Retry after failure | Must be idempotent or explicitly guarded against duplicate dispatch |
| Refund trigger | Must be tied to real dispatch outcome, not UI-side optimism |

## Open questions

The following are unresolved and must not be guessed in code:

- Exact MVP provider path (dispatch provider selection is still open — see
  `../08-guardrails/open-decisions.md`)
- Exact accepted payload format for the chosen provider
- Attachment support details and limits per provider path
- Exact difference in returned identifiers for standard vs registered mail
- Whether dispatch confirmation is synchronous or asynchronous
- Whether status webhooks are available
