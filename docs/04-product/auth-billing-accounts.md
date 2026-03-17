# Auth, Billing, and Accounts

## Locked direction

- **Guest-first MVP** — no account required to draft, pay, or send. See [`session-management.md`](../05-architecture/session-management.md) for session lifecycle.
- Accounts are optional and deferred to a later phase
- Payment happens in MVP via Stripe (see [`pricing-structure.md`](pricing-structure.md))

## Guest-first model

Users can start drafting, prepare a complete dispatch, reach checkout, and receive confirmation — all without signing up. The guest flow must never silently depend on account-only capabilities.

## Email at checkout — LOCKED

Email collection at checkout is **locked and mandatory**. See [`email-flows.md`](email-flows.md) for full spec (validation, templates, consent rules). Rationale: without email, there is no dependable channel for confirmations or support in a guest session.

## Account scope boundary

Customer accounts are out of launch scope.

- Do not build customer login routes, customer account settings, or dispatch-history surfaces for launch.
- Do not add customer-account schema or session hybrids to the guest model.
- If accounts are reconsidered later, they must start from a fresh documented decision rather than
  from partially reserved MVP scaffolding.

## Billing rules

- Total price visible before payment — no surprises at Stripe Checkout
- Price breakdown accessible (base fee + delivery type + surcharges)
- Refund behavior maps to real dispatch outcomes — see [`pricing-structure.md`](pricing-structure.md)
- CHF only
