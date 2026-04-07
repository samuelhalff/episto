# Build Tasks

**Status:** Phase 7 — Pre-launch hardening and operational UI complete
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
- [x] Env Validation (Zod schema, 26 vars with typed defaults)

## 2. Backend Core ✅
*Functional API and state machines.*

- [x] Database Layer (Drizzle schema — 11 tables, 9 enums, all indexes)
- [x] Session Module (guest sessions, cookie auth, resume tokens)
- [x] Drafting Module (CRUD, profiles, transitions, review/preview, SSE stream)
- [x] Files Module (multipart upload, S3 adapter, presigned download, soft-delete)
- [x] Messages Module (conversation CRUD with cursor pagination)
- [x] Payments Module (checkout with idempotency, polling, Stripe webhook with raw body, distinct 90-day order access token on capture)
- [x] Dispatch Module (status query, admin retry with auth)
- [x] Rendering Module (snapshot service — Puppeteer templates pending)
- [x] Tracking Module (adapter shell — provider API pending)
- [x] Retention Module (cleanup service: sessions, files, drafts, PDFs)
- [x] Admin Module (tenant-only Microsoft SSO, timeline, search, refund via Stripe API, reconcile pending provider)
- [x] Order Module (public token-authenticated status + PDF download via S3 presigned URL; token resolved via payment_attempts.order_access_token_hash)
- [x] Email Module (Resend adapter + BullMQ worker with 5 templates)
- [x] Pricing Module (config-driven CHF pricing: 4.90 standard, 8.90 registered)
- [x] Pricing API (GET /api/v1/pricing — public endpoint returning display prices)
- [x] Queue Platform (BullMQ setup, 5 queue types, worker runner with graceful shutdown)
- [x] All routes match `docs/05-architecture/api-contracts.md`

## 3. Frontend Core ✅
*Guided drafting and checkout flows.*

- [x] Next.js App Router + i18n (4 Swiss locales)
- [x] Tailwind + shadcn/ui primitives
- [x] Draft Workspace (split-pane AI conversation + live letter preview)
- [x] Review Page (completion checklist, delivery selector, backend-driven pricing)
- [x] Checkout Page (order summary, backend-driven pricing, Stripe Elements placeholder)
- [x] Confirmation Page (success state + dispatch timeline)
- [x] Resume Page (`/resume/:token` — validates and redirects to draft)
- [x] Status Page (`/status/:orderToken` — order tracking display)
- [x] Marketing Pages (homepage, how-it-works, pricing, terms, privacy, imprint)
- [x] TanStack Query hooks aligned with backend API contracts
- [x] Full i18n translations for de-CH, fr-CH, it-CH, en-CH

## 4. Quality & Ops ✅
*CI-ready quality gates.*

- [x] TypeScript strict mode (all 3 workspaces clean)
- [x] ESLint (0 warnings, 0 errors)
- [x] 521 unit tests passing (28 test files)
- [x] 538 unit tests passing (30 test files)
- [x] Docker Compose (Postgres, Redis, MinIO with healthchecks)
- [x] Structured logging (Pino)
- [x] Canonical error handling with user-facing messages
- [x] Security hardening (timingSafeEqual, Zod validation, draft ownership checks, CSRF middleware)
- [x] Graceful server shutdown (workers, queues, connections)
- [x] Per-route rate limiting on key endpoints
- [x] All API response shapes verified against `api-contracts.md`

## 5. Remaining Work (blocked or deferred)

### Blocked on provider/design:
- [ ] Postal dispatch adapter (Swiss Post API credentials + contract)
- [ ] Tracking adapter (Swiss Post tracking API — capabilities unconfirmed)

### Recently completed:
- [x] AI chat integration (Azure OpenAI adapter, prompt pipeline, streaming)
- [x] AI → SSE wiring (event bus, message handler, SSE relay)
- [x] PDF rendering pipeline (Puppeteer HTML→PDF, A4 template, storage upload)
- [x] Product component extraction (StepIndicator, ConversationPanel, LetterPreview, DeliverySelector, ChecklistItem, PriceSummary → components/product/)
- [x] Centralized pricing via usePricing hook and backend /pricing endpoint
- [x] PDF download endpoint (orders/:token/pdf via S3 presigned URL)
- [x] Stripe refund implementation in admin endpoint
- [x] Admin routes split for file-size compliance (admin.routes.ts + admin-actions.routes.ts)
- [x] Admin overview route (GET /admin/overview — active queue, payment stats, ambiguous dispatches, recent refunds)
- [x] Distinct order access token (90-day TTL, generated on payment capture, separate from session resume token)
- [x] Order status page aligned with real backend response shape (OrderStatusResponse shared contract)
- [x] Centralized query key registry (queryKeys.* in shared package, all hooks migrated)
- [x] Checkout form validation with React Hook Form + Zod (email + legal consent, proper aria attributes)
- [x] Frontend product hooks (use-session, use-conversation, use-dictation, use-draft-files, use-checkout, use-dispatch-status, use-letter-preview)
- [x] Frontend product components (AttachmentUploader, SignaturePicker, ZoneEditor, DispatchConfirmation)
- [x] Email templates: full locale-keyed message catalogs for all 5 templates (de-CH, fr-CH, it-CH, en-CH)
- [x] Stripe Elements: publishable key wired via NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY env var, full payment flow operational
- [x] Confirmation page: payment status verification via Stripe redirect params + backend polling, dispatch status display, 4-step timeline, copy-to-clipboard reference, email notice, mobile sticky CTA
- [x] Retention module tests (17 tests: cleanupExpiredSessions, cleanupDeletedFiles, findExpiredDraftContent, findExpiredRenderedPdfs)
- [x] Scheduled retention cleanup via BullMQ repeatable job (hourly cron, registerScheduledJobs)
- [x] Product analytics event taxonomy (backend: 23 events, frontend: 9 events — per analytics-and-observability.md §4)
- [x] Analytics module with replaceable sink (backend: modules/analytics/index.ts, frontend: lib/analytics.ts)
- [x] Backend route instrumentation (session_created, resume_link_opened, draft_created, review_reached, checkout_started, payment_intent_created, payment_captured, payment_failed, dispatch_submitted, order_status_viewed)

### Pending (not blocked):
- [x] UX documentation audit findings resolved (all 12 findings verified — see `AUDIT_FINDINGS.md`)
- [x] Security headers audit (Helmet + CSP in frontend + custom headers all verified)
- [x] Unused `@fastify/csrf-protection` dependency removed (custom X-Requested-With validation used instead)
- [x] Retention module unit tests + scheduled cleanup job
- [x] Product analytics event taxonomy and instrumentation

### Phase 6A — Frontend Quality & Completeness:
- [x] Help & Support page (FAQ + contact section, all 4 locales — `/help`)
- [x] Global loading skeleton (locale-level `loading.tsx` with pulse animation)
- [x] Skip-to-content accessibility link + ARIA landmarks (layout, header, footer, nav)
- [x] Help link added to Header (desktop + mobile) and Footer navigation

### Phase 6B — Operational Readiness:
- [x] Error tracking adapter — backend (replaceable sink pattern matching analytics, Pino-based MVP)
- [x] Error tracking adapter — frontend (replaceable sink pattern matching analytics, console-based MVP)
- [x] Error boundary integration (error.tsx now reports to error tracking sink)
- [x] Backend error tracking tests (9 tests) + frontend error tracking tests (8 tests)
- [x] Readiness probe enhanced with Redis health check (via BullMQ queue ping)

### Phase 7A — Build & CI Fix:
- [x] Next.js build fix: webpack `extensionAlias` for `.js` → `.ts`/`.tsx` module resolution
- [x] ESLint config: ignore auto-generated `next-env.d.ts` (Next 15.5 routes.d.ts reference)
- [x] Full CI pipeline now passes: lint ✅ typecheck ✅ tests ✅ build ✅

### Phase 7B — SEO & Web Basics:
- [x] `robots.txt` (Disallow /api/ and /admin/)
- [x] Dynamic `sitemap.xml` (all static pages × 4 locales via Next.js app router)
- [x] Web app manifest (`manifest.json` with Swiss Mail branding)
- [x] HTML metadata (title, description, manifest link in locale layout)

### Phase 7C — Admin Dashboard UI:
- [x] Admin login page (Microsoft SSO redirect with backend session bootstrap)
- [x] Service health panel (API, database, Redis, object storage status with green/red indicators)
- [x] Operational overview panel (ambiguous dispatches, recent refunds, payment/dispatch state counts)
- [x] Queue status panel (waiting, active, failed job counts per queue)
- [x] Files split for file-size compliance: `page.tsx` (176 lines) + `admin-panels.tsx` (206 lines) + `admin-api.ts` (56 lines)

### Pre-launch:
- [ ] Swiss Post sandbox onboarding
- [ ] Stripe live-mode verification
- [ ] Bank account setup
- [ ] Native speaker locale review
- [ ] Pricing validation (4.90/8.90 viability)
- [ ] DB migrations generation + rollback testing
- [ ] Accessibility testing (WCAG AA)
- [ ] See `docs/07-operations/pre-launch-checklist.md` for full list
