# Product Scope & Positioning

**Product:** Swiss Mail  
**Last updated:** 2026-03-15  
**Status:** Decided — forms part of the pre-dev gate  
**See also:** [Overview](overview.md) · [Business Model](business-model.md) · [User Flows](../03-ux/user-flows.md) · [Non-Goals](../08-guardrails/non-goals.md)

---

## 1. Objective

Define what Swiss Mail is in MVP terms, what it explicitly is not, and where the trust and abuse boundaries lie.

---

## 2. Positioning

Swiss Mail is a **premium formal-letter product with integrated Swiss postal dispatch.**

This is not a mail service startup. It is a tool that helps people prepare and send serious letters properly, with minimal friction.

### What the product actually is

- A **letter preparation tool** — the core value is in the drafting, not the dispatch
- AI-assisted — describe what you need; the system writes the formal letter for you
- Quality-obsessed — high-quality letter structure, tone control, proper formatting
- Confidence-building — excellent preview, zone editing, unhurried review before send
- Mobile-native — draft and review from your phone, including voice dictation
- Guest-first — no account, no friction, just results
- Honest — never claim "delivered" when we mean "submitted to carrier"

### What the product is NOT

- Not a mail utility or "send a PDF" service
- Not a price competitor to SuperPost (CHF 2.50)
- Not a template catalog
- Not a word processor with a send button

### Core Differentiator

> **We do not compete on price. We compete on the quality and ease of producing a professional letter.**
>
> SuperPost sends letters for CHF 2.50. They are a dispatch service — bring your own document. Swiss Mail is a letter preparation service with dispatch built in. The value is: you describe what you need, and in minutes you have a properly structured, correctly toned, professionally formatted letter ready to send. No blank-page anxiety, no formatting research, no "how do I write a formal Kündigung?" search.
>
> The business is viable if users will pay for a clearly more professional and reassuring result — especially for high-stakes correspondence: complaints, cancellations with consequences, tenancy disputes, insurance matters, demand letters.

### MVP Experience Priorities

These are ordered by importance to the product thesis:

1. **High-quality letter structure** — correct formal structure for each use case
2. **Tone control** — formal, neutral, or firm; appropriate for the situation
3. **Good subject line generation** — clear, purposeful, professional
4. **Excellent preview** — see exactly what will be printed, in real time
5. **Excellent zone editing** — edit any part of the letter with precision
6. **Excellent mobile review flow** — confident review and approval from a phone
7. **Confidence before send** — the user feels certain before they pay

Lower priority for MVP:
- Broad template catalogs
- Mail utility features (bulk, merge, API)
- Price-competitive positioning

### Brand Direction

**Product thesis territory:** *"Prepare and send serious letters properly, with minimal friction."*

**Tagline territory:** *"Mail, made simple"*

> The product name is locked for implementation and launch preparation as **Swiss Mail**. See [Naming & Identity](../02-brand/naming-and-identity.md).

---

## 3. MVP In Scope

| Feature | Notes |
|---|---|
| Formal letters for Switzerland | Consumer correspondence; all four Swiss languages |
| Typing and dictation input | Mobile-first; voice as a first-class path |
| Sender and recipient capture | With soft address validation and user correction |
| AI-assisted draft generation | Structured intent extraction; not free-form chat |
| One controlled A4 template | Single layout; no arbitrary formatting |
| User review and editing | Clear unhurried review step before payment |
| Standard and registered delivery | Both in scope; exact tracking depth remains provider-dependent |
| Checkout and dispatch confirmation | Stripe, CHF only |
| Reference/tracking display | What is actually known — never overclaimed |

---

## 4. MVP Out of Scope

| Excluded Feature | Reason |
|---|---|
| Arbitrary document layouts | One controlled template keeps quality and rendering predictable |
| Full word-processor behavior | Scope creep; unnecessary for letter drafting |
| Deep B2B template management | V2 direction; not MVP complexity |
| Legal advice product positioning | Trust boundary — see Section 6 |
| Complex role and delegation models | Account system is guest-first only at launch |
| International sending | Switzerland only for MVP |
| Long-term content archiving by default | Retention is configurable and short by default |

See [Non-Goals & Forbidden Shortcuts](../08-guardrails/non-goals.md) for the full list of things that must not be built or faked.

---

## 5. Guest-First Access Model

The MVP must not require account creation to draft and send a letter.

- **Session-based** guest flow from start to dispatch
- **Save details** optionally offered after a successful send (future)
- **Account features** are v2 scope; the architecture must not block them, but must not build them prematurely

See [Open Decisions](../08-guardrails/open-decisions.md) — item 6 (account scope).

---

## 6. Trust Boundaries

Swiss Mail is **administrative assistance**, not a law firm and not a legal-advice engine.

The product may help users draft serious letters, but it must not:

- Claim legal validity it cannot prove
- Imply guaranteed legal outcomes
- Present generated text as reviewed legal counsel
- Show dispatch status as stronger than what the postal provider actually confirms

> AI output is a draft. The user reviews and owns the final content. The product facilitates sending; it does not guarantee outcomes.

See [Voice & Tone](../02-brand/voice-and-tone.md) for how these constraints translate into user-facing language.

---

## 7. Abuse Posture

Broad letter scope is acceptable only if guardrails are first-class. Before launch:

- Content policy and refusal rules must be implemented
- Misuse detection must be in place
- Suspicious sender representation (impersonation) must be checked
- Support and admin escalation paths must exist

> Broad scope without abuse controls is not acceptable. See [AI Implementation Rules](../08-guardrails/ai-implementation-rules.md) for the technical guardrails.

---

## 8. Future Path

The likely v2 B2B direction:

- Company templates and letterhead
- Field and zone mapping
- Team usage and roles
- Subscription tiers
- Higher-volume workflows

**The MVP must not block this future path, but must not optimize for it prematurely.**

Architecture decisions (modular monolith, adapter pattern, shared schema layer) are designed with this in mind. No premature B2B abstractions in the MVP codebase.
