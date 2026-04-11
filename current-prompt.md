# Swiss Mail — Production Hardening Pass

You are making a single cleanup pass on the `swiss-mail` monorepo on branch
`claude/code-review-cleanup-eujI7`. Goal: eliminate hacks, legacy code, and
hygiene violations so the repo is fully production-ready. No shortcuts, no
backwards-compat shims, no "leave for later" comments. If something is unused,
delete it outright.

## Ground rules
- **No `any`**, no `as any`, no `@ts-expect-error`, no `@ts-ignore`. If a
  library has bad types, wrap it in a typed adapter or replace it.
- **No hacks, no TODO/FIXME stubs.** Fully implement each fix.
- **No backwards-compat shims.** Change call sites; don't re-export old names.
- **File-size rule**: target ≤300 lines, hard cap 500. Split before 500.
- **Cite file paths and line numbers** in your commits.
- Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` after
  each major section and fix any new failures before proceeding.
- Commit in logical chunks with descriptive messages; push to
  `claude/code-review-cleanup-eujI7` at the end. Do NOT open a PR.

## Section 1 — Delete cruft (critical)
1. Delete `tmp-current-receipt.html` at repo root.
2. Delete empty `services/` directory.
3. Add these patterns to `.gitignore`:
   ```
   tmp-*
   *.tmp.html
   ```
4. Audit repo root for other stray temp/debug files and remove them.

## Section 2 — Type safety (critical)
1. **`backend/src/modules/payments/payment.routes.ts`** (lines 52, 79):
   remove both `as any` casts around `rawBodyBuffer`. Implement properly by
   using Fastify module augmentation — create
   `backend/src/types/fastify.d.ts` that declares:
   ```ts
   declare module 'fastify' {
     interface FastifyRequest {
       rawBodyBuffer?: Buffer;
     }
   }
   ```
   Then the routes can assign/read `request.rawBodyBuffer` with no cast.
   Verify the `.d.ts` is included by `backend/tsconfig.json`.

2. **`eslint.config.js`**: change
   `@typescript-eslint/no-explicit-any` from `"warn"` to `"error"`.
   Also enable:
   - `@typescript-eslint/no-non-null-assertion: "error"`
   - `@typescript-eslint/ban-ts-comment: ["error", { "ts-expect-error": true, "ts-ignore": true }]`
   Then fix every new lint error produced. Do not suppress.

3. **`frontend/src/components/product/SignatureCanvas.tsx`**: remove the
   `@ts-expect-error` comment. The root cause is `react-signature-canvas`
   being a pre-React-19 class component. Two acceptable fixes, pick one:
   - Replace with a React 19-compatible lib (`signature_pad` wrapped in a
     small typed React wrapper), OR
   - Write a thin class-component adapter with correct ref typing so JSX
     compiles without suppression.
   Update any callers and snapshot tests.

## Section 3 — Frontend env validation (critical)
1. Create `frontend/src/lib/env.ts`:
   - Zod schema for every `NEXT_PUBLIC_*` variable the app reads.
   - Parse `process.env` at module load; throw on missing/invalid so build
     fails fast. Export a typed `env` object.
   - Include: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`, the Stripe
     publishable key, and any others grepped from the codebase.
2. Replace every direct `process.env.NEXT_PUBLIC_*` read in `frontend/src/**`
   with imports from `@/lib/env`. No `??` fallbacks hiding missing config.
3. Mirror the convention used by `backend/src/config/env.ts` (or wherever
   `EnvSchema` lives) for consistency.

## Section 4 — Path aliases (high)
1. Add to `frontend/tsconfig.json` `compilerOptions.paths`:
   ```json
   {
     "@/*": ["./src/*"],
     "@/components/*": ["./src/components/*"],
     "@/lib/*": ["./src/lib/*"],
     "@/hooks/*": ["./src/hooks/*"],
     "@/app/*": ["./src/app/*"],
     "@/i18n/*": ["./src/i18n/*"]
   }
   ```
   Ensure `baseUrl` is set. Verify Next.js picks them up (it does by default
   via tsconfig).
2. Replace **every** `../../../` or deeper relative import in
   `frontend/src/**` with the matching alias. Known offenders to start with:
   - `frontend/src/app/[locale]/admin/sessions/[id]/page.tsx`
   - `frontend/src/app/[locale]/resume/[token]/page.tsx`
   - `frontend/src/app/[locale]/status/[orderToken]/page.tsx`
   - `frontend/src/app/[locale]/draft/[draftId]/[step]/page.tsx`
   - `frontend/src/app/[locale]/draft/[draftId]/review/page.tsx`
   Grep the whole tree; don't stop at these five.
3. Run typecheck + build to verify nothing broke.

## Section 5 — Split oversized files (high)
Split each of these into cohesive sub-modules. Do NOT just extract random
chunks — group by responsibility and export only what callers need. After
each split, run tests and lint. Target ≤300 LOC per file, hard cap 500.

Frontend:
- `frontend/src/components/product/draft-flow/BodyStep.tsx` (819) — also
  see Section 6; split into:
  - `BodyStep.tsx` (orchestrator, ≤200 LOC)
  - `BodyComposer.tsx` (AI composer UI)
  - `BodyRefinementThread.tsx`
  - `BodyPreview.tsx`
  - `bodyStepReducer.ts` (from Section 6)
- `frontend/src/components/marketing/PricingPageClient.tsx` (770) — split
  into `PricingHero`, `PricingTiers`, `PricingFaq`, `PricingCta`.
- `frontend/src/components/product/draft-flow/RecipientStep.tsx` (604) —
  split recipient form, recipient search, and selected-recipient summary.

Backend:
- `backend/src/modules/dispatch/adapters/epost.adapter.ts` (803) — separate
  HTTP client, request builders, response mappers, and error translation.
- `backend/src/modules/rendering/render.service.ts` (708) — separate the
  PDF rendering pipeline, the HTML template assembly, and the caching layer.
- `backend/src/db/schema.ts` (730) — split by domain: `schema/auth.ts`,
  `schema/drafts.ts`, `schema/payments.ts`, `schema/dispatch.ts`, etc.
  Re-export from a new `schema/index.ts`. Update every importer.
- `backend/src/modules/payments/payment.routes.ts` (632) — separate webhook
  route, checkout route, and customer-portal route into files.
- `backend/src/modules/ai/prompts/index.ts` (591) — split per prompt family.

## Section 6 — Re-render hygiene (high)
1. **`BodyStep.tsx`**: replace the 10+ `useState` calls with a single
   `useReducer`. Define a discriminated-union action type.
2. Audit every component touched in Section 5 for:
   - Inline object/array props → extract with `useMemo`.
   - Inline function props passed to memoized children → wrap in
     `useCallback`.
   - Children that should be `React.memo` and currently aren't.
3. Do NOT blanket-wrap everything; only apply where a real child re-render
   is triggered. Justify each in the commit message.

## Section 7 — Test coverage (high)
1. **`vitest.config.ts`**: add `frontend/src/**` to
   `coverage.include`. Set thresholds:
   ```ts
   coverage: {
     thresholds: { lines: 70, functions: 70, branches: 65, statements: 70 },
   }
   ```
2. Run `npm run test -- --coverage`. Add targeted unit tests for any
   critical path that falls below threshold. Prefer small unit tests over
   integration tests for coverage lift.
3. Update `.github/workflows/ci.yml` to run coverage and fail on threshold
   violations. Upload the coverage report as a CI artifact.

## Section 8 — Error tracking (medium)
1. `frontend/src/lib/error-tracking.ts` is currently a console-only
   placeholder. Replace with a real Sentry integration:
   - Install `@sentry/nextjs`.
   - Add `NEXT_PUBLIC_SENTRY_DSN` to the Zod env schema from Section 3
     (optional — if unset, no-op cleanly with a typed null sink, not
     `console.error`).
   - Wire `Sentry.init` in the Next.js client and server entry points as
     per the SDK docs.
   - Replace every `captureError` call site with the Sentry API.
2. Same treatment on backend if a console-only sink exists there.

## Section 9 — Dependency hygiene (medium)
1. Sync `puppeteer` and `puppeteer-core` to the same version at repo root.
2. If `react-signature-canvas` was replaced in Section 2.3, delete it from
   `package.json` and run `npm install` to refresh the lockfile.
3. Run `npm outdated` at root, backend, frontend. Upgrade anything with a
   safe minor/patch bump. Do NOT do major upgrades in this pass unless
   required to remove an alpha dep.
4. Remove any unused dependencies flagged by `depcheck` or manual grep.

## Section 10 — Accessibility (medium)
Audit every dialog/modal in `frontend/src/components/**`:
- Root element has `role="dialog"` and `aria-modal="true"`.
- `aria-labelledby` points at a visible title; `aria-describedby` at
  description when present.
- Focus moves into the modal on open and is trapped until close.
- ESC closes; overlay click closes (unless explicitly disallowed).
- The trigger gets focus back on close.
Use a headless primitive (Radix or React Aria) for anything custom.

## Section 11 — CI and hooks (medium)
1. Add `husky` + `lint-staged` to the root `package.json`:
   - On pre-commit: run `eslint --fix` and `prettier --write` on staged
     files; block commit on any `tmp-*` file; block commit on any file
     over 500 LOC (write a tiny node script for the size check).
2. Add a CI job that runs the same file-size guard across the tree and
   fails the build on violations.
3. Add a CI job that runs a migration rollback test: apply latest, roll
   back one, re-apply. Use a throwaway Postgres in the existing compose.

## Section 12 — Docs and status (low)
1. `README.md`: update the project status section to reflect current
   reality (remove "pre-implementation gate not cleared" wording if the
   code is feature-complete). Keep it accurate and short.
2. Review `docs/index.md` for dead links; fix or delete.
3. Split any single doc file over 600 lines into linked sub-docs.
4. Delete `TASKS.md` entries that are obsolete; do not keep historical
   noise. If tracking is needed, point at issues.
5. Do not add `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, or `CHANGELOG.md`
   unless the user asks.

## Section 13 — Final gates
Run in order; every command must pass:
```bash
npm run lint
npm run typecheck
npm test -- --coverage
npm run build
```
Fix root causes of any failure. Do not suppress, skip, or `.only` tests.

## Deliverables
- All changes committed in logical chunks to
  `claude/code-review-cleanup-eujI7`.
- Pushed to origin.
- Final summary comment listing: files deleted, files split (with LOC
  before/after), number of `any`/`@ts-expect-error` removed, coverage
  numbers before/after, new CI jobs added.
- No open PR unless explicitly requested.
