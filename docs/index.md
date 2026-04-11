# Episto Documentation

> Formal letters from your phone — in minutes.

This is the complete specification for Episto, a mobile-first SaaS for AI-assisted formal-letter
drafting, final PDF generation, and postal-provider submission for Switzerland.

The implementation and launch-preparation name is **Episto**. See [Naming & Identity](02-brand/naming-and-identity.md) for the current brand source of truth.

---

## Reading Paths

Pick the path that matches your role. Each leads through the docs in an order that builds context progressively.

### 🎨 Designer / UX

1. [Design System](02-brand/design-system.md) — visual tokens, typography, color
2. [User Flows](03-ux/user-flows.md) — canonical user journeys
3. [Page Specifications](03-ux/page-specifications.md) — route-level behavior and layouts
4. [Component Library](03-ux/component-library.md) — every reusable component
5. [Marketing Pages](03-ux/marketing-pages.md) — homepage, landing pages
6. [Mobile Patterns](03-ux/mobile-patterns.md) — touch targets, breakpoints
7. [Micro-Interactions](03-ux/micro-interactions.md) — animations, transitions
8. [Voice & Tone](02-brand/voice-and-tone.md) — writing rules, UI copy

### 🛠️ Frontend Developer

1. [Product Scope](01-vision/product-scope.md) — what we're building
2. [Provider Submission Model](04-product/provider-submission-model.md) — what Episto owns vs what the provider owns
3. [Design System](02-brand/design-system.md) — tokens to implement
4. [Component Library](03-ux/component-library.md) — component specs
5. [Page Specifications](03-ux/page-specifications.md) — routes and layouts
6. [Frontend Architecture](05-architecture/frontend-architecture.md) — Next.js, state, tooling
7. [API Contracts](05-architecture/api-contracts.md) — backend endpoints
8. [System Contracts](05-architecture/system-contracts.md) — shared types, state machines
9. [Frontend Build Pack](06-build-packs/frontend-build-pack.md) — implementation blueprint
10. [i18n Rules](05-architecture/i18n-rules.md) — localization

### ⚙️ Backend Developer

1. [Product Scope](01-vision/product-scope.md) — what we're building
2. [Provider Submission Model](04-product/provider-submission-model.md) — dispatch truth and responsibility boundaries
3. [System Contracts](05-architecture/system-contracts.md) — entities, enums, state machines
4. [Database Schema](05-architecture/database-schema.md) — PostgreSQL tables
5. [API Contracts](05-architecture/api-contracts.md) — endpoint specs
6. [Backend Architecture](05-architecture/backend-architecture.md) — modules, adapters
7. [Session Management](05-architecture/session-management.md) — tokens, resume flow
8. [Realtime Strategy](05-architecture/realtime-strategy.md) — SSE for AI streaming
9. [Backend Build Pack](06-build-packs/backend-build-pack.md) — implementation blueprint
10. [Error Taxonomy](05-architecture/error-taxonomy.md) — error families

### 📋 Product Manager

1. [Overview](01-vision/overview.md) — project philosophy and orientation
2. [Product Scope](01-vision/product-scope.md) — MVP boundaries
3. [Provider Submission Model](04-product/provider-submission-model.md) — operational product truth
4. [Competitive Landscape](01-vision/competitive-landscape.md) — market position
5. [Business Model](01-vision/business-model.md) — GTM, pricing wedge
6. [Roadmap](01-vision/roadmap.md) — phase gates
7. [User Flows](03-ux/user-flows.md) — core journeys
8. [Open Decisions](08-guardrails/open-decisions.md) — what's still unresolved

### 🛡️ AI-Assisted Development (Guardrails)

Start here if you're using AI tools to write code for this project:

1. [AI Implementation Rules](08-guardrails/ai-implementation-rules.md) — **read first**
2. [Dev Workflow](07-operations/dev-workflow.md) — repo structure, maintainability rules, and file-size limits
3. [Provider Submission Model](04-product/provider-submission-model.md) — actual operating model
4. [Swiss Post API Reference Map](08-guardrails/swiss-post-api-reference-map.md) — where API truth matters across the docs
5. [Provider Certainties](08-guardrails/provider-certainties.md) — known vs unknown
6. [Swiss Post Appendix](08-guardrails/swiss-post-appendix.md) — verified facts only
7. [Non-Goals](08-guardrails/non-goals.md) — what must never be built
8. [Open Decisions](08-guardrails/open-decisions.md) — don't resolve these by guessing

---

## Authority Levels

Not every polished document has the same implementation authority.

| Class                          | Role                                                             | Examples                                                                                                                                                        |
| ------------------------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guardrails and decisions       | Highest authority for what is locked, open, or forbidden         | `08-guardrails/*`, `07-operations/pre-launch-checklist.md`                                                                                                      |
| Canonical implementation specs | Build from these for routes, states, schemas, jobs, and adapters | `03-ux/user-flows.md`, `03-ux/page-specifications.md`, `03-ux/component-library.md`, `04-product/*`, `05-architecture/*`, `06-build-packs/*`, `07-operations/*` |
| Orientation and context        | Helpful framing, but must not override more specific docs        | `README.md`, `docs/index.md`, `01-vision/*`                                                                                                                     |

## Full Directory Structure

### 01 — Vision

_Why this product exists and where it's going._

| Document                                                       | Description                                  |
| -------------------------------------------------------------- | -------------------------------------------- |
| [overview.md](01-vision/overview.md)                           | Project overview, philosophy, reading order  |
| [product-scope.md](01-vision/product-scope.md)                 | MVP boundaries, positioning, in/out of scope |
| [competitive-landscape.md](01-vision/competitive-landscape.md) | SuperPost, Pingen, DocuPost, ePost analysis  |
| [business-model.md](01-vision/business-model.md)               | Go-to-market, pricing wedge, revenue model   |
| [roadmap.md](01-vision/roadmap.md)                             | Phase gates, open decision timeline          |

### 02 — Brand

_How Episto looks, sounds, and presents itself._

| Document                                                  | Description                                           |
| --------------------------------------------------------- | ----------------------------------------------------- |
| [design-system.md](02-brand/design-system.md)             | Colors, typography, spacing, elevation, motion tokens |
| [naming-and-identity.md](02-brand/naming-and-identity.md) | Locked product name, domain, and brand guardrails     |
| [voice-and-tone.md](02-brand/voice-and-tone.md)           | Writing rules, UI copy, error message framework       |
| [seo-strategy.md](02-brand/seo-strategy.md)               | Technical SEO, keywords, landing page strategy        |

### 03 — UX

_Every pixel, every interaction, every screen._

| Document                                               | Description                                            |
| ------------------------------------------------------ | ------------------------------------------------------ |
| [user-flows.md](03-ux/user-flows.md)                   | Core user journeys, decision trees                     |
| [page-specifications.md](03-ux/page-specifications.md) | Every route at wireframe-level detail                  |
| [component-library.md](03-ux/component-library.md)     | Reusable component catalog with variants, states, a11y |
| [marketing-pages.md](03-ux/marketing-pages.md)         | Homepage, landing pages, trust blocks, CTAs            |
| [mobile-patterns.md](03-ux/mobile-patterns.md)         | Touch targets, breakpoints, thumb-zone optimization    |
| [micro-interactions.md](03-ux/micro-interactions.md)   | Animation specs, transitions, loading states           |

### 04 — Product

_What the product does and how each feature works._

| Document                                                                  | Description                                                      |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [letter-generation.md](04-product/letter-generation.md)                   | AI pipeline, prompt logic, structured extraction                 |
| [provider-submission-model.md](04-product/provider-submission-model.md)   | Canonical responsibility split, submission unit, status meanings |
| [document-template.md](04-product/document-template.md)                   | A4 template, PDF rules, multi-page                               |
| [a4-template-specification.md](04-product/a4-template-specification.md)   | Swiss postal window mm dimensions                                |
| [ai-provider-and-prompts.md](04-product/ai-provider-and-prompts.md)       | LLM provider decision, prompt architecture, safety               |
| [dictation-and-speech.md](04-product/dictation-and-speech.md)             | Azure AI Speech, backend-owned dictation                         |
| [postal-dispatch.md](04-product/postal-dispatch.md)                       | Dispatch adapters, tracking, address validation                  |
| [file-handling.md](04-product/file-handling.md)                           | Upload rules, storage, cleanup, limits                           |
| [signatures-and-attachments.md](04-product/signatures-and-attachments.md) | Scope, formats, UX                                               |
| [auth-billing-accounts.md](04-product/auth-billing-accounts.md)           | Guest-first, Stripe, optional accounts                           |
| [pricing-structure.md](04-product/pricing-structure.md)                   | CHF pricing, line items, Stripe integration                      |
| [email-flows.md](04-product/email-flows.md)                               | Transactional email templates, required at checkout              |
| [content-moderation.md](04-product/content-moderation.md)                 | AI safety layer, content categories                              |

### 05 — Architecture

_How the system is built._

| Document                                                               | Description                                       |
| ---------------------------------------------------------------------- | ------------------------------------------------- |
| [stack-decisions.md](05-architecture/stack-decisions.md)               | Locked technology choices                         |
| [system-contracts.md](05-architecture/system-contracts.md)             | Canonical entities, enums, state machines         |
| [database-schema.md](05-architecture/database-schema.md)               | Full PostgreSQL schema, tables, indexes           |
| [api-contracts.md](05-architecture/api-contracts.md)                   | Zod schemas for all endpoints                     |
| [rate-limits-and-quotas.md](05-architecture/rate-limits-and-quotas.md) | Request throttling, quotas, SSE connection policy |
| [session-management.md](05-architecture/session-management.md)         | Token architecture, resume flow, CSRF             |
| [realtime-strategy.md](05-architecture/realtime-strategy.md)           | SSE for AI streaming                              |
| [backend-architecture.md](05-architecture/backend-architecture.md)     | Modules, APIs, adapters, storage                  |
| [frontend-architecture.md](05-architecture/frontend-architecture.md)   | Next.js, React Query, forms, state                |
| [data-model.md](05-architecture/data-model.md)                         | Entities, retention, relations                    |
| [error-taxonomy.md](05-architecture/error-taxonomy.md)                 | Error families, user messages                     |
| [i18n-rules.md](05-architecture/i18n-rules.md)                         | Localization strategy, 4 Swiss locales            |

### 06 — Build Packs

_Step-by-step implementation blueprints._

| Document                                                        | Description                  |
| --------------------------------------------------------------- | ---------------------------- |
| [frontend-build-pack.md](06-build-packs/frontend-build-pack.md) | Routes, components, hooks    |
| [backend-build-pack.md](06-build-packs/backend-build-pack.md)   | Modules, DB migrations, jobs |
| [admin-build-pack.md](06-build-packs/admin-build-pack.md)       | Admin UI, search, audit      |

### 07 — Operations

_Running and maintaining the product._

| Document                                                                         | Description                                           |
| -------------------------------------------------------------------------------- | ----------------------------------------------------- |
| [deployment-and-ci.md](07-operations/deployment-and-ci.md)                       | Docker, CI/CD, env vars, monitoring                   |
| [analytics-and-observability.md](07-operations/analytics-and-observability.md)   | Product analytics, dashboards, privacy-safe telemetry |
| [abuse-and-fraud-ops.md](07-operations/abuse-and-fraud-ops.md)                   | Suspicious-activity detection, review, escalation     |
| [security-and-privacy.md](07-operations/security-and-privacy.md)                 | Encryption, compliance, access control                |
| [admin-and-support.md](07-operations/admin-and-support.md)                       | Support workflows, dashboard                          |
| [payment-dispatch-recovery.md](07-operations/payment-dispatch-recovery.md)       | Safe recovery runbook for payment and dispatch cases  |
| [locale-gates-and-rollout.md](07-operations/locale-gates-and-rollout.md)         | Locale sign-off, rollout, and disable rules           |
| [incident-response.md](07-operations/incident-response.md)                       | Incident severity, response flow, communications      |
| [disaster-recovery-and-drills.md](07-operations/disaster-recovery-and-drills.md) | Backup restore proof and recurring drills             |
| [pre-launch-checklist.md](07-operations/pre-launch-checklist.md)                 | Production gate before any public release             |
| [dev-workflow.md](07-operations/dev-workflow.md)                                 | Git conventions, code quality, PR rules               |

### 08 — Guardrails

_What we must never do. Read before writing any code._

| Document                                                                         | Description                                                   |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [ai-implementation-rules.md](08-guardrails/ai-implementation-rules.md)           | Anti-hallucination rules for AI-assisted dev                  |
| [ai-quality-governance.md](08-guardrails/ai-quality-governance.md)               | Prompt/model versioning, regression and kill-switch rules     |
| [swiss-post-api-reference-map.md](08-guardrails/swiss-post-api-reference-map.md) | Repo-wide map of API-dependent documentation areas            |
| [provider-certainties.md](08-guardrails/provider-certainties.md)                 | Known vs unknown matrix for providers                         |
| [provider-readiness-gate.md](08-guardrails/provider-readiness-gate.md)           | Evidence required before provider-backed launch paths go live |
| [swiss-post-appendix.md](08-guardrails/swiss-post-appendix.md)                   | Verified provider facts only                                  |
| [non-goals.md](08-guardrails/non-goals.md)                                       | Forbidden shortcuts and anti-patterns                         |
| [open-decisions.md](08-guardrails/open-decisions.md)                             | Unresolved decisions that block implementation                |

---

## Document Conventions

- **`Episto`** — locked implementation and launch-preparation product name
- **Status: Decided** — locked; do not change without explicit review
- **Status: Living document** — expected to evolve as implementation proceeds
- **Status: Provisional** — decided for now; may change with new information
- **Cross-references** use relative paths such as `../section/file.md`

## Decision Status Labels

| Label                    | Meaning                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| **Locked**               | Decided and final. Do not revisit without a documented reason.                                      |
| **Recommended → Locked** | Was provisional, now promoted to locked.                                                            |
| **Provisional**          | Default for now; change requires updating all dependent docs.                                       |
| **Open**                 | Not yet decided. Do not resolve by guessing. See [Open Decisions](08-guardrails/open-decisions.md). |
