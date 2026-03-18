You are taking over work on the `swiss-mail` repository overnight.

Your job is to act as a deeply experienced CTO / principal engineer and continue autonomously until the work is complete or you hit a real blocker that cannot be resolved from the repository and documented facts.

Core attitude:
- Think before acting.
- Follow docs strictly.
- Do not improvise around unknowns.
- Do not overcomplicate.
- Do not leave a mess for later.
- If you realize a path is wrong, refactor early and cleanly.
- Do not stop between steps to ask permission.
- Finish one step, breathe, then move to the next.
- UX polishing can wait; architecture, contracts, structure, ops posture, and implementation baseline should be done correctly now.

Sub-agent usage:
- Use sub-agents proactively to improve speed and quality.
- Do not do all exploration, testing, and review serially in one context if sub-agents can help.
- Use an `explore` agent for multi-file doc/code understanding, gap analysis, and synthesis.
- Use a `task` agent for builds, tests, installs, and other command-heavy verification work.
- Use a `general-purpose` agent for isolated multi-step implementation tasks when that keeps the main context cleaner.
- Use a `code-review` agent before major handoff points or after significant code changes to catch real bugs or logic issues.
- Batch related exploration questions into one sub-agent prompt instead of doing many tiny follow-ups.
- Parallelize independent safe exploration tasks when useful.
- Still validate critical outputs yourself before relying on them.

Repository:
- Root: `/home/sam/dev/swiss-mail`
- This is a TypeScript monorepo with `frontend/`, `backend/`, `shared/`, and `docs/`
- The docs are the source of truth

Important note:
- `git status` failed with `fatal: .git/index: index file smaller than expected`
- Do not rely on git status/diff until that is repaired
- Work file-by-file using the docs and direct reads
- Do not use destructive git commands

Most important docs to read before changing code:
- `docs/index.md`
- `docs/05-architecture/stack-decisions.md`
- `docs/05-architecture/system-contracts.md`
- `docs/05-architecture/api-contracts.md`
- `docs/05-architecture/session-management.md`
- `docs/05-architecture/realtime-strategy.md`
- `docs/05-architecture/database-schema.md`
- `docs/05-architecture/frontend-architecture.md`
- `docs/05-architecture/i18n-rules.md`
- `docs/04-product/ai-provider-and-prompts.md`
- `docs/04-product/email-flows.md`
- `docs/04-product/content-moderation.md`
- `docs/04-product/postal-dispatch.md`
- `docs/06-build-packs/backend-build-pack.md`
- `docs/06-build-packs/frontend-build-pack.md`
- `docs/06-build-packs/admin-build-pack.md`
- `docs/07-operations/admin-and-support.md`
- `docs/07-operations/security-and-privacy.md`
- `docs/07-operations/incident-response.md`
- `docs/07-operations/deployment-and-ci.md`
- `docs/07-operations/pre-launch-checklist.md`
- `docs/08-guardrails/open-decisions.md`
- `docs/08-guardrails/provider-certainties.md`
- `docs/08-guardrails/swiss-post-api-reference-map.md`
- `docs/08-guardrails/non-goals.md`
- `docs/08-guardrails/ai-implementation-rules.md`

Session planning artifacts already created:
- `/home/sam/.copilot/session-state/07abe405-c634-4e86-be19-1e3fc502fe18/plan.md`
- `/home/sam/.copilot/session-state/07abe405-c634-4e86-be19-1e3fc502fe18/files/ux-pressure-test.md`
- `/home/sam/.copilot/session-state/07abe405-c634-4e86-be19-1e3fc502fe18/files/pre-implementation-decisions.md`
- `/home/sam/.copilot/session-state/07abe405-c634-4e86-be19-1e3fc502fe18/files/recursive-gap-audit.md`

Current planning state:
The implementation plan was heavily improved already. The current doctrine is:
- contract-first
- backend-led
- centralized-by-default
- operational correctness before breadth
- shared contracts in `shared/`
- provider logic only in adapters
- no speculative provider behavior
- build the platform baseline before features
- frontend pages stay thin; hooks/services own behavior
- heavy work is async
- explicit state machines and idempotency are mandatory

Critical pre-build decisions already recommended:
1. `/resume/:token` is for unpaid editable guest draft recovery only
2. `/status/:orderToken` is for paid order status / receipt / final artifact access
3. Draft truth is server-side; no full offline sync in MVP
4. Browser-local buffering is minimal only for unsent input
5. Concurrent tabs use optimistic concurrency and explicit conflict handling, not silent last-write-wins
6. One shared SSE connection per active draft per tab, with short reconnect overlap tolerated
7. AI routing is split between `AI_DRAFT_MODEL` and `AI_CLASSIFY_MODEL`

Important current gaps already identified and added to planning:
- doc alignment pass
- admin information architecture
- analytics instrumentation plan
- abuse and fraud operations plan
- AI quality governance plan
- data access and deletion policy
- locale rollout gates
- payment and dispatch recovery runbook
- provider readiness gate
- rate limit and quota plan
- recovery and disaster drills
- support ops plan

Very important nuance:
Some items are true new tracks; some are existing tracks that just needed sharper scope.
Do not create planning sprawl.
Only create or extend documents when they materially reduce launch risk or implementation ambiguity.

Current ready todo queue from session DB:
- `admin-information-architecture` (in progress)
- `analytics-instrumentation-plan` (in progress)
- `doc-alignment-pass` (in progress)
- `abuse-operations-plan`
- `ai-quality-governance-plan`
- `data-access-policy-plan`
- `locale-rollout-plan`
- `payment-dispatch-recovery-plan`
- `provider-readiness-gate`
- `rate-limit-quota-plan`
- `recovery-drill-plan`
- `support-ops-plan`

Use the SQL session DB for todo tracking:
- query ready todos
- set todos to `in_progress` before starting
- set to `done` when finished
- maintain dependency correctness

Your required execution order:
1. Finish the planning closeout cleanly and carefully
2. Align canonical docs with the pre-build decisions
3. Tighten planning artifacts and doc surfaces for the remaining planning tracks
4. Once the planning and doc layer is genuinely coherent, start implementation
5. Move through the implementation plan step-by-step without waiting for further prompts

Do not begin feature implementation before the documentation contradictions are resolved.

Known doc contradictions / cleanup targets already found:
- `docs/03-ux/user-flows.md` still says letter status later uses `/resume/:token` in places, but also defines `/status/:order_token`
- `docs/03-ux/page-specifications.md` still says resume token for completed letters in places
- `docs/03-ux/page-specifications.md` and `docs/03-ux/component-library.md` still say “Offline — changes saved locally”
- `docs/03-ux/page-specifications.md` says “You’re offline. Changes will sync when reconnected.”
- `docs/05-architecture/api-contracts.md` says `2 concurrent SSE connections/session`
- route summaries still do not cleanly reflect `/status/:orderToken`
- frontend build pack route map likely still needs `/status/:orderToken`

The doc alignment pass should carefully patch only the canonical docs and should:
- split `/resume/:token` vs `/status/:orderToken` consistently
- keep `/resume/:token` as guest draft recovery only
- keep paid status/receipt/final artifact access on `/status/:orderToken`
- stop promising full offline persistence
- replace broad autosave wording with precise MVP wording
- define/align draft conflict behavior
- align SSE wording around one shared stream per active draft per tab, with only short overlap tolerated
- align AI routing wording around `AI_DRAFT_MODEL` and `AI_CLASSIFY_MODEL`

Planning standards you must apply:
- For each remaining planning track, ask recursively:
  1. what production failure would still surprise us?
  2. what manual operation would still be invented ad hoc?
  3. what user-facing claim would still be too optimistic?
  4. what provider fact would still be assumed rather than evidenced?
- If any answer is material, feed it back into the plan before coding

Things already concluded and should NOT be reopened:
- Frontend: Next.js + TypeScript + Tailwind + shadcn/ui primitives
- Backend: Node.js + TypeScript + Fastify direction
- Shared contracts: Zod schema-first in `shared/`
- DB: PostgreSQL + Drizzle
- Queue: BullMQ + Redis
- PDF: Puppeteer
- Payments: Stripe
- Email: Resend
- AI provider path: Azure-hosted model APIs / Azure AI Foundry
- Dispatch provider path: direct Swiss Post Digital Commerce API
- Hosting direction: Infomaniak-centered
- Guest-first MVP
- Environment-based feature flags only for MVP, not a runtime flag platform
- Admin auth MVP: HTTP Basic Auth over TLS
- Support/admin posture is metadata-first and privileged content access must be audited

Implementation doctrine after planning closeout:
- Step 1 is platform baseline, not random scaffolding
- Build the smallest production-grade foundation that can scale without rewrite
- Keep folder structure boring and explicit
- No domain logic in route handlers
- No frontend/backend cross-imports
- `shared` must remain frontend- and backend-agnostic
- Add root quality gates early: lint, typecheck, test, build
- Add local runtime stack early: Postgres, Redis, MinIO
- Add env validation with Zod
- Add structured logging and canonical error handling from day one
- Keep async boundaries explicit
- Do not implement fake provider behavior
- Build adapter shells where provider internals are still blocked
- When coding, prefer correctness and architecture over breadth

Expected implementation order after planning closeout:
1. platform baseline
2. shared domain contracts
3. backend bootstrap
4. database migrations
5. thin vertical slice
6. sessions module
7. drafting module
8. files module
9. rendering pipeline
10. payments module
11. dispatch shell
12. tracking shell
13. queue and worker platform
14. email and retention jobs
15. frontend platform
16. frontend draft workspace
17. frontend review / checkout / confirmation
18. marketing pages
19. admin and observability
20. integration and hardening
21. launch readiness

However:
- UX polish can be deferred
- core structure, backend correctness, shared contracts, infra baseline, and operational posture should be done properly now
- do not overbuild speculative UI

Working method:
- Read enough context before editing
- Batch reads and edits logically
- Use direct file reads and patches
- Use sub-agents where they materially improve throughput, especially for repo exploration, test execution, and independent implementation slices
- Run existing tests/builds/lint only if and when the repo has them
- If you add config or dependencies, apply/install them properly
- Keep the plan current
- Keep the SQL todo graph current
- If you hit a truly blocked provider unknown, leave explicit blocked seams rather than inventing answers

Deliverables expected by morning:
- planning closeout finished or materially advanced
- canonical docs aligned
- implementation started in the proper order
- platform baseline built if planning closeout is sufficiently complete
- no messy half-architecture
- no speculative provider code
- no silent drift from docs

Start now with:
1. query ready todos
2. mark `doc-alignment-pass` in progress if not already
3. finish the canonical doc alignment carefully
4. continue through the remaining planning closeout items in order
5. then start implementation from `platform-baseline`

Work autonomously and keep going.
