# Admin Promo-Code Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small, authenticated admin tool for creating, editing, activating, deactivating, archiving, and inspecting promo codes, with first-class support for reusable percentage codes and global one-time-use codes.

**Architecture:** Keep the existing `promo_codes` table and payment redemption logic as the source of truth. Add a shared contract module, a focused Fastify admin route/service pair, and a locale-aware React Query page under `/admin/promos`; derive “expired” from expiry or redemption exhaustion rather than adding another database state. A delete request hard-deletes never-redeemed rows and archives redeemed rows by setting `active = false`.

**Tech Stack:** Next.js 16 App Router, React Query, next-intl, Fastify, Drizzle/Postgres, Zod, existing shadcn/ui components plus official shadcn `table`, `form`, `label`, `switch`, `calendar`, and `date-picker` components.

---

## Decisions locked by this plan

- `code` is stored and compared normalized as trimmed uppercase, using the existing `normalizePromoCode` behavior. It may be edited only while `redeemedCount = 0`; after redemption it is immutable so historical receipt strings remain understandable.
- `kind` is `free | percent | fixed`. `value` is `0` for `free`, a whole percentage from `0` through `100` for `percent`, and CHF cents for `fixed`.
- `maxRedemptions = null` means unlimited. A one-time code means exactly one global redemption across all customers, enforced by `maxRedemptions = 1`; it is not one redemption per customer.
- A row is in the Expired (`perimé`) filter when `expiresAt <= now()` or `maxRedemptions IS NOT NULL AND redeemedCount >= maxRedemptions`, regardless of `active`. Active means usable only when it is active and not expired/exhausted.
- Expiry is entered/displayed in `Europe/Zurich` local time and persisted as a UTC instant in the existing `timestamptz` column. Date-only expiry is not used; the UI sends an explicit local date and time.
- Delete is safe and reversible enough for this low-volume tool: rows with redemptions are archived by `active = false` and remain visible in All/Inactive; rows with zero redemptions are physically deleted. The API reports which outcome occurred so the UI can explain it.
- No migration is needed unless implementation discovers that an explicit `archivedAt` is required; do not add one merely to model the delete button.

## File map

Create:

- `shared/src/contracts/admin-promos.ts` — promo admin response types and Zod input/query schemas.
- `backend/src/modules/admin/admin-promos.service.ts` — normalized CRUD queries, filter derivation, and business validation.
- `backend/src/modules/admin/admin-promos.routes.ts` — authenticated HTTP handlers and error mapping.
- `backend/tests/admin-promos.test.ts` — route/service unit coverage.
- `backend/tests/admin-promos.integration.test.ts` — database-backed CRUD and redemption edge cases, following the existing integration-test guard.
- `frontend/src/app/[locale]/admin/promos/page.tsx` — page shell, tabs, query/mutation wiring.
- `frontend/src/app/[locale]/admin/promos/promos-api.ts` — typed fetchers.
- `frontend/src/app/[locale]/admin/promos/promo-form-dialog.tsx` — create/edit Dialog and React Hook Form/Zod form.
- `frontend/src/app/[locale]/admin/promos/promo-table.tsx` — table rows, badges, usage, and row actions.
- Official shadcn files under `frontend/src/components/ui/`: `table.tsx`, `form.tsx`, `label.tsx`, `switch.tsx`, `calendar.tsx`, `date-picker.tsx`.

Modify:

- `shared/src/contracts/index.ts` — export the new contract module.
- `shared/src/query-keys.ts` — add `queryKeys.admin.promos(filter)` and `queryKeys.admin.promo(id)`.
- `backend/src/modules/admin/admin.routes.ts` — register `adminPromosRoutes` inside the existing auth/IP hooks.
- `backend/src/modules/admin/index.ts` — export the route if required by the project’s module convention.
- `frontend/src/app/[locale]/admin/admin-sidebar.tsx` — add the Promos navigation item.
- `frontend/src/messages/{de-CH,fr-CH,it-CH,en-CH}.json` — add the complete `admin.promos` namespace and any sidebar/top-bar labels.
- `docs/06-build-packs/admin-build-pack.md` — describe the promo management page and safety rules.
- `docs/05-architecture/api-contracts-part-03.md` — document the admin promo endpoints and payloads.

---

### Task 1: Add shared promo contracts and query keys

**Files:**

- Create: `shared/src/contracts/admin-promos.ts`
- Modify: `shared/src/contracts/index.ts`
- Modify: `shared/src/query-keys.ts`
- Test: `shared/src/contracts/admin-promos.test.ts` if shared test placement exists; otherwise add schema assertions to the existing shared Vitest suite.

- [ ] Define `AdminPromoKind = "free" | "percent" | "fixed"` and `AdminPromoFilter = "active" | "expired" | "inactive" | "all"`.
- [ ] Define the response shape with `id`, `code`, `kind`, `value`, `maxRedemptions`, `redeemedCount`, `expiresAt`, `active`, `note`, `createdAt`, `updatedAt`, and a derived `status` of `active | expired | inactive`.
- [ ] Define `AdminPromosResponse` as `{ promos: AdminPromo[] }` and `AdminPromoDeleteResponse` as `{ outcome: "hard_deleted" | "archived"; promoId: string }`.
- [ ] Define strict Zod schemas for:
  - `listAdminPromosQuerySchema`: `filter` defaulting to `active`.
  - `createAdminPromoSchema`: normalized code input, kind, value, nullable/unlimited max, nullable expiry, active, and bounded note.
  - `updateAdminPromoSchema`: same editable fields with optional properties; keep `active` out of ordinary edits so the toggle endpoint is the single activation mutation.
  - `promoIdParamsSchema`.
- [ ] Add cross-field validation: `free` requires `value = 0`; `percent` requires `0 <= value <= 100`; `fixed` requires a non-negative integer; `maxRedemptions` is null or an integer `>= 1`; expiry is null or an ISO datetime. Normalize code before validation and reject empty/overlong values.
- [ ] Export the module from `shared/src/contracts/index.ts` and add `promos(filter)` plus `promo(id)` query keys under `queryKeys.admin`.
- [ ] Run the shared typecheck/tests and commit: `feat: add admin promo contracts`.

### Task 2: Implement the admin promo service

**Files:**

- Create: `backend/src/modules/admin/admin-promos.service.ts`
- Test: `backend/tests/admin-promos.integration.test.ts`

- [ ] Implement `listAdminPromos(filter, db, now = new Date())`, selecting from `schema.promoCodes`, ordering active/usable rows first and then by `updatedAt DESC`, and applying the derived filter in SQL where practical. Return ISO strings and the derived status.
- [ ] Implement a single `validatePromoMutation(input, existing?, now)` function used by create and update. It must normalize the code, enforce kind/value rules, reject a duplicate normalized code, reject changing a redeemed code, reject lowering `maxRedemptions` below `redeemedCount`, and parse expiry as a real instant.
- [ ] Implement `createPromo(input, db)` with a unique-conflict-safe insert. Map a Postgres unique violation to a stable `PROMO_CODE_EXISTS` application error rather than leaking SQL details.
- [ ] Implement `updatePromo(id, input, db)` with not-found handling, immutable-code-after-redemption handling, and the max-redemptions guard. Return the same shaped promo as the list endpoint.
- [ ] Implement `setPromoActive(id, active, db)`; activating an expired or fully redeemed code must return `PROMO_NOT_USABLE` and leave it inactive. Deactivation is always allowed.
- [ ] Implement `deletePromo(id, db)`: if `redeemedCount > 0`, update `active = false` and return `archived`; otherwise delete and return `hard_deleted`. Use the row’s current count in the same transaction/conditional mutation so a concurrent redemption cannot turn a hard-delete decision stale.
- [ ] Add integration coverage for create/list filters, normalized uniqueness, all three kinds, expiry, exhaustion, activation guards, update guards, and both delete outcomes. Use explicit `now` inputs for deterministic filter tests and `Europe/Zurich` conversion examples.
- [ ] Run the backend integration/unit tests and commit: `feat: add admin promo service`.

### Task 3: Add authenticated Fastify routes and registration

**Files:**

- Create: `backend/src/modules/admin/admin-promos.routes.ts`
- Modify: `backend/src/modules/admin/admin.routes.ts`
- Modify: `backend/src/modules/admin/index.ts`
- Modify/Test: `backend/tests/admin-promos.test.ts`

- [ ] Register these endpoints in `adminPromosRoutes`:

  | Method   | Path                                                  | Behavior                                        |
  | -------- | ----------------------------------------------------- | ----------------------------------------------- |
  | `GET`    | `/admin/promos?filter=active\|expired\|inactive\|all` | List codes and usage                            |
  | `POST`   | `/admin/promos`                                       | Create code                                     |
  | `PATCH`  | `/admin/promos/:id`                                   | Edit code settings                              |
  | `POST`   | `/admin/promos/:id/toggle-active`                     | Body `{ active: boolean }`; activate/deactivate |
  | `DELETE` | `/admin/promos/:id`                                   | Hard-delete unused or archive redeemed          |

- [ ] Parse all bodies/query params with the shared Zod schemas before calling the service. Return consistent existing error helpers/statuses for invalid input, not found, duplicate code, unusable activation, and unsafe max-redemption changes.
- [ ] Keep the routes under the existing `adminRoutes` hooks so `requireAllowlistedAdminIp` and `requireAdmin` protect every endpoint. Add `Cache-Control: no-store` to all responses.
- [ ] Emit a `support_event` for create, update, toggle, and delete/archive with the authenticated actor and non-sensitive details (`promoId`, action, normalized code, outcome). Do not log customer data.
- [ ] Register the route module after the other admin subroutes in `admin.routes.ts` and export it consistently from `admin/index.ts`.
- [ ] Test route registration, auth protection through the parent route, schema failures, success payloads, stable error codes, and audit event calls. Commit: `feat: expose admin promo endpoints`.

### Task 4: Install only the required official shadcn/ui primitives

**Files:**

- Create/modify: `frontend/src/components/ui/{table,form,label,switch,calendar,date-picker}.tsx`
- Modify: `frontend/package.json` and lockfile only if the CLI adds required dependencies.

- [ ] From `frontend/`, run the project’s configured shadcn CLI command:

  ```bash
  npx shadcn@latest add table form label switch calendar date-picker
  ```

- [ ] Review the generated files against the existing admin theme tokens and preserve the project’s existing component conventions. Do not hand-write replacement primitives or introduce a second UI library.
- [ ] Confirm the CLI adds the date/calendar dependencies needed by the generated components and does not replace the existing `tabs`, `dialog`, `input`, `select`, `badge`, `popover`, `sheet`, or `app-button` implementations.
- [ ] Run `npm run typecheck` in `frontend/` and commit: `chore: add shadcn primitives for promo editor`.

### Task 5: Add typed frontend API and query/mutation wiring

**Files:**

- Create: `frontend/src/app/[locale]/admin/promos/promos-api.ts`
- Modify: `shared/src/query-keys.ts` (only if Task 1 did not finish the keys)

- [ ] Implement typed fetchers for list, create, update, toggle-active, and delete using the existing API base/authenticated cookie pattern from `financials-api.ts`.
- [ ] Send dates as ISO instants, not browser-local strings; convert the form’s Zurich local date/time to an explicit offset before calling the API.
- [ ] Make each mutation invalidate `queryKeys.admin.promos(currentFilter)` and the broad `queryKeys.admin.promos("all")`; after delete, show the returned archive/hard-delete outcome.
- [ ] Keep API errors typed enough for field-level duplicate/validation messages and a generic localized action failure. Commit: `feat: add admin promo client API`.

### Task 6: Build the admin page, filters, table, and form Dialog

**Files:**

- Create: `frontend/src/app/[locale]/admin/promos/page.tsx`
- Create: `frontend/src/app/[locale]/admin/promos/promo-table.tsx`
- Create: `frontend/src/app/[locale]/admin/promos/promo-form-dialog.tsx`
- Modify: `frontend/src/app/[locale]/admin/admin-sidebar.tsx`

- [ ] Add a client page using React Query and `Tabs` with at least `Active`, `Expired` (`Perimé` through the locale key), `Inactive`, and `All`. Keep the selected filter in component state; URL persistence is unnecessary for this low-volume tool.
- [ ] Render a shadcn `Table` with code, discount, usage (`redeemedCount / maxRedemptions` or `redeemedCount / ∞`), expiry, status badge, note, and row actions. Use `DropdownMenu` for actions and `AppButton` for primary controls.
- [ ] Use `Dialog`, `Form`, `Label`, `Input`, `Select`, `Switch`, and official `DatePicker` only. The form fields are code, kind, value, max redemptions (blank means unlimited), expiry, active-on-create, and note.
- [ ] Make the form conditional: hide/disable value for `free` and send zero; label percent as `%`, fixed as CHF cents/CHF input according to the existing money-input convention; show an explicit one-time shortcut that sets max redemptions to `1` without creating a separate archetype.
- [ ] In edit mode, disable the code field after any redemption and show why. Prevent saving a max below current usage before the request, while retaining the backend guard.
- [ ] Add copy-to-clipboard with success/error feedback, activate/deactivate, edit, and delete actions. Confirm delete in a Dialog; if the row has redemptions, state that the action archives it and preserves usage history.
- [ ] Add loading, empty, error, and mutation-pending states that work on a narrow mobile viewport. Do not build pagination, bulk actions, analytics, customer targeting, or import/export.
- [ ] Add a `Promos` link with a suitable Lucide icon in the Dashboard or Operations section and ensure active-path highlighting works.
- [ ] Run frontend typecheck/tests and commit: `feat: add admin promo management page`.

### Task 7: Add complete i18n coverage

**Files:**

- Modify: `frontend/src/messages/de-CH.json`
- Modify: `frontend/src/messages/fr-CH.json`
- Modify: `frontend/src/messages/it-CH.json`
- Modify: `frontend/src/messages/en-CH.json`
- Modify: admin top-bar route metadata if the page title is route-driven there.

- [ ] Add `admin.promos` keys for title, intro, create/edit/save/cancel, tabs (`active`, `expired`, `inactive`, `all`), columns, kinds (`free`, `percent`, `fixed`), unlimited/one-time labels, expiry/Zurich help, usage, status, every row action, confirmation text, archive-vs-delete explanation, validation errors, clipboard feedback, loading/empty/error states, and mutation success/failure.
- [ ] Use the exact locale’s natural wording; specifically provide the French expired label as `Périmé`/`Périmés` as appropriate, while keeping the key stable as `expired`.
- [ ] Keep all visible page text under `useTranslations("admin")`; do not add hard-coded English fallback strings in the page/table/form.
- [ ] Validate that all four JSON files have the same key shape and run the frontend test/typecheck commands. Commit: `feat: localize admin promo management`.

### Task 8: Expand the written feature description and API documentation

**Files:**

- Modify: `docs/06-build-packs/admin-build-pack.md`
- Modify: `docs/05-architecture/api-contracts-part-03.md`

- [ ] Add an Admin Build Pack section describing the `/admin/promos` page, the two creation archetypes, supported kinds, usage display, filter semantics, activation rules, and the minimal non-goals.
- [ ] Document the precise one-time definition: `maxRedemptions = 1` is a single global redemption, independent of customer identity and promo kind.
- [ ] Document Zurich-local expiry entry and UTC persistence, derived expired status, and the delete policy: hard-delete when never redeemed, archive as inactive when redeemed.
- [ ] Add request/response examples and error codes for all five endpoints to the Admin API contract section, including the `archived` delete result and max-redemption conflict.
- [ ] Run a documentation link/markdown check if one exists and commit: `docs: describe admin promo management`.

### Task 9: Final verification and handoff

**Files:**

- No new files; verify all changed files above.

- [ ] Run the backend unit suite, the promo integration suite with its database guard, shared typecheck/tests, frontend typecheck/tests, and the repository’s standard lint/build command if available.
- [ ] Manually verify the narrowest useful flow: create a reusable `20%` code with no cap, create a one-time free/fixed code with max `1`, edit/deactivate/reactivate, copy, observe Expired after exhaustion, and delete both an unused and redeemed code.
- [ ] Verify no frontend admin promo UI uses raw `<table>`, custom dialog/select/label/switch/calendar primitives, or hard-coded user-facing strings.
- [ ] Review `git diff --check`, inspect the final changed-file list, and commit any test-only or cleanup fix separately with a specific message.

## Self-review checklist

- Shared CRUD contracts, query keys, backend CRUD/filter/toggle/delete behavior, auth, validation, tests, frontend actions, shadcn additions, sidebar, all four locales, and both documentation locations are covered above.
- The plan has no new database state for archive, so it remains compatible with the verified existing schema.
- Lowering a cap below current usage, changing redeemed codes, activating exhausted/expired codes, and deleting redeemed rows have explicit behavior and tests.
- Scope remains intentionally small: no customer targeting, bulk operations, pagination, redemption history table, or analytics beyond `redeemedCount`.
