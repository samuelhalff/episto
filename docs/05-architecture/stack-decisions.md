# Stack and Tooling Decisions

**Status:** Authoritative reference  
**Resolves:** INCON-6 (promoted all "Recommended" to "Locked"), IMPROV-1 (implementation-locked clarity), GAP-3 partial (Puppeteer), GAP-12 partial (React Query)  
**Supersedes:** earlier stack/tooling drafts

---

## Decision Table

Every row marked **Locked** is a hard constraint for implementation. Do not open alternatives without an explicit decision record.

| Area | Status | Decision |
|---|---|---|
| Frontend framework | **Locked** | Next.js + TypeScript |
| Styling | **Locked** | Tailwind CSS |
| UI primitives | **Locked** | shadcn/ui — primitives only (`components/ui/`) |
| Product UI layer | **Locked** | Custom Swiss Mail components (`components/product/`, `components/marketing/`) |
| Server state (frontend) | **Locked** | React Query (TanStack Query v5) |
| Form state (frontend) | **Locked** | React Hook Form + Zod resolvers |
| UI state (frontend) | **Locked** | React `useState` / `useReducer` — no global store for MVP |
| API client (frontend) | **Locked** | Typed `fetch` wrapper, endpoints from `shared/` |
| Routing | **Locked** | Next.js App Router |
| Backend runtime | **Locked** | Node.js + TypeScript |
| Architecture style | **Locked** | Modular monolith |
| Database | **Locked** | PostgreSQL |
| ORM / query builder | **Locked** | Drizzle ORM + `drizzle-kit` |
| Object storage | **Locked** | S3-compatible (exact vendor remains open — see hosting topology) |
| Payments | **Locked** | Stripe |
| PDF generation | **Locked** | Puppeteer (HTML/CSS → PDF) |
| Async job queue | **Locked** | BullMQ + Redis |
| Validation library | **Locked** | Zod (used in `shared/`; bridged to DB via `drizzle-zod`) |
| Structured logging | **Locked** | JSON-structured application logs (`pino` preferred; exact library selection remains open) |
| Shared contracts | **Locked** | TypeScript schemas in `shared/` — single source of truth |
| Transactional email | Open | Managed provider; exact vendor not yet selected |
| Auth (future accounts) | Open | Standard session/auth solution only when accounts are added |
| Hosting topology | Open | Infomaniak-centered preferred; exact products need approval — see §4 |

---

## Three-Option Review: Hosting Topology

### Option A — Fully Managed Split
- Frontend: Vercel or equivalent
- Backend: separate managed host
- Managed Postgres + managed object storage

**Pros:** fast start, simple vendor defaults  
**Cons:** more vendors, more operational fragmentation, higher cost at scale

### Option B — Infomaniak-Centered ✅ RECOMMENDED

All core infrastructure on Infomaniak products: compute, database, object storage.

**Pros:** strong budget alignment, simpler provider story, stated hosting preference  
**Cons:** exact product selection and operational validation still needed

### Option C — Self-Managed VPS
Maximum control, own servers.

**Pros:** maximum control  
**Cons:** worst operational burden, slower launch, weaker reliability at MVP stage — **rejected for MVP**

**Outcome:** Option B if chosen Infomaniak products cleanly cover compute, database, storage, and operational reliability. Fallback to Option A if Option B introduces too much friction. Option C is rejected.

> ⚠️ **Open:** Hosting topology is not yet frozen. Code must not depend on provider-specific hosting behavior until an explicit decision is recorded.

---

## Three-Option Review: Async Job Queue

### Option A — No queue, synchronous only
**Pros:** simplest conceptually  
**Cons:** blocking for rendering, dispatch, retries, cleanup, and email — unsuitable

### Option B — BullMQ + Redis ✅ LOCKED
**Pros:** proven pattern, enough structure without over-engineering, good observability  
**Cons:** adds Redis operational dependency

### Option C — Heavier workflow engine (Temporal, etc.)
**Pros:** advanced orchestration  
**Cons:** too heavy for current MVP — **rejected**

**Decision: Option B — LOCKED.**

---

## Three-Option Review: Validation Strategy

### Option A — Manual frontend + backend validation separately
**Pros:** no extra library  
**Cons:** guaranteed drift between layers — **rejected**

### Option B — Shared Zod schemas in `shared/` ✅ LOCKED
**Pros:** strong shared contracts, fast AI-assisted implementation, zero drift when used correctly  
**Cons:** requires schema ownership discipline

### Option C — Separate contract spec (OpenAPI, Protobuf, etc.)
**Pros:** formal contract-first path  
**Cons:** more tooling complexity than needed right now — **deferred post-MVP**

**Decision: Option B — LOCKED.**

---

## Three-Option Review: ORM / Query Builder

### Option A — Drizzle ORM ✅ LOCKED
TypeScript-native schema definitions, SQL-like query builder, `drizzle-kit` migrations, first-class `drizzle-zod` bridge.

**Pros:** TypeScript-first, SQL-transparent, lightweight, Zod bridge with no duplication  
**Cons:** younger ecosystem (adequate for this stack)

### Option B — Prisma
Own `.prisma` DSL, separate Rust query engine.

**Pros:** excellent type safety, large ecosystem  
**Cons:** non-TypeScript schema DSL conflicts with TypeScript-first principle; runtime weight; painful for complex queries — **rejected**

### Option C — Knex + manual types
**Pros:** full SQL control  
**Cons:** no generated types, guaranteed hand-type drift — **rejected**

**Decision: Option A — LOCKED.** See `docs/05-architecture/database-schema.md` for full schema.

---

## Three-Option Review: PDF Generation

### Option A — Puppeteer (headless Chromium) ✅ LOCKED
Renders HTML/CSS to PDF using the same engine that drives Chrome.

**Pros:** pixel-accurate for web-defined layouts, supports A4 print CSS, no new template language  
**Cons:** heavier process (~150 MB binary), requires running in backend job worker not request cycle

### Option B — WeasyPrint / wkhtmltopdf
**Pros:** lighter  
**Cons:** Python dependency, inconsistent CSS support, legacy tooling — **rejected**

### Option C — LaTeX / dedicated typesetting engine
**Pros:** professional typographic output  
**Cons:** massive learning curve, separate template language, not worth for formal-letter layout — **rejected**

**Decision: Option A — LOCKED.** PDF rendering is always a background job, never synchronous in a request handler.

---

## Concrete Package Recommendations

These are the recommended npm packages for each locked technology decision. Use these exact packages to avoid reinventing the wheel. All are production-proven, well-maintained, and budget-friendly (MIT/Apache-2.0 licensed).

### Frontend

| Purpose | Package | Why |
|---------|---------|-----|
| React Query | `@tanstack/react-query` | Locked — server state |
| Form state | `react-hook-form` + `@hookform/resolvers` | Locked — form + Zod bridge |
| Validation | `zod` | Locked — shared schemas |
| i18n | `next-intl` | Best Next.js App Router i18n; supports `[locale]/` routing, message files, server components |
| Date formatting | `Intl.DateTimeFormat` (built-in) | Zero-dependency; locale-aware |
| Currency formatting | `Intl.NumberFormat` (built-in) | Zero-dependency; locale-aware |
| Animations | `framer-motion` | Required by micro-interactions spec; `AnimatePresence`, `layout`, `drag` |
| Toast notifications | `sonner` | Lightweight; works with shadcn/ui; replaces custom toast |
| SEO / meta | `next/head` + `next-sitemap` | SSR meta tags + sitemap generation |
| JSON-LD structured data | `next-seo` or hand-rolled `<script type="application/ld+json">` | Keep it simple |
| Icons | `lucide-react` | Ships with shadcn/ui — do not add a second icon library |
| Scroll animations (marketing) | `IntersectionObserver` (built-in) | Zero-dependency; no animation library needed for marketing page reveals |
| Address autocomplete | `@googlemaps/js-api-loader` | Official Google Maps JS loader; lazy-load Places API |
| Stripe | `@stripe/stripe-js` + `@stripe/react-stripe-js` | Locked — Stripe Elements for checkout |

### Backend

| Purpose | Package | Why |
|---------|---------|-----|
| HTTP framework | `fastify` | Faster than Express; built-in schema validation; TypeScript-friendly; production-proven |
| ORM | `drizzle-orm` + `drizzle-kit` + `drizzle-zod` | Locked — TypeScript-native, Zod bridge |
| PostgreSQL driver | `postgres` (porsager/postgres) | Lightweight; used with Drizzle |
| Job queue | `bullmq` + `ioredis` | Locked — async jobs |
| PDF rendering | `puppeteer` | Locked — HTML/CSS to PDF |
| Object storage | `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` | S3-compatible; works with MinIO and Infomaniak |
| Payments | `stripe` | Locked — Stripe Node.js SDK |
| Logging | `pino` + `pino-pretty` (dev only) | Locked direction — structured JSON logs |
| Error tracking | `@sentry/node` | Production error tracking and alerting |
| Rate limiting | `@fastify/rate-limit` | Per-route rate limiting |
| CORS | `@fastify/cors` | Same-origin CORS policy |
| Helmet (security headers) | `@fastify/helmet` | HSTS, X-Frame-Options, CSP |
| Multipart uploads | `@fastify/multipart` | File upload handling with stream support |
| Cookie handling | `@fastify/cookie` | HttpOnly secure session cookies |
| CSRF protection | `@fastify/csrf-protection` | Same-origin mutation protection |
| Cron scheduling | `bullmq` repeatable jobs | No separate cron library needed; BullMQ handles scheduled retention jobs |
| Email (adapter) | `postmark` or `resend` | Decision open — code against adapter interface; both have simple SDKs |
| UUID generation | `crypto.randomUUID()` (built-in Node.js) | Zero-dependency; CSPRNG-backed |
| Token generation | `crypto.randomBytes(32).toString('base64url')` (built-in) | 256-bit entropy; URL-safe |
| Token hashing | `crypto.createHash('sha256')` (built-in) | For resume token storage |

### Shared

| Purpose | Package | Why |
|---------|---------|-----|
| Validation | `zod` | Canonical shared schemas |
| Type utilities | `type-fest` | Useful TypeScript utility types (optional) |

### Dev tooling

| Purpose | Package | Why |
|---------|---------|-----|
| Testing | `vitest` | Fast, TypeScript-native, Vite-powered |
| E2E testing | `playwright` | Cross-browser; includes Chromium |
| Linting | `eslint` + `@typescript-eslint/*` | Standard |
| Formatting | `prettier` + `prettier-plugin-tailwindcss` | Consistent formatting + Tailwind class sorting |
| Bundle analysis | `@next/bundle-analyzer` | Enforce performance budgets |
| Git hooks | `lefthook` | Lightweight alternative to husky; runs lint/typecheck pre-commit |
| DB migrations | `drizzle-kit` | Locked — Drizzle migration CLI |

---

## Build vs Buy Summary

**Buy or adopt:**
- UI primitive foundation (shadcn/ui)
- Payments (Stripe)
- Database hosting (managed PostgreSQL)
- Object storage (S3-compatible)
- Transactional email (managed provider)
- Postal-provider dispatch capability
- Puppeteer for PDF

**Build custom:**
- Product drafting workspace
- Preview and conversation coordination
- Dispatch state machine
- Retention policy enforcement
- Provider adapter layer
- Support and admin reconciliation model

---

## Implementation Constraint

All items marked **Locked** above are implementation-binding. If a developer wants to substitute a locked technology, they must:

1. Raise a documented decision record in `docs/`
2. State the specific reason the locked choice cannot work
3. Get explicit approval before writing any code against the alternative

No "temporary" substitutions. No "we'll switch later" workarounds.

---

## Cross-References

| Document | Relationship |
|---|---|
| `docs/05-architecture/database-schema.md` | Full Drizzle schema, enums, migration strategy |
| `docs/05-architecture/backend-architecture.md` | Module structure consuming this stack |
| `docs/05-architecture/frontend-architecture.md` | Frontend state management expansion |
| `docs/05-architecture/system-contracts.md` | Zod schemas and TypeScript enums in `shared/` |
