# Roadmap & Open Decisions

**Product:** Swiss Mail  
**Last updated:** 2026-03-17  
**Status:** Foundation phase — TypeScript boundaries prepared; feature implementation not yet started  
**See also:** [Overview](overview.md) · [Open Decisions](../08-guardrails/open-decisions.md) · [Provider Certainties](../08-guardrails/provider-certainties.md)

---

## 1. Phase Status

The documentation and design phases are complete. A TypeScript monorepo foundation
(`frontend/`, `backend/`, `shared/`) exists with shared enums and type boundaries.

| Phase | Goal | Status |
|---|---|---|
| 1 — Operational Clarity | Remove provider and ops ambiguity | ✅ Complete — guardrails, provider certainties, and decision log in place |
| 2 — Architecture Freeze | Implementation-grade technical decisions | ✅ Complete — stack, contracts, schemas, state machines locked |
| 3 — Build Packs | AI-safe implementation blueprints | ✅ Complete — frontend, backend, admin build packs; guardrails; error taxonomy; i18n; dev workflow |
| 4 — Pre-Dev Gate | Final review before implementation | ✅ Complete — doc hardening and recursive closeout passed |

**Current phase:** Implementation. Most modules can proceed in parallel. Three open decisions
remain — see Section 4.

---

## 2. Implementation Readiness

> **Ready for implementation** on all modules except dispatch adapter internals (blocked on
> provider decision).

| Category | Status |
|---|---|
| Dispatch provider path | 🔴 **OPEN** — blocks dispatch adapter internals only |
| Hosting topology | 🟡 **OPEN** — Option A (managed PaaS) recommended; blocks infra provisioning |
| Exact pricing | 🟡 **OPEN** — CHF 4.90/8.90 recommended; blocks launch copy and Stripe config |
| Payment capture strategy | ✅ Locked — authorize first, capture after provider acceptance |
| Retention durations | ✅ Locked — recommended defaults with configurable env vars |
| Signature scope | ✅ Locked — typed name plus optional uploaded image |
| Attachment scope | ✅ Locked — narrow approved file set |
| Email provider | ✅ Locked — Resend |
| AI provider | ✅ Locked — Claude API (Anthropic) |
| Auth approach | ✅ Locked — guest-first; no accounts at launch |
| Queue strategy | ✅ Locked — BullMQ + Redis |
| Validation strategy | ✅ Locked — shared Zod schemas |
| Monitoring baseline | ✅ Locked — structured logs + error tracking + alerting |
| Admin auth (MVP) | ✅ Locked — HTTP Basic Auth over TLS |
| Address validation | ✅ Locked — soft validation with warnings |
| File policy | ✅ Locked — provisional defaults; narrow PDF/PNG/JPG set |

---

## 3. What Can Start Now

Implementation can proceed on these modules without waiting for the three open decisions:

| Module | Dependency on open decisions |
|---|---|
| `sessions` | None |
| `drafting` | None |
| `rendering` | None |
| `files` | None |
| `payments` | Stripe config needs final pricing for production; dev/test can use test amounts |
| `dispatch` | **Adapter shell and state machine: yes.** Adapter internals: blocked on provider. |
| `tracking` | Blocked on provider (same as dispatch) |
| `retention` | None — locked defaults exist |
| `admin` | None |
| Frontend (all routes) | None — uses canonical contracts and shared schemas |

---

## 4. Remaining Open Decisions

These items **must be resolved before production launch** on the modules they affect.
See [Open Decisions](../08-guardrails/open-decisions.md) for full analysis and recommendations.

| # | Decision | Blocks | Recommended resolution |
|---|---|---|---|
| 1 | Dispatch provider path | Dispatch adapter internals, tracking | Contact KLARA for sandbox and current API docs |
| 2 | Hosting topology | Infra provisioning | Lock Option A (managed PaaS); migrate to Swiss-hosted later if needed |
| 3 | Exact pricing | Launch copy, Stripe config | Approve CHF 4.90 standard / CHF 8.90 registered |

> Recommended resolution order: #2 → #3 (internal decisions) → #1 (requires provider contact).

---

## 5. Review Standard

Before any unresolved item is approved for development:

1. **Three options** must be written down
2. **One option** must be recommended
3. **Rejected options** must have a stated reason
4. **Any unresolved blocker** must remain in [open-decisions.md](../08-guardrails/open-decisions.md)

This standard is mandatory. A default that is never stated is not a decision.
