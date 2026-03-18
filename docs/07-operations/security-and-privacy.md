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

## Security rules

- Encrypt data in transit (TLS required on all routes) and at rest where the hosting platform
  supports it
- Keep all provider secrets and API keys server-side only — never in frontend bundles
- Use short-lived signed tokens for guest resume flows
- Log all privileged support and admin actions as `support_event` records
- Isolate raw provider payloads from user-facing rendering — normalize before exposing

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
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

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
- Do not create hidden permanent archives from application logs
- Content retention and transactional metadata retention use separate, configurable TTLs

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
