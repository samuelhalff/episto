# Build Tasks

**Status:** Phase 5 — Build & Implementation
**Upstream:** [Roadmap](docs/01-vision/roadmap.md)
**Guidelines:** [Copilot Instructions](.github/copilot-instructions.md)

---

## 1. Foundation & Shared Core
*Goal: Typesafe boundaries before any logic.*

- [ ] **Scaffold Monorepo** (frontend, backend, shared directories)
- [ ] **Shared Enums & Constants** (from `docs/05-architecture/system-contracts.md`)
  - [ ] `PaymentState`, `DispatchState`, `SessionType`
  - [ ] `Locale` (and locale-aware formatting helpers)
- [ ] **Shared Schemas** (Zod)
  - [ ] `Draft` schema (from `docs/05-architecture/data-model.md`)
  - [ ] `Address` validation schema (soft validation rules)
  - [ ] `Order` / `Payment` schemas
- [ ] **Error Taxonomy** (from `docs/05-architecture/error-taxonomy.md`)
  - [ ] Canonical error class hierarchy
  - [ ] Error code constants

## 2. Backend Core
*Goal: Functional API and state machines.*

- [ ] **Database Layer**
  - [ ] Drizzle schema definition (PostgreSQL)
  - [ ] Migration scripts
- [ ] **Session Module**
  - [ ] Guest session creation & 72h TTL logic
  - [ ] Resume token hashing & cookie handling
- [ ] **AI Adapter Shell** (Azure OpenAI)
  - [ ] `AIProviderAdapter` interface
  - [ ] Mock/Stub adapter for local dev
  - [ ] Prompt templates (versioned text files)
- [ ] **Dispatch Adapter Shell** (Swiss Post)
  - [ ] Adapter interface (Barcode, Address, Delivery)
  - [ ] Stub implementation (always returns "accepted" in dev)
- [ ] **PDF Rendering Engine**
  - [ ] Puppeteer service (HTML -> PDF)
  - [ ] Template layout (A4 Swiss standard)
- [ ] **Worker Queue** (BullMQ)
  - [ ] Redis connection setup
  - [ ] Job processors (Rendering, Dispatch, Cleanup, Email)

## 3. Frontend Core
*Goal: Guided drafting and checkout flows.*

- [ ] **Shell & Routing**
  - [ ] Next.js app router setup
  - [ ] Locale middleware (`/[locale]/...`)
- [ ] **Design System**
  - [ ] Tailwind config & Shadcn primitives
  - [ ] Typography & Color tokens (Swiss style)
- [ ] **Drafting Experience**
  - [ ] Conversational input component
  - [ ] Live preview split-pane
  - [ ] SSE hooks for AI streaming
- [ ] **Checkout Flow**
  - [ ] Stripe Elements integration
  - [ ] Price calculation & display
- [ ] **Confirmation & Status**
  - [ ] Order status page (polling/revalidating)

## 4. Launch Validation (Parallel)
*Goal: Commercial & Operational readiness.*

- [ ] **Swiss Post Onboarding** (Get Sandbox Credentials)
- [ ] **Bank Account & Stripe Verification**
- [ ] **Pricing Validation** (Confirm 4.90/8.90 viability)
- [ ] **Locale Quality Gate** (Native speaker review of all strings)
