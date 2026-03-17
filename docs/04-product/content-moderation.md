# Content Moderation

**Status:** Locked moderation posture for MVP.
**See also:** [`ai-provider-and-prompts.md`](ai-provider-and-prompts.md), [`letter-generation.md`](letter-generation.md), [`../08-guardrails/non-goals.md`](../08-guardrails/non-goals.md)

---

## Objective

Allow legitimate formal Swiss correspondence while blocking genuinely harmful misuse.

---

## Core moderation stance

- Formal complaints, demands, cancellations, and legal correspondence are legitimate product use.
- Strong but lawful wording is not a moderation failure by itself.
- Moderation exists to prevent harm, fraud, impersonation, threats, and abusive misuse.
- The system must be auditable at the metadata level without becoming a content warehouse.

---

## Allowed content

The AI path may assist with:

- complaints
- cancellation letters
- tenancy and employment correspondence
- payment demands and refund requests
- insurance and subscription disputes
- data-access or deletion requests
- references to legal rights or legal next steps when supplied by the user

Allowed does not mean legally verified. The product still must not present AI output as legal advice.

---

## Blocked content

The system must refuse AI drafting for:

- threats of physical harm
- extortion
- fraud or deception instructions
- impersonation of authorities or officials
- discriminatory or targeted hateful harassment
- child exploitation content
- requests to fabricate facts or knowingly false claims
- instructions to help commit illegal acts

These categories must be enforced both by prompt policy and by backend validation. A single model refusal is not enough protection.

---

## Flagged but not auto-blocked

Some content should be logged for abuse analysis without being blocked by default:

- repeated similar letters to many recipients
- suspicious third-party representation patterns
- high-conflict disputes that need support visibility
- repeated payment/refund/dispatch failure patterns tied to the same session or email

The log is metadata-first:

- session ID
- draft ID
- flag category
- timestamp
- whether AI generation was blocked, allowed, or manually edited

Do not log full letter body content into moderation telemetry by default.

---

## Implementation shape

Moderation happens in three layers:

1. Pre-generation intent/risk classification
2. Generation prompt policy
3. Post-generation validation

Required behavior:

- blocked requests do not proceed to AI draft generation
- flagged requests may proceed, but are marked for admin/support visibility
- post-generation validation can suppress unsafe output before it reaches the user
- users always retain a truthful manual-edit fallback when AI refuses

MVP does not require a separate external moderation API.

---

## Attachment boundary

Attachment contents are out of scope for moderation in MVP.

What is checked:

- MIME type
- file size
- malware scanning if enabled operationally
- page count or metadata needed for dispatch/pricing

What is not checked:

- semantic reading of attachment contents
- attachment classification by an AI provider
- attachment text extraction for policy review

This boundary protects the product's privacy posture and avoids inventing a document-review capability the system does not actually provide.

---

## User-facing refusal rules

When AI refuses:

- explain the refusal category in plain language
- do not accuse the user of criminal conduct
- offer manual editing where that remains safe
- offer support contact where appropriate

Never say:

- "your case was reported"
- "your letter is illegal"
- anything that implies human legal review occurred when it did not

---

## Ops and admin rules

- No real-time human moderation queue for MVP
- Admin sees moderation metadata, not a permanent archive of content
- Repeated abuse patterns may be escalated through support/admin workflows
- Moderation events follow the same retention discipline as other operational metadata and must remain configurable

---

## Still open

| Decision | Status |
|---|---|
| Exact abuse thresholds for repeated-session flagging | Open — requires operational experience before setting |
| Whether to add a separate moderation vendor later | Post-MVP unless explicitly approved |

Moderation metadata retention follows the operational metadata retention policy locked in
[`open-decisions.md`](../08-guardrails/open-decisions.md) §4. The duration is loaded from
configuration (`METADATA_RETENTION_YEARS`), not hardcoded.
