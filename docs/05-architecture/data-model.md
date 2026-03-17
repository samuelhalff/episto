# Data Model and Retention

**Status:** Canonical retention direction.
**See also:** [`system-contracts.md`](system-contracts.md), [`database-schema.md`](database-schema.md), [`session-management.md`](session-management.md), [`../08-guardrails/open-decisions.md`](../08-guardrails/open-decisions.md)

---

## Core rule

Persist the minimum data needed to operate, reconcile, support, and audit the product.

Separate:

- short-lived draft content and artifacts
- longer-lived transactional metadata

All retention durations are configurable. Exact production numbers remain open until approved.

---

## Data classes

| Data class | Examples | Retention direction |
|---|---|---|
| Guest access credentials | resume token hash, expiry fields | short-lived |
| Draft content | subject, body, extracted fields, conversation history | short-lived |
| File artifacts | attachments, signature images, rendered PDFs | short-lived |
| Transactional metadata | payment attempts, dispatch attempts, event logs, support events | longer-lived than content |
| Future account data | account records, saved details | not in MVP scope |

---

## Canonical retention rules

1. Never hardcode a retention duration in app logic.
2. Never assume permanent retention for letter content or files.
3. Session expiry, content cleanup, and metadata retention are related but not identical concerns.
4. Cleanup runs in backend jobs, not as ad hoc side effects in request handlers.
5. File deletion is explicit and auditable: mark, delete, then confirm deletion state.
6. Payment and dispatch metadata may outlive guest content because refunds, reconciliation, and support require it.

---

## What remains intentionally open

The following are still open and must stay configurable:

- exact guest resume TTL
- exact short-lived content/file TTL
- exact metadata retention TTL
- exact moderation-metadata retention TTL

Open does not mean optional. It means the application must be able to enforce the policy once approved without a schema rewrite.

---

## File and artifact rules

- Files live in object storage, not database blobs
- Every stored object has a `file_assets` row
- Storage keys are deterministic and namespaced
- Orphaned files are a bug
- Retention cleanup must not depend on full-bucket scans

---

## Guest-first implication

Guest sessions are intentionally recoverable only for a limited period. That does not justify deleting payment or dispatch evidence too early. The product must balance:

- privacy and minimization for letter content
- operational supportability for money and mail events

This balance is directional and locked. The exact numbers are not.
