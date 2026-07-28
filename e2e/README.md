# Episto End-to-End Tests

Playwright-based e2e test suite for the Episto letter-sending platform.

## Prerequisites

- Node.js ≥ 20.9.0
- Docker Compose (for the full stack)
- Playwright browsers installed: `npx playwright install --with-deps chromium`

## Quick Start

```bash
# 1. Bring up the development stack
docker compose up -d

# 2. Install Playwright browsers (one-time)
npx playwright install --with-deps chromium

# 3. Set environment (defaults work for local dev)
export E2E_BASE_URL=http://localhost:5000
export E2E_API_URL=http://localhost:5000/api

# 4. Run the smoke crawl (recommended first test)
npm run test:e2e:smoke

# 5. Run all e2e tests
npm run test:e2e

# 6. Interactive UI mode
npm run test:e2e:ui
```

## Environment Variables

| Variable            | Default                     | Description                                          |
| ------------------- | --------------------------- | ---------------------------------------------------- |
| `E2E_BASE_URL`      | `http://localhost:5000`     | Base URL for the frontend (nginx proxy)              |
| `E2E_API_URL`       | `http://localhost:5000/api` | Base URL for the backend API                         |
| `E2E_ALLOW_PAYMENT` | _(unset)_                   | Set to `1` to enable tests that interact with Stripe |

## Known Constraints

### Running against production

The suite works against `episto.ch` (`E2E_BASE_URL=https://episto.ch
E2E_API_URL=https://episto.ch/api`), which is the only way to verify the real
build. Two things to know before you do:

- **Draft creation is capped at 20/hour/IP.** Each test that opens a workspace
  spends one. A single full run of `template-guidance.spec.ts` costs 7; three
  runs within the hour start failing on the app's generic error page.
  `template-guidance.spec.ts` detects this and fails with the reason rather than
  a mystery timeout.
- **Never run anything that reaches payment or dispatch against prod.** Stripe is
  live and ePost submits real mail. `template-guidance.spec.ts` is prod-safe
  because it never sends the composer, so no AI turn is billed either.

The session cookie name and `secure` flag are derived from whether `E2E_API_URL`
is https, not from the runner's `NODE_ENV`.

### AI Drafting (Azure OpenAI)

The local development environment has **no working Azure OpenAI key**. Real AI
drafting WILL fail. Therefore, tests that need draft content **bootstrap it via
the backend API** (`e2e/helpers/api.ts`) instead of going through the AI compose
flow. The `seedDraftContent()` helper writes sender, recipient, subject, and body
directly via `PUT`/`PATCH` API routes.

### Email (Resend)

Resend email delivery is **real** in all environments. Tests always use
throwaway recipient addresses (`e2e+<random>@example.com`). **Never assert that
an email was delivered** — emails may be queued, delayed, or blocked by Resend's
sandbox mode depending on configuration.

### Payment (Stripe)

The Stripe integration uses **test keys**. Payment tests are **gated behind
`E2E_ALLOW_PAYMENT=1`** because successful payment triggers real dispatch jobs
(though the postal provider is stubbed). The happy-path test is `test.skip`-ed
by default with a comment explaining the gate.

### SMS / Postal / ePost

- SMS: `noop` provider (no real SMS sent)
- Postal dispatch: `stub` provider
- ePost: `mock` provider

## Test Specs

### `smoke-crawl.spec.ts`

Crawls all marketing/static pages across all 4 locales (de-CH, fr-CH, it-CH,
en-CH) and asserts:

- HTTP 200 status
- Zero browser console errors
- Zero uncaught page errors
- No failed same-origin XHR/fetch requests (4xx/5xx)
- No error boundary text ("Something went wrong", "Application error", etc.)
- No raw i18n key leakage (dotted keys like `some.missing.key`)

Collects ALL issues across all pages, writes a structured report to
`e2e/report/smoke-report.json`, prints a console summary table, and only fails
at the end if any critical issues were found.

### `flow-cancel.spec.ts`

End-to-end draft flow tests:

- **Cancel/Back path:** API-bootstraps a draft to `/review`, navigates to
  `/checkout`, clicks back to review, verifies state is intact.
- **Payment failure:** Uses Stripe test card `4000 0000 0000 0002` (declined) in
  the Stripe Payment Element iframe. Asserts the user sees a clear error message
  in a `role="alert"` element and is NOT redirected to `/confirmation`.
- **Happy path (skipped):** Gated behind `E2E_ALLOW_PAYMENT=1` because it
  creates real dispatch jobs and sends a real Resend email.

### `negative.spec.ts`

Error handling and validation tests:

- Direct navigation to `/checkout`, `/review`, `/confirmation` with invalid
  draft IDs does not crash the application.
- Empty required address fields show validation errors and block progression.
- Invalid Swiss postal codes are rejected with feedback.
- Oversized files (>5MB) are rejected with a visible message.
- Invalid file types (e.g. `.exe`) are rejected with a visible message.

### `template-guidance.spec.ts`

The template flow, entered the way a user does (`/draft/new?template=<slug>`):

- The preparation panel names the template and what to have ready, and disables
  nothing (US-1/2/3).
- Turning guidance off clears an untouched starter but never text the user
  edited, and says which happened (US-5/5a).
- The turn-off survives a reload — the write, not the optimistic UI (US-5b).
- A cold draft shows no template surface at all (US-7).
- The panel and its off switch stay on-screen at 390px (US-1, mobile).
- A draft carried into en-CH, which has no authored copy, still shows a generic
  chip and the off switch (US-8). Note this is reached by _switching_ locale:
  `/en-CH/draft/new?template=` builds no template context in the first place,
  because that is derived from landing content en-CH does not have.

Never sends the composer, so it triggers no AI turn and is safe against prod.

## Report Output

- `e2e/report/results.json` — Playwright JSON reporter output
- `e2e/report/smoke-report.json` — Structured smoke crawl findings

## Selectors Strategy

Tests use resilient Playwright selectors:

- `getByRole()` for buttons, links, checkboxes
- `getByLabel()` for form inputs (matches `<label>` elements)
- `getByPlaceholder()` for input placeholders (Stripe iframe)
- `page.locator()` with attribute selectors only as fallback

No `data-testid` attributes are used (none exist in the app). Assertions target
behavior and presence, not exact marketing copy.
