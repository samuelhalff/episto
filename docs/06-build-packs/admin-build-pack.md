# Admin Build Pack

## Goal

Keep operations minimal, auditable, and useful. The admin area exists to support operations — not
to become a content warehouse or a shadow editor.

## Admin authentication — LOCKED (IMPROV-8)

**Operator auth uses backend-managed Microsoft SSO over TLS. Only signed admin session cookies are accepted; no Basic Auth fallback exists.**

- Microsoft login starts at `/api/v1/admin/auth/microsoft/login` and returns through
  `/api/v1/admin/auth/microsoft/callback`
- Successful Microsoft login mints a signed HTTP-only admin session cookie; the frontend must use
  backend session status, not browser-stored Microsoft tokens
- Access is authorized by the configured `ADMIN_MICROSOFT_TENANT_ID` (the WestBay tenant);
  any identity token from a different tenant is rejected with `access_denied`
- `ADMIN_MICROSOFT_TENANT_ID` must be set to an explicit tenant ID — never `"common"`
- `ADMIN_MICROSOFT_*` is a dedicated admin app registration and tenant binding. Do not reuse the
  temporary AI `AZURE_*` tenant/client values for admin auth
- Auth middleware is applied to all privileged `/admin/*` API routes; only the auth bootstrap
  endpoints are reachable without an existing admin session
- Credentials and secrets must never be hardcoded or committed to source control
- TLS is required — the admin interface must not be served over plain HTTP in any environment

The backend API remains under `/admin/*`, and the operator UI is served on locale-prefixed path routes
under `/{locale}/admin/*`.

## Admin pages

| Page | Purpose |
|---|---|
| Dashboard overview | Aggregate status: recent dispatches, payment states, failures |
| Search and detail | Find a session, draft, or dispatch by any supported field |
| Dispatch timeline | Full event log for a single dispatch attempt |
| Payment timeline | Full event log for a single payment attempt |
| Retention and file-status view | Per-session file asset state and scheduled cleanup times |
| Suspicious activity flags | Flagged sessions for review |

## Admin information architecture

The admin area should stay small but structured. MVP navigation:

1. **Overview**
   - operational summary cards
   - ambiguous-dispatch queue
   - recent refunds
   - suspicious-activity counts
2. **Search**
   - single search surface for session, draft, payment, dispatch, and provider reference lookups
3. **Case detail**
   - a unified case view that links payment timeline, dispatch timeline, retention state, and support
     events
4. **Flags and review**
   - suspicious activity
   - manual-review / escalation status

Do not split admin into many disconnected mini-tools that force operators to jump between pages for a
single case.

## Overview widgets

The dashboard should expose:

- queued / submitted / accepted / rejected / unknown dispatch counts
- payment success/failure/refund counts
- ambiguous-dispatch review queue
- suspicious-activity review queue
- retention cleanup failures

These are operational counters, not marketing vanity metrics.

## Search fields

Any of the following can be used to locate a record:

- Internal draft ID
- Session ID
- Email address
- Payment ID (Stripe charge/intent ID)
- Provider reference number
- Dispatch state
- Refund state

## Allowed admin actions

| Action | Notes |
|---|---|
| Inspect normalized event timeline | Read-only; normalized, not raw provider payload |
| Trigger safe reconciliation | For stuck `dispatch_submitted` states |
| Trigger refund in approved cases | Requires explicit support justification logged as event |
| Mark escalation status | Flags session for human review |
| View suspicious-activity summary | Metadata-first; no hidden content archive |

## Restricted actions

The following are permanently out of scope for the admin interface:

- No silent content editing of letter bodies or addresses
- No direct mutation of canonical provider references
- No hidden bypass around the payment or dispatch state machines

## Support rules

- **Metadata-first support** — use event timelines, state records, and provider references before
  touching letter content
- Content access only if the data is still within the retention window and only when operationally
  necessary
- Every privileged content access must be logged as a `support_event` record
- No permanent content archive capability — content is subject to the same retention policy as
  user-facing data

## Audit rule

Every privileged admin action must emit a `support_event` record with:
- Timestamp
- Action type
- Actor identifier (Microsoft email or preferred_username from the ID token)
- Session or draft reference
- Optional note
