# Build Tasks

**Status:** Phase 5 — Implementation substantially complete
**Upstream:** [Roadmap](docs/01-vision/roadmap.md)
**Guidelines:** [Copilot Instructions](.github/copilot-instructions.md)

---

## 1. Foundation & Shared Core ✅
*Typesafe boundaries before any logic.*

- [x] Scaffold Monorepo (frontend, backend, shared — npm workspaces)
- [x] Shared Enums & Constants (`DraftStatus`, `PaymentState`, `DispatchState`, `Locale`, etc.)
- [x] Shared Schemas (25 Zod schemas in `shared/src/schemas/`)
- [x] State Machines (`canTransitionDraft`, `canTransitionPayment`, `canTransitionDispatch`)
- [x] Error Taxonomy (canonical error families, `AppError` class)
- [x] Env Validation (Zod schema, 50+ vars)

## 2. Backend Core ✅
*Functional API and state machines.*

- [x] Database Layer (Drizzle schema — 11 tables, 9 enums, all indexes)
- [x] Session Module (guest sessions, cookie auth, resume tokens)
- [x] Drafting Module (CRUD, profiles, transitions, review/preview)
- [x] Files Module (upload/list/delete with validation — S3 stub)
- [x] Messages Module (conversation CRUD with cursor pagination)
- [x] Payments Module (checkout, polling, Stripe webhook with raw body)
- [x] Dispatch Module (status query, admin retry stub)
- [x] Rendering Module (snapshot service — Puppeteer templates pending)
- [x] Tracking Module (adapter shell)
- [x] Retention Module (cleanup service shell)
- [x] Admin Module (Basic Auth, timeline, search, refund/reconcile stubs)
- [x] Order Module (public token-authenticated status + PDF download)
- [x] SSE Stream (connection shell with keepalive)
- [x] Queue Platform (BullMQ setup)
- [x] All routes match `docs/05-architecture/api-contracts.md`

## 3. Frontend Core ✅
*Guided drafting and checkout flows.*

- [x] Next.js App Router + i18n (4 Swiss locales)
- [x] Tailwind + shadcn/ui primitives
- [x] Draft Workspace (split-pane conversation + preview)
- [x] Review Page (completion checklist, delivery selector, pricing)
- [x] Checkout Page (order summary, Stripe placeholder, trust badges)
- [x] Confirmation Page (success state + timeline)
- [x] Resume + Status Pages (token-based access)
- [x] Marketing Pages (homepage, how-it-works, pricing, legal)
- [x] TanStack Query hooks aligned with backend API contracts
- [x] Full i18n translations for de-CH, fr-CH, it-CH, en-CH

## 4. Quality & Ops ✅
*CI-ready quality gates.*

- [x] TypeScript strict mode (all 3 workspaces clean)
- [x] ESLint (0 warnings, 0 errors)
- [x] 177 unit tests passing (5 test files)
- [x] Docker Compose (Postgres, Redis, MinIO)
- [x] Structured logging (Pino)
- [x] Canonical error handling with user-facing messages

## 5. Remaining Work (blocked or deferred)

### Blocked on provider/design:
- [ ] Postal dispatch (Swiss Post API credentials + contract)
- [ ] Tracking (Swiss Post tracking API)
- [ ] PDF rendering (HTML letter templates — design needed)
- [ ] AI chat integration (Azure OpenAI prompts to finalize)
- [ ] S3 file upload (MinIO adapter wiring)

### Pre-launch:
- [ ] Swiss Post sandbox onboarding
- [ ] Stripe live-mode verification
- [ ] Bank account setup
- [ ] Native speaker locale review
- [ ] Pricing validation (4.90/8.90 viability)
- [ ] DB migrations + rollback testing
- [ ] See `docs/07-operations/pre-launch-checklist.md` for full list
