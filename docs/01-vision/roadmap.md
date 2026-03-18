# Roadmap & Open Decisions

**Product:** Swiss Mail  
**Last updated:** 2026-03-18  
**Status:** Implementation can proceed, but launch still depends on commercial, provider, and locale-readiness gates  
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

**Current phase:** Implementation with launch validation gates. Most modules can proceed in parallel,
but production launch still depends on multiple non-code blockers — see Section 4.

---

## 2. Implementation Readiness

> **Ready for implementation** on all modules except Swiss Post-specific dispatch adapter internals
> that depend on current onboarding docs.

| Category | Status |
|---|---|
| Dispatch provider path | ✅ Locked — Swiss Post Digital Commerce API |
| Hosting topology | ✅ Locked — Infomaniak-centered topology |
| Exact pricing | ✅ Locked — CHF 4.90 standard / CHF 8.90 registered |
| Payment capture strategy | ✅ Locked — authorize first, capture after provider acceptance |
| Retention durations | ✅ Locked — recommended defaults with configurable env vars |
| Signature scope | ✅ Locked — typed name plus optional uploaded image |
| Attachment scope | ✅ Locked — narrow approved file set |
| Email provider | ✅ Locked — Resend |
| AI provider | ✅ Locked — Azure-hosted model API |
| Auth approach | ✅ Locked — guest-first; no accounts at launch |
| Queue strategy | ✅ Locked — BullMQ + Redis |
| Validation strategy | ✅ Locked — shared Zod schemas |
| Monitoring baseline | ✅ Locked — structured logs + error tracking + alerting |
| Admin auth (MVP) | ✅ Locked — HTTP Basic Auth over TLS |
| Address validation | ✅ Locked — soft validation with warnings |
| File policy | ✅ Locked — provisional defaults; narrow PDF/PNG/JPG set |
| Locale direction | ✅ Locked — product targets four Swiss locales; launch enablement is per-locale and quality-gated |

---

## 3. What Can Start Now

Implementation can proceed on these modules without waiting for the remaining blockers:

| Module | Dependency on remaining blockers |
|---|---|
| `sessions` | None |
| `drafting` | None |
| `rendering` | None |
| `files` | None |
| `payments` | None — pricing is locked; production config can proceed |
| `dispatch` | **Adapter shell and state machine: yes.** Adapter internals: blocked on provider. |
| `tracking` | Blocked on provider (same as dispatch) |
| `retention` | None — locked defaults exist |
| `admin` | None |
| Frontend (all routes) | None — uses canonical contracts and shared schemas |

---

## 4. Remaining Launch Blockers

These items **must be resolved before production launch**.
See [Open Decisions](../08-guardrails/open-decisions.md) for the current blocker record.

| # | Item | Type | Blocks | Recommended resolution |
|---|---|---|---|---|
| 1 | Swiss Post onboarding docs + sandbox | Operational | Dispatch adapter internals, tracking | Contact Swiss Post for current Digital Commerce API docs and sandbox access |
| 2 | Provider economics approval | Commercial | Public pricing, margin confidence | Validate Swiss Post commercial terms and support/reconciliation cost against locked launch pricing |
| 3 | Beta / willingness-to-pay validation | Product-market fit | Public launch confidence, funnel assumptions | Run a small beta or structured user-validation cycle on the launch wedge before broad launch |
| 4 | Launch locale readiness | Quality | Drafting quality, trust copy, support handling | Enable each locale only after native-speaker review of drafting, emails, help content, and operational support |
| 5 | Support readiness beyond inbox-only posture | Operational | Refunds, ambiguous dispatch, payment issues | Launch with help content, triage workflow, and daily review path for payment/dispatch exceptions |

> Pricing is locked as a product decision, but commercial approval is still a launch gate. Swiss Post
> onboarding is not the only blocker; provider economics, locale readiness, and support readiness all
> remain launch-critical.

---

## 5. Review Standard

Before any unresolved item is approved for development:

1. **Three options** must be written down
2. **One option** must be recommended
3. **Rejected options** must have a stated reason
4. **Any unresolved blocker** must remain in [open-decisions.md](../08-guardrails/open-decisions.md)

This standard is mandatory. A default that is never stated is not a decision.
