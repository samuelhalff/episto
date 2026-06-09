# Episto

> A premium formal-letter product with integrated Swiss postal submission.

Describe what you need. Episto drafts the letter, generates the dispatch-ready PDF, collects
payment, and submits the resulting package through the configured postal adapter. Episto does
not operate its own print-and-mail workflow.

**Status:** Core product implementation is complete. Current work is pre-launch hardening, provider
onboarding, and live cutover readiness.

---

## Current Guardrails

- `EPOST_SUBMISSION_MODE=mock` is the default. Keep it that way until explicit production cutover.
- `EPOST_SUBMISSION_MODE=live` is accepted only when `NODE_ENV=production` and `POSTAL_DISPATCH_PROVIDER=epost`, which prevents accidental pre-production ePost fees.
- Mock mode still emits provider-shaped references and tracking fields so the UI, emails, and downloadable confirmation PDF can be validated without live submission.
- `GET /v1/drafts/:id/pdf` and `GET /v1/orders/:orderToken/pdf` return a download-only confirmation bundle: page 1 is the branded confirmation record, and the remaining pages are the exact rendered letter PDF prepared for dispatch. That bundle is separate from the raw PDF asset submitted to the provider.

## Documentation

Start here → **[docs/index.md](docs/index.md)** — navigation hub with reading paths by role.

### Quick orientation

| If you're a…    | Start with                                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Designer / UX   | [Design System](docs/02-brand/design-system.md) → [Component Library](docs/03-ux/component-library.md)                        |
| Frontend dev    | [Product Scope](docs/01-vision/product-scope.md) → [Frontend Architecture](docs/05-architecture/frontend-architecture.md)     |
| Backend dev     | [System Contracts](docs/05-architecture/system-contracts.md) → [Database Schema](docs/05-architecture/database-schema.md)     |
| Product manager | [Overview](docs/01-vision/overview.md) → [Competitive Landscape](docs/01-vision/competitive-landscape.md)                     |
| AI-assisted dev | [AI Implementation Rules](docs/08-guardrails/ai-implementation-rules.md) → [Dev Workflow](docs/07-operations/dev-workflow.md) |

### Key safety files (read before writing code)

- [AI Implementation Rules](docs/08-guardrails/ai-implementation-rules.md) — anti-hallucination guardrails
- [Provider Submission Model](docs/04-product/provider-submission-model.md) — what Episto does vs what the provider does
- [Swiss Post API Reference Map](docs/08-guardrails/swiss-post-api-reference-map.md) — which docs depend on API truth, and why
- [Provider Certainties](docs/08-guardrails/provider-certainties.md) — known vs unknown
- [Swiss Post Appendix](docs/08-guardrails/swiss-post-appendix.md) — verified facts only
- [Non-Goals](docs/08-guardrails/non-goals.md) — forbidden shortcuts
- [Open Decisions](docs/08-guardrails/open-decisions.md) — don't resolve by guessing
- [Dev Workflow](docs/07-operations/dev-workflow.md) — repo structure, maintainability rules, and file-size limits

### Documentation principles

- Decided facts are explicit
- Unknowns stay explicit — never converted to code by guessing
- Provider unknowns are isolated behind adapter boundaries
- Build packs define the expected repo shape
- Unresolved decisions must go through three-option review before code starts
- The docs must be self-contained — no prior chat thread or hidden session context is required to implement correctly

### Non-negotiable implementation hygiene

- Production files must stay single-purpose and easy to scan
- Production `*.ts` / `*.tsx` files target 300 lines or fewer and must be split before merge if they exceed 500 lines
- Test files target 400 lines or fewer and must be split before merge if they exceed 700 lines
- Markdown docs target 400 lines or fewer and should be split past 600 lines unless they are intentional canonical indexes or reference tables
- If a change makes structure unclear, the same change must also do the cleanup — not leave it for later

### Structure

```
frontend/
├── next-env.d.ts               # Next.js TypeScript entrypoint
├── tsconfig.json               # Frontend TypeScript config
└── src/
    ├── app/
    ├── components/
    │   ├── marketing/
    │   ├── product/
    │   └── ui/
    ├── hooks/
    └── lib/
backend/
├── tsconfig.json               # Backend TypeScript config
├── drizzle/
│   ├── migrations/
│   └── seeds/
│       └── test/
└── src/
    ├── adapters/
    │   ├── dispatch/
    │   └── payment/
    ├── modules/
    │   ├── accounts/
    │   ├── admin/
    │   ├── dispatch/
    │   ├── drafting/
    │   ├── files/
    │   ├── payments/
    │   ├── rendering/
    │   ├── retention/
    │   ├── sessions/
    │   └── tracking/
    └── shared/
shared/
├── tsconfig.json               # Shared package TypeScript config
└── src/
    ├── contracts/              # Reserved contract entry points
    ├── schemas/                # Reserved schema entry points
    ├── enums.ts                # Canonical enums from architecture docs
    ├── errors.ts               # Canonical API error types
    └── query-keys.ts           # Centralized React Query keys
tsconfig.base.json              # Shared compiler defaults
tsconfig.json                   # Workspace TypeScript references
docs/
├── index.md                    # Navigation hub
├── 01-vision/                  # Why this product exists
├── 02-brand/                   # Design system, naming, voice, SEO
├── 03-ux/                      # Every pixel and interaction
├── 04-product/                 # Feature specifications
├── 05-architecture/            # Technical architecture
├── 06-build-packs/             # Implementation blueprints
├── 07-operations/              # Deployment, security, workflows
└── 08-guardrails/              # Rules and constraints
```

### Current repository state

- `frontend/`, `backend/`, and `shared/` are implemented and wired together through shared contracts
- Guest drafting, preview, review, checkout, confirmation, resume, and order-status flows are live in
  the app codebase
- Rendering, files, payments, retention, analytics, admin tooling, and queue workers are implemented
- Postal dispatch remains adapter-driven and mock-by-default until explicit Swiss Post cutover
