# Build Tasks

**Status:** Core product work is complete. Remaining work is launch readiness, external provider onboarding,
and final compliance checks.
**Upstream:** [Roadmap](docs/01-vision/roadmap.md)
**Guidelines:** [Copilot Instructions](.github/copilot-instructions.md)
**Workflow preference:** Work directly on `main` in this repository. Do not create extra worktrees or
feature branches unless the user explicitly asks for them. Use regular, descriptive commits while working.

---

## Implemented

- [x] Shared contracts, schemas, enums, state machines, and query keys
- [x] Guest-first backend modules for sessions, drafting, files, payments, dispatch, rendering, retention,
      admin, and order-status access
- [x] Frontend drafting, review, checkout, confirmation, resume, and marketing routes across all target
      locales
- [x] Queue workers, structured logging, analytics, error handling, and retention cleanup
- [x] Repository guardrails: strict lint/typecheck/build gates, coverage thresholds, file-size guard, Husky
      staged checks, and migration rollback verification

## Remaining external or blocked work

> **Status note (2026-07-25):** production now runs `EPOST_SUBMISSION_MODE=live` and a real
> end-to-end order has been accepted by Swiss Post via ePost (deliveryId + tracking stored and shown
> on the justificatif). Stripe and Resend are also live in production. The items below track remaining
> hardening/validation, not basic feasibility.

- [ ] Swiss Post sandbox onboarding and validated dispatch contract details
- [ ] Tracking provider confirmation; current tracking capabilities remain explicitly unconfirmed in docs
- [ ] Stripe live-mode verification and bank account setup
- [ ] Native-speaker locale review
- [ ] Pricing validation against real operating costs

## Remaining launch checks

- [x] Dispatch cutover review before changing `EPOST_SUBMISSION_MODE` away from `mock` — done; prod runs `live` with a proven accepted dispatch (2026-07-25)
- [ ] Accessibility testing to WCAG AA standard
- [ ] Final pre-launch checklist in [docs/07-operations/pre-launch-checklist.md](docs/07-operations/pre-launch-checklist.md)

## Security follow-ups

- [x] `drizzle-orm` upgraded to `0.45.2` (installed + locked), closing
      [GHSA-gpj5-g38j-94v9](https://github.com/advisories/GHSA-gpj5-g38j-94v9)
      (SQL identifier escaping). Full backend test suite passes on this version
      (842 tests green, 2026-07-25).
- [x] `script-src 'unsafe-inline'` removed via per-request nonces (`frontend/src/lib/csp.ts`,
      set by `src/proxy.ts`; theme-init + GA scripts carry the nonce). `'unsafe-inline'` remains
      only as a fallback when the proxy is bypassed. `style-src 'unsafe-inline'` is retained
      intentionally (React/styled-jsx inline styles; removing it needs a full CSS-Modules
      migration for negligible gain since styles cannot execute scripts).
