# Session Management

**Status:** Canonical guest-session spec.
**See also:** [`system-contracts.md`](system-contracts.md), [`database-schema.md`](database-schema.md), [`data-model.md`](data-model.md), [`../04-product/email-flows.md`](../04-product/email-flows.md)

---

## Objective

Define how guest sessions are created, resumed, expired, and cleaned up without drifting from the canonical schema.

---

## Locked direction

- MVP is **guest-first**.
- A session is the root container for draft, file, payment, dispatch, and support records.
- The client holds only an opaque guest resume credential.
- Resume behavior and expiry are configurable; recommended defaults are locked in [`open-decisions.md`](../../docs/08-guardrails/open-decisions.md) §4 (72h session TTL, 48h resume trigger). Final values require approval before launch.
- Losing both the browser cookie and the emailed resume link means the user may lose access to the draft. This is an intentional privacy tradeoff in MVP.

---

## Canonical model

The `sessions` table remains the source of truth. Session lifecycle is not modeled as a separate `SessionState` enum.

Relevant fields:

- `id`
- `type`
- `email`
- `locale`
- `resume_token_hash`
- `resume_token_expires_at`
- `expires_at`
- `created_at`
- `updated_at`

Do not introduce a parallel `session_tokens` or `audit_events` schema unless the canonical database docs are updated first.

---

## Order Access (Long-Term)

While **Drafting Sessions** are ephemeral (72h), **Paid Orders** require longer-term access for status checks and receipt downloads.

### Order Access Token

- **Scope:** Read-only access to a specific `order_id` (status, receipt, final PDF).
- **Delivery:** Sent in episto dispatch emails that carry the order-status link after payment succeeds.
- **TTL:** 90 days (configurable via `ORDER_ACCESS_DAYS`).
- **Mechanism:** A signed URL token / JWT-style mechanism distinct from the session cookie, not a raw one-time token that must be emailed at payment capture.
- **Compatibility:** During the transition, the order-status route accepts both signed tokens and legacy hashed links.
- **UX:** Clicking the link opens the "Order Status" page. It does _not_ resurrect the editable draft session.

---

## Session credential

Guest sessions use a single opaque resume token.

Rules:

- **Generate** with `crypto.randomBytes(32).toString('base64url')` — 256-bit entropy, URL-safe encoding
- **Hash** with `crypto.createHash('sha256').update(token).digest('hex')` before storing in `resume_token_hash`
- **Store** only the hash server-side; never persist the raw token
- **Send** the raw token only via `Set-Cookie` (HttpOnly, Secure, SameSite=Lax) and in the emailed resume link
- **Never log** the raw token — redact in all structured log output
- **Expire** the token when the session expires or when support/admin explicitly invalidates it
- **Cookie name:** `__Host-session` (the `__Host-` prefix enforces Secure + no Domain + Path=/)

The cookie and resume link represent the same credential. Resume is time-limited, not single-use, for MVP.

### Token validation flow

```
1. Extract token from cookie or /resume/:token URL param
2. Hash the token: sha256(token)
3. Query: SELECT * FROM sessions WHERE resume_token_hash = $hash
4. Reject if: row not found, resume_token_expires_at < NOW(), or expires_at < NOW()
5. Accept: reissue cookie with same token, return session
```

Rate-limit resume token lookups to prevent brute-force: max 10 attempts per IP per minute.

---

## Creation flow

1. User hits the app without a valid session
2. Backend creates a `guest` session row
3. Backend generates a resume token, stores its hash, and sets expiry fields from config
4. Backend sets the secure session cookie
5. Draft creation remains a separate step from session creation

The system must not require email at session creation. Email is collected later at checkout.

---

## Resume flow

1. User follows `/resume/:token`
2. Backend hashes the token and looks up the matching session
3. Backend rejects missing, expired, or invalidated tokens
4. Backend reissues the cookie and returns the destination needed to continue the draft flow

Required outcomes:

- valid token: restore guest access
- expired or unknown token: show an expired/not-found flow and offer a new draft
- no token leakage in logs or analytics

Resume does not imply cross-device history beyond the current guest session. It restores only that single session.

---

## Expiry and retention behavior

Session truth splits into three concerns:

- **draft access window:** how long the guest can resume the draft (72h default)
- **order access window:** how long a paid customer can view status/receipts (90 days default)
- **retention window:** how long short-lived draft content and files remain available operationally

The access window and the content-retention window may be different, but both must be configurable.

Current locked defaults from [`open-decisions.md`](../../docs/08-guardrails/open-decisions.md) §4:

- guest session TTL: 72 hours (`SESSION_TTL_HOURS`)
- draft content + files: 7 days after last activity (`CONTENT_RETENTION_DAYS`)
- rendered PDFs: 24 hours after dispatch confirmation (`PDF_RETENTION_HOURS_POST_DISPATCH`)
- transactional metadata: 7 years (`METADATA_RETENTION_YEARS`)
- resume link trigger: 48 hours of inactivity (`RESUME_INACTIVITY_HOURS`)

All durations are loaded from environment config, not hardcoded. Final production values require
explicit approval before launch.

---

## What expires vs what remains

When a guest session expires:

- the resume credential stops working
- draft access may end
- short-lived content and file cleanup becomes eligible

But the system may still retain:

- payment metadata
- dispatch metadata
- support and audit metadata

This is required for reconciliation, refunds, and support.

---

## Security rules

- cookie is `HttpOnly`, `Secure`, `SameSite=Lax`
- all mutating requests still require same-origin protection
- session tokens are opaque and non-guessable
- session identifiers are never exposed as credentials
- privileged support/admin access to session-linked content must be logged

Do not treat the guest session as an account or as a long-term identity layer.

---

## Edge cases

### Cleared cookies

If the user clears cookies, the browser loses direct access to the session. Recovery requires the emailed resume link if one exists.

### Concurrent tabs

Multiple tabs may share the same guest session. Draft conflict handling belongs to the draft/versioning contract, not to a separate session-state machine.

### Payment and dispatch after expiry

If a session expires while payment, refund, or dispatch reconciliation is still in flight, operational processing continues from backend records. User access may expire even while operational metadata remains active.

---

## Implementation rules

- all TTLs come from config
- do not hardcode cookie `Max-Age` or session expiry numbers in source
- keep session middleware thin and schema-aligned
- do not add account-specific auth logic to the guest flow
- if account support is introduced later, document a separate account-session mechanism instead of mutating the guest model into a hybrid

---

## Still open

| Decision                                                     | Status                                                          |
| ------------------------------------------------------------ | --------------------------------------------------------------- |
| Exact guest resume TTL                                       | Locked: 72 hours (`SESSION_TTL_HOURS=72`)                       |
| Exact draft/content expiry TTL                               | Locked: 7 days after last activity (`CONTENT_RETENTION_DAYS=7`) |
| Exact cookie name                                            | Locked: `__Host-session`                                        |
| Resume email inactivity trigger                              | Locked: 48 hours (`RESUME_INACTIVITY_HOURS=48`)                 |
| Whether admin can invalidate a guest session manually in MVP | Open but non-blocking                                           |
