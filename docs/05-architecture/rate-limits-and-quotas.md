# Rate Limits and Quotas

**Status:** Authoritative architecture policy  
**Scope:** Request throttling, session quotas, SSE connection posture, and launch-safe usage ceilings.  
**See also:** [`api-contracts.md`](api-contracts.md) ·
[`../07-operations/deployment-and-ci.md`](../07-operations/deployment-and-ci.md) ·
[`../07-operations/abuse-and-fraud-ops.md`](../07-operations/abuse-and-fraud-ops.md)

---

## Core rule

Rate limits and quotas exist to protect:

- service availability
- AI and rendering cost
- provider reputation
- honest guest-session behavior

They are not business features and must not be exposed as marketing claims.

All limits must remain configuration-backed even when this document defines the launch defaults.

---

## 1. Keying strategy

Use the narrowest stable key that matches the risk:

| Surface | Key |
|---|---|
| Public session bootstrap | IP |
| Guest-app behavior after session creation | Session |
| Resume token validation | IP |
| Admin actions | Admin credential context + request source |
| Provider webhooks | Provider signature verification + idempotency, not client rate limits |

Do not key sensitive product limits off raw letter content.

---

## 2. Launch default limits

These values must stay in sync with [`api-contracts.md`](api-contracts.md).

| Endpoint / concern | Limit | Window | Key |
|---|---|---|---|
| `POST /api/v1/sessions` | 60 | 1 hour | IP |
| `GET /api/v1/sessions/current` | 60 | 1 min | Session |
| `PATCH /api/v1/sessions/current` | 20 | 1 min | Session |
| `GET /api/v1/resume/:token` | 20 | 1 hour | IP |
| `POST /api/v1/drafts` | 20 | 1 day | Session |
| `GET /api/v1/drafts/:id` | 120 | 1 min | Session |
| `PATCH /api/v1/drafts/:id` | 120 | 1 min | Session |
| `POST /api/v1/drafts/:id/review` | 30 | 1 hour | Session |
| `GET /api/v1/drafts/:id/preview` | 120 | 1 min | Session |
| `POST /api/v1/drafts/:id/messages` | 30 | 1 hour | Session |
| `GET /api/v1/drafts/:id/messages` | 60 | 1 min | Session |
| `GET /api/v1/drafts/:id/stream` | 1 shared steady-state connection per active draft per tab; short reconnect overlap tolerated | — | Session + Draft |
| `PUT /api/v1/drafts/:id/sender` | 60 | 1 min | Session |
| `PUT /api/v1/drafts/:id/recipient` | 60 | 1 min | Session |
| `POST /api/v1/drafts/:id/files` | 20 | 1 hour | Session |
| `GET /api/v1/drafts/:id/files` | 120 | 1 min | Session |
| `DELETE /api/v1/drafts/:id/files/:fileId` | 30 | 1 min | Session |
| `GET /api/v1/files/:fileId/download` | 30 | 1 min | Session |
| `POST /api/v1/drafts/:id/checkout` | 10 | 1 hour | Session |
| `GET /api/v1/drafts/:id/payment` | 60 | 1 min | Session |
| `POST /api/v1/webhooks/stripe` | no client-facing rate limit | — | signature + idempotency |
| `GET /api/v1/drafts/:id/dispatch` | 60 | 1 min | Session |
| `POST /api/v1/drafts/:id/dispatch/retry` | 10 | 1 hour | Admin |
| `GET /api/v1/admin/search` | 60 | 1 min | Admin |
| `GET /api/v1/admin/drafts/:id/timeline` | 30 | 1 min | Admin |
| `POST /api/v1/admin/drafts/:id/refund` | 10 | 1 hour | Admin |
| `POST /api/v1/admin/drafts/:id/reconcile` | 10 | 1 hour | Admin |

---

## 3. Product quotas

Launch quota posture:

- max 20 drafts per session per day
- max 10 messages per draft
- max 5 attachments per draft
- max total upload per draft: 20 MB
- max 1 signature image per draft

File-size and attachment-type rules remain defined in the product/file docs. This document explains
their operational role: they are also abuse and cost-control boundaries.

---

## 4. SSE connection rule

The SSE rule is not "open as many streams as you want until the browser fails."

Canonical behavior:

- one shared `EventSource` per active draft per tab
- multiple hooks consume normalized state from the shared stream layer
- the server may briefly tolerate overlap during reconnect
- duplicate same-session+draft streams should be replaced quickly

This protects:

- browser connection budgets
- server connection counts
- duplicate event handling
- mobile reliability

---

## 5. Webhook posture

Stripe webhook intake is protected by:

- signature verification
- idempotent event handling
- duplicate event suppression

Do not apply a naive client-style rate limit that risks rejecting legitimate Stripe retries. The
defense here is authenticity + idempotency, not generic throttling.

---

## 6. Relationship to abuse review

When rate limits or quotas are hit repeatedly, the event should feed:

- operational monitoring
- abuse/fraud review where patterns look suspicious

Do not silently treat repeated throttling as normal user behavior if it is obviously abusive or
bot-like.

---

## 7. Launch gate

Before launch:

- the numeric defaults above are implemented and tested
- `api-contracts.md` is in sync with this document
- SSE connection handling matches the shared-stream rule
- Stripe webhook idempotency is verified
- repeated throttling can be observed operationally

If these conditions are missing, public launch is unsafe.
