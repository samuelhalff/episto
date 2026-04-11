# Security and Privacy

**Status:** Authoritative operational constraints  
**Scope:** Runtime security, privacy posture, retention boundaries, secrets handling, and
production hardening rules. This file does not define product copy or provider capability claims on
its own.
**See also:** [`../08-guardrails/swiss-post-api-reference-map.md`](../08-guardrails/swiss-post-api-reference-map.md), [`../08-guardrails/swiss-post-appendix.md`](../08-guardrails/swiss-post-appendix.md)

## Core posture

- Collect the minimum data needed to draft, pay, dispatch, support, and reconcile
- Separate letter-content retention from transactional metadata retention
- Keep admin access narrow, authenticated, and auditable
- Treat AI output as suggestion, never as authority
- Retain only the minimum provider metadata needed to re-query or reconcile dispatch state

## Security rules

- Encrypt data in transit (TLS required on all routes) and at rest where the hosting platform
  supports it
- Keep all provider secrets and API keys server-side only — never in frontend bundles
- Use short-lived signed tokens for guest resume flows
- Log all privileged support and admin actions as `support_event` records
- Isolate raw provider payloads from user-facing rendering — normalize before exposing
- Do not persist raw ePost request or response payloads for admin inspection or convenience

## Security headers — LOCKED (IMPROV-7)

This is the canonical source for all security header values. Other docs (e.g., deployment-and-ci.md)
must reference this section rather than redefine values.

The following HTTP response headers must be set on all application responses:

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `X-XSS-Protection` | `0` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(self), geolocation=()` |

### Content Security Policy

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://js.stripe.com;
  frame-src https://js.stripe.com https://hooks.stripe.com;
  connect-src 'self' https://api.stripe.com;
  img-src 'self' data: https:;
  style-src 'self' 'unsafe-inline';
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
```

Adjust `connect-src` to include any analytics or monitoring endpoints used.

The CSP `unsafe-inline` for styles is a known concession for Tailwind in development; tighten it
with nonces in production when the rendering pipeline is stable.

## CORS policy — LOCKED

**Same-origin only.**

- No `Access-Control-Allow-Origin: *` on any route
- No third-party origin allowlist unless explicitly required by a documented integration
- Admin routes: same-origin only
- Webhook intake routes: restricted to known provider IP ranges where available; signature
  verification is mandatory regardless

## Privacy rules

- Do not retain letter content longer than the configurable retention window
- Do not keep attachments or rendered PDFs "just in case" — delete on policy expiry
- Dictation audio is transit-only: stream/upload it for transcription, but do not persist raw audio
  in storage, logs, or support tooling
- Do not create hidden permanent archives from application logs
- Content retention and transactional metadata retention use separate, configurable TTLs
- Provider retention must stay metadata-first: keep references, normalized state, timestamps, and
  failure categories only

## Data access and deletion operations

Data-access and deletion handling must remain truthful about what can and cannot be removed.

Rules:

- verify the requester before disclosing or acting on account-linked data
- treat short-lived letter content and long-lived transactional metadata differently
- delete or expire short-lived content when policy and law allow
- retain metadata that must stay for reconciliation, accounting, or audit obligations
- log privileged support/admin access and deletion-related operational actions

Operational consequence:

- a deletion request must not be answered with a false promise that all payment/dispatch metadata can
  vanish immediately if legal retention still applies
- a data-access response must prefer normalized records and metadata over raw provider payloads
- vendor-side data boundaries (Stripe, Resend, Azure AI, Swiss Post) must be explained honestly rather
  than assumed away

### User data-access request handling

Minimum workflow:

1. verify the requester identity strongly enough for the access level requested
2. determine which records can be disclosed directly from canonical application data
3. provide normalized data rather than raw provider or infrastructure internals where possible
4. record that the access request was handled and by whom

The goal is truthful disclosure, not an indiscriminate database dump.

Response SLA: acknowledge within 5 business days, fulfill within 30 calendar days (aligned with
nDSG/FADP expectations). If complex, communicate the extended timeline to the requester.

Disclosable data classes:

| Class | Source | Format |
|---|---|---|
| Draft content and conversation | Application DB | JSON export |
| Recipient and sender addresses | Application DB | JSON export |
| Uploaded files and signatures | Object storage | Original file format |
| Payment amounts, dates, state | Application DB | JSON export |
| Dispatch state and reference | Application DB | JSON export |
| Email addresses on file | Application DB | JSON export |
| Session metadata (locale, created) | Application DB | JSON export |

Do not include:
- raw Stripe payment tokens or card fingerprints (these live provider-side)
- internal admin/support event logs (operational, not user-owned)
- hashed resume tokens (not useful to the user)

### Deletion request handling

Deletion handling must distinguish between:

- short-lived draft content and files (deletable after retention window)
- operational metadata required for support and reconciliation (retained per policy)
- legally retained payment and accounting records (retained per Swiss accounting law, typically 10 years)

Minimum workflow:

1. verify the requester
2. identify which data classes are eligible for deletion or earlier purge
3. explain clearly which records must remain for legal or operational reasons
4. execute the allowed deletion/redaction path
5. record the action in an auditable operational trail
6. confirm completion to the requester with a summary of what was removed

### Redaction format

When a field is redacted rather than deleted (because the row must remain for accounting or
reconciliation):

- text fields: replace with `[REDACTED]`
- email fields: replace with `redacted@redacted.invalid`
- file assets: delete from object storage; set metadata `deletedAt` timestamp
- keep the row itself with its ID, timestamps, and state fields intact

Never NULL a field that was redacted — the `[REDACTED]` marker proves the field existed and was
deliberately removed.

### Provider-side data coordination

| Provider | User data held | Deletion mechanism | Notes |
|---|---|---|---|
| Stripe | Payment method tokens, charge records | Stripe Dashboard or API (`Customer.delete`) | Stripe retains records for their own compliance; deletion removes from our Stripe account |
| Resend | Transactional email logs | Resend retention auto-expires | We do not store email bodies; Resend logs are time-limited by their policy |
| Azure AI | Request/response logs | Azure data retention settings | We do not persist prompts or completions beyond the AI call; Azure log retention is configurable |
| Swiss Post | Dispatch reference, submission payload | No self-service deletion available | Explain honestly: dispatch records are held by the postal provider and cannot be removed on demand |

When processing a deletion request, document which providers were contacted or acknowledged and
which retain data outside our control.

### ePost minimal-retention rule

For ePost-backed dispatches, application storage may retain only the minimum provider metadata
needed to support reconciliation and support operations:

- provider name
- provider reference
- tracking number when a real one exists
- normalized dispatch state
- normalized failure reason
- submission and last-check timestamps

Application storage must **not** retain raw ePost request payloads, raw ePost response payloads, or
raw status-event blobs as an admin convenience feature.

### Audit record for access and deletion actions

Every data-access or deletion action must produce a `support_event` record with:

- `actor`: admin/support user identifier
- `action`: `data_access_fulfilled` or `data_deletion_executed`
- `scope`: list of data classes affected
- `timestamp`: when the action was completed
- `requestRef`: reference to the original request (email, ticket ID)
- `retainedClasses`: which data classes were NOT deleted and why

Audit records are retained independently of the data they describe. Minimum retention for audit
records: 3 years (configurable via `AUDIT_RETENTION_DAYS`).

Do not promise "full deletion everywhere immediately" when provider-side or legally retained records
still exist.

## Abuse and impersonation

The product must account for:

| Risk | Mitigation |
|---|---|
| Company-name or brand misuse in letters | Content flagging, not pre-approval; support escalation path |
| Third-party representation abuse | Clear non-legal-service disclaimer; audit trail |
| Abusive or threatening letter content | Detection and refusal policy; documented in moderation rules |
| Repeated suspicious failure/refund patterns | Flagged in admin dashboard for manual review |

## Legal-service boundary

Swiss Mail is not a substitute for legal counsel.

The product must not:
- Claim to certify the legal correctness of any letter
- Market itself as legal advice
- Imply that registered sending alone makes letter content legally valid

## Compliance note

Design around Swiss data-protection expectations (nDSG / FADP). Keep controller/processor
boundaries explicit once providers are finalized. Do not bake in provider-specific data-residency
assumptions before the hosting topology is locked.
