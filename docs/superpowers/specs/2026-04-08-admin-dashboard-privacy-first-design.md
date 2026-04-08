# Admin Dashboard Privacy-First Design

**Status:** Approved in chat  
**Date:** 2026-04-08

## Goal

Make the admin dashboard production-ready for real operators while enforcing a strict metadata-first
support model and minimal provider retention.

## Current Findings

- The admin surface already uses real database-backed routes for overview, funnel, health, sessions,
  and retention.
- The frontend is missing a proper search workflow even though `/admin/search` already exists.
- The current session detail page is not a real case view. It is mostly a GDPR clear action shell.
- The backend still allows persistence of raw provider payloads in `dispatch_attempts` and
  `dispatch_status_events`, which conflicts with the project privacy posture.
- Admin safe actions are incomplete. Refund exists, but safe manual reconciliation is not exposed.

## Locked Decisions

### 1. Retention rule

Swiss Mail must not retain raw ePost response payloads or provider event blobs in application
storage for admin convenience.

Allowed long-lived dispatch metadata:

- `providerName`
- `providerReference`
- `trackingNumber` when a real trackable number exists
- normalized dispatch state
- normalized failure reason
- `submittedAt`
- `lastCheckedAt`
- support/audit events

Disallowed:

- raw provider request payload archives
- raw provider response payload archives
- admin-visible provider blob viewers

### 2. Admin workflow

The production-ready admin flow is:

1. search for a session, draft, payment, or provider reference
2. open a metadata-first case view
3. inspect normalized timeline and state
4. trigger only safe audited actions

### 3. Safe admin actions in scope

- request refund with justification
- trigger manual reconciliation for ambiguous dispatches with justification
- view retained draft content with justification
- clear retained draft content for a session with justification

Out of scope:

- direct provider-side mutation tools
- raw provider payload inspection
- hidden content archive tools

## Backend Changes

- Remove raw provider payload persistence from shared contracts, DB schema usage, dispatch service,
  and dispatch workers.
- Keep adapter responses normalized to state/reference/tracking/failure-only data.
- Add an admin dispatch reconciliation route that enqueues reconciliation and records a support
  event.
- Add a draft case-detail route returning normalized case summary data needed by the admin UI.
- Expand admin search response so results can resolve to the correct case page.

## Frontend Changes

- Add an admin search page.
- Add a draft case page with:
  - case summary
  - normalized timeline
  - support event history through the timeline surface
  - safe actions
- Upgrade the session detail page so it becomes a useful metadata view and links to draft cases.
- Update admin navigation to reflect the real operator workflow.

## Documentation Changes

- Document the provider minimal-retention rule in operational/privacy docs.
- Document that admin/provider integrations may store only minimal references required to reconcile
  or re-query ePost.

## Testing

- Shared contract tests for normalized dispatch provider responses.
- Backend tests for manual reconciliation route/helpers and no-payload persistence behavior.
- Frontend tests for new admin navigation and search/case routing.
