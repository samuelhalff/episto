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

- [ ] Swiss Post sandbox onboarding and validated dispatch contract details
- [ ] Tracking provider confirmation; current tracking capabilities remain explicitly unconfirmed in docs
- [ ] Stripe live-mode verification and bank account setup
- [ ] Native-speaker locale review
- [ ] Pricing validation against real operating costs

## Remaining launch checks

- [ ] Dispatch cutover review before changing `EPOST_SUBMISSION_MODE` away from `mock`
- [ ] Accessibility testing to WCAG AA standard
- [ ] Final pre-launch checklist in [docs/07-operations/pre-launch-checklist.md](docs/07-operations/pre-launch-checklist.md)

## Security follow-ups

- [ ] Upgrade `drizzle-orm` from 0.33.0 to ≥0.45.2 to patch
      [GHSA-gpj5-g38j-94v9](https://github.com/advisories/GHSA-gpj5-g38j-94v9)
      (SQL identifier escaping). This is a breaking change — the query builder API
      shifted between 0.33 → 0.45. Audit all `db.select()/insert()/update()/delete()`
      call sites and any custom `sql` template usage before merging. Run the full
      backend test suite plus migration rollback verification against the upgraded
      version. Current risk is low because no user input flows into SQL identifiers
      (tables/columns), but the CVE should still be closed before go-live.
- [ ] Reduce Next.js CSP `script-src 'unsafe-inline'` by adopting nonces for the
      hydration/theme-init scripts (`frontend/next.config.ts`,
      `frontend/src/app/layout.tsx`).
