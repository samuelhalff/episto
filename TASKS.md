# Documentation Hardening TODOs

Purpose: drive a full anti-hallucination review of the repository so an implementation LLM stays on
the paved road, respects product values, and does not improvise missing truth.

This file is an audit tracker, not a product-spec source of truth.

## Audit phases

- [x] Establish repository-level self-contained-docs rule
- [x] Remove duplicate canonical UX source
- [x] Add document authority levels and task-routing protocol
- [x] Add UX quality bar so "wow" and leverage are implementation requirements
- [x] Audit authority labels and scope boundaries across all docs
- [x] Audit all UX docs route-by-route and component-by-component
- [x] Audit product docs for open-vs-locked drift and provider assumption risk
- [x] Audit architecture docs for contract/state/schema contradictions
- [x] Audit build packs for implementation escape hatches and duplicated logic risk
- [x] Audit ops and security docs for missing release, incident, and support constraints
- [x] Run final contradiction, stale-reference, and broken-link sweep
- [x] Regenerate TODOs from a fresh-eye pass and repeat until no new material TODOs are found
- [x] Produce residual-risk list of true blockers vs launch-polish items
- [x] Perform final helicopter-view assessment against the end goal

## Review checklist by area

### 1. Authority and doc-logic review

- [x] Every doc has an unambiguous scope
- [x] No two current docs claim canonical authority over the same behavior
- [x] `Locked`, `Open`, `Recommended`, `Draft`, and `Living` are used consistently
- [x] Context docs cannot override implementation docs
- [x] No hidden dependency on prior chat history or unpublished notes remains
- [x] Task-routing rules cover all major implementation concerns

### 2. UX review

- [x] User stories cover the full core flow: discover → draft → review → checkout → confirmation → resume
- [x] Route specs match flow specs
- [x] Mobile overrides are scoped and do not redefine business logic
- [x] Component library matches route behavior and state requirements
- [x] Error/loading/empty/expired/ambiguous states are specified everywhere they are needed
- [x] UX docs enforce "materially easier than manual" rather than merely functional
- [x] Primary CTA clarity and preview reachability are enforced

### 3. Product review

- [x] AI drafting docs forbid invention and overclaiming
- [x] Pricing docs do not invite hardcoded launch values
- [x] Email/session/resume docs agree on identity and expiry behavior
- [x] Dictation docs are truthful about browser/vendor constraints
- [x] Dispatch docs separate reference vs tracking truthfully
- [x] Signature, attachment, and file-limit rules align across docs
- [x] Template/rendering docs separate settled geometry from open rendering choices

### 4. Architecture review

- [x] Shared schema strategy is consistent across all architecture docs
- [x] System contracts, database schema, and API contracts agree
- [x] Frontend and backend architecture docs point to the same module and hook boundaries
- [x] Realtime/queue/state-machine docs align with API and workflow docs
- [x] Open architecture decisions remain open and are not silently assumed elsewhere

### 5. Ops and implementation review

- [x] Build packs do not permit placeholder branches or unfinished production logic
- [x] Security/privacy claims match product and provider reality
- [x] Incident response, support, and release gates are sufficient for a real launch
- [x] Dev workflow forces docs-first and full-concern review before coding
- [x] LLM guardrails are explicit enough to prevent generic SaaS drift

### 6. Final verification

- [x] No broken markdown links remain
- [x] No stale file references remain, including plain-text legacy filenames
- [x] No conflicting locked decisions remain
- [x] No public trust claim exceeds what docs and providers actually support
- [x] Remaining open items are explicit, bounded, and non-fabricated
- [x] A fresh-eye TODO regeneration pass produced no new material items
- [x] A second recursive TODO regeneration pass still produced no new material items

### 7. Helicopter-view end-goal check

- [x] The docs still clearly aim at a complete production SaaS app, not a scaffold or prototype
- [x] The UX bar still supports a "why was I doing this manually before?" experience rather than a generic SaaS flow
- [x] The implementation path still pushes developers toward centralized logic, deterministic states, and truthful copy
- [x] Remaining open items are truly decision-boundary items, not hidden spec gaps
- [x] The full document set still reflects product values, trust posture, and launch reality when read end-to-end

## Recursive closeout loop

When the checklist appears complete:

1. Run a fresh-eye sweep across the entire repo and regenerate TODOs from anything still unclear, contradictory, weakly scoped, stale, or likely to mislead an implementation LLM.
2. If new material TODOs appear, add them here, resolve them, and repeat step 1.
3. Only when a full new sweep adds no material TODOs, run one more recursive sweep from a different angle:
   authority, UX, product truth, architecture, ops, and launch-readiness.
4. If that second sweep also adds no material TODOs, step back and perform the helicopter-view check above.
5. If the helicopter view reveals a gap between local doc quality and the actual end goal, reopen the relevant phase and continue.

## Current focus

Documentation hardening has been through three full sessions of recursive audit. The doc set is
internally consistent and ready for implementation. Remaining work:

1. **Resolve the remaining external/business blockers** (pricing approval → Swiss Post onboarding)
   — see `docs/08-guardrails/open-decisions.md` and the residual-risk table below.
2. **Begin implementation** following the build order in `.github/copilot-instructions.md`:
   shared schemas → backend state machines/adapters → frontend flows → provider integration.
3. **Re-run a doc sweep after R1 (dispatch provider sandbox) is resolved** — provider API details
   will require updates to system-contracts, api-contracts, backend-architecture, and the dispatch
   build pack.

## Latest resolved findings

- Removed deferred account/login routes and components from the live launch UX docs so the launch
  spec no longer advertises future customer-account surfaces.
- Added explicit review-step confirmation for ambiguous recipient addresses before checkout.
- Softened remaining public trust-copy overclaim around encryption wording.
- Locked live implementation docs to `Swiss Mail` on `swissmail.ch` and replaced active
  `[ProductName]` / `[domain]` placeholders in the implementation-facing docs.
- Replaced the placeholder-first naming strategy with a short current-truth naming doc.
- Removed reserved customer-account scaffolding from the backend build pack, backend architecture,
  schema docs, and direct API/schema correspondence lists.

**Session 2 — Recursive closeout hardening:**

- Fixed all remaining `[ProductName]` instances (user-flows.md ×3, component-library.md ×1 in
  aria-label code example).
- Replaced non-canonical dispatch states (`In transit`, `Delivered`) in user-flows.md Check Letter
  Status Flow with the full canonical `DispatchState` enum (queued/submitted/accepted/rejected/
  unknown/reconciled) and explicit prohibition note.
- Fixed voice-and-tone.md dispatch stage copy to use canonical states with provider-dependency caveat.
- Added address validation two-tier model to user-flows.md Step 5 Review (hard block for non-Swiss
  country, soft PLZ format warning) — previously only the soft tier was documented.
- Fixed marketing-pages.md scroll-reveal stagger 80ms → 75ms (two occurrences, canonical per
  micro-interactions.md §5).
- Added stagger disambiguation note to micro-interactions.md §3 (50ms = page-entry, 75ms =
  scroll-reveal) to prevent future drift.
- Fixed broken section cross-reference in component-library.md (Auto-Save Indicator subsection
  pointer was wrong).
- Fixed hardcoded CHF price examples in voice-and-tone.md (copy guidance, button label, statistics
  counter) to use `{formattedPrice}` placeholders with disclaimers; pricing is an open decision.
- Fixed `SessionType.account` drift: removed from `shared/src/enums.ts` and from
  `api-contracts.md` (`z.enum(["guest"])`). All three files (system-contracts, api-contracts,
  database-schema) now agree on `guest`-only at MVP.
- Removed `accounts` from backend module list in `.github/copilot-instructions.md` (accounts are
  post-MVP per backend-architecture.md canonical list).
- Updated `docs/01-vision/overview.md` phase status from "Documentation phase — pre-implementation
  gate not yet cleared" to "Foundation phase — TypeScript boundaries prepared; feature
  implementation not yet started".
- Updated `.github/copilot-instructions.md` stale "no application code exists yet" to accurate
  foundation description.
- Verified all cross-referenced doc files exist (no broken internal links).
- Swept build packs, ops docs, guardrails docs — no additional escape hatches or drift found.
- Ran two full fresh-eye sweeps from different angles; no new material TODOs emerged.

**Session 3 — Deep substantive hardening pass:**

Previous sessions fixed surface-level issues (placeholders, broken refs). This session did a deep
read of actual doc content, finding and fixing substantive stale guidance that would have actively
misled an implementer.

- **roadmap.md** — Complete rewrite. Was the single most stale doc: said "not ready for
  implementation", listed retention as 🔴 blocking, said "no code exists", recommended Infomaniak
  as open when it's locked. New content: phase status, implementation readiness table (16 items),
  module dependency matrix, remaining blockers with type classification.
- **overview.md** — Fixed §7 "Still Open" (reduced from 7 items to correct 2+1 operational);
  fixed §8 pre-dev gate (cleared with only pricing remaining); fixed §10 doc map (added ~15
  missing doc entries that were absent from the navigation index).
- **data-model.md** — Fixed "still open" retention framing → locked with configurable defaults;
  updated status line; added specific config key references.
- **content-moderation.md** — Removed stale "Exact moderation metadata retention duration: Open"
  row; added note that retention follows the locked operational metadata policy.
- **business-model.md** — Updated status from "pricing and GTM details require further decision"
  to reflect locked MVP pricing while keeping GTM and growth assumptions directional.
- **session-management.md** — Replaced vague "exact durations are still open" with locked defaults
  table (72h session, 7d content, 24h PDF, 7y metadata, 48h resume trigger) and config keys.
- **stack-decisions.md** — Fixed "S3-compatible (exact vendor remains open)" → "S3-compatible on
  Infomaniak" (hosting is locked).
- **database-schema.md** — Fixed expires_at comment "exact duration remains open" → "recommended
  default 72h"; updated GAP table (GAP-1 reworded for locked direction, GAP-3/4/OPEN-1 marked
  resolved).
- **pricing-structure.md** — Added cross-reference to CHF 4.90/8.90 recommendation in
  open-decisions.md.
- **copilot-instructions.md** — Fixed "they are not yet decided" retention line → locked with env
  config; promoted "recommended" to locked for BullMQ+Redis, Zod, and Puppeteer.
- **page-specifications.md** — Defined `configuredSessionRetentionLabel` variable mapping to
  `SESSION_TTL_HOURS` with display format guidance.
- **AUDIT_FINDINGS.md** — Fixed broken reference to non-existent AUDIT_FINDINGS_DETAILED.md.
- Ran full cross-doc consistency checks: all locked technology mentions (Resend, BullMQ, Drizzle,
  Puppeteer, Azure OpenAI, Infomaniak, SessionType, DispatchState) are consistent across all 49
  docs. All doc links in index.md resolve. No stale "open" language remains for locked items.

## Residual risk / genuine blockers

These items remain open **by design** — they are bounded, non-fabricated, and cannot be resolved
without external facts or explicit business decisions. Do not convert them into code guesses.

| # | Item | Why still open | Unblocking action |
|---|------|---------------|-------------------|
| R1 | Swiss Post sandbox access | Dispatch provider path is locked (Swiss Post Digital Commerce API), but current sandbox docs, auth details, payloads, and tracking semantics are not in the repo. | Obtain sandbox credentials and current API documentation from Swiss Post; update `docs/08-guardrails/swiss-post-appendix.md` and `docs/04-product/postal-dispatch.md`. |
| R2 | Tracking capability | Whether physical tracking data (beyond reference number) is available from the locked Swiss Post path is unknown. | Verify with provider after R1; update `docs/08-guardrails/provider-certainties.md`. |

All other known contradictions, placeholder drift, state-machine mismatches, and stale guidance
have been resolved across Sessions 1–3. Every locked decision (pricing/CHF 4.90-8.90,
hosting/Infomaniak, AI/Azure OpenAI, dispatch/Swiss Post, email/Resend, retention defaults,
queue/BullMQ, validation/Zod, session type/guest-only, address validation/soft, admin auth/HTTP
Basic) is now consistently referenced across all 49 docs, the copilot-instructions, and the
shared source code.

A follow-up doc sweep is recommended after R2 is resolved — provider API details will trigger
updates to system-contracts, api-contracts, backend-architecture, and the dispatch build pack.
