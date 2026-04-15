# Next.js Proxy Unification Design

**Status:** approved for implementation

## Problem

The frontend currently defines both `frontend/src/middleware.ts` and `frontend/src/proxy.ts`.
Next.js 16 treats these as competing runtime entrypoints and refuses to build when both exist.

The two files also each own real production behavior:

- `proxy.ts` handles locale routing through `next-intl`
- `middleware.ts` injects the per-request CSP nonce and response header plumbing

A production-ready fix must preserve both behaviors without relying on fallback CSP behavior or
leaving two incompatible entrypoints in place.

## Decision

Unify request-time behavior into a single `frontend/src/proxy.ts` entrypoint and remove
`frontend/src/middleware.ts`.

The surviving proxy will own:

1. locale routing via `next-intl`
2. per-request CSP nonce generation
3. forwarding `x-nonce` on the request headers
4. writing the `Content-Security-Policy` response header

## Design

### Runtime boundary

`frontend/src/proxy.ts` becomes the only Next.js request-time entrypoint.

It should orchestrate request handling in this order:

1. Generate a fresh nonce
2. Build the CSP string from the shared helper in `frontend/src/lib/csp.ts`
3. Forward the nonce and CSP to the request headers
4. Delegate request handling to the existing `next-intl` routing middleware
5. Attach the CSP header to the final response

This keeps Next.js 16 happy while preserving the same CSP contract that `middleware.ts` introduced.

### Responsibility split

- `proxy.ts` should remain orchestration code only
- nonce generation can stay local to `proxy.ts` or move to a tiny focused helper if that improves
  readability
- `frontend/src/lib/csp.ts` remains the shared policy builder used by runtime code, tests, and
  `next.config.ts`
- `next.config.ts` remains the static fallback location for shared header configuration, but the
  production CSP nonce behavior comes from the merged proxy path

### Matcher behavior

The final proxy matcher must continue to cover the routes needed by both existing files:

- locale-routed application pages
- HTML responses that need a fresh CSP nonce
- exclusions for Next.js internals, static assets, and prefetch requests where appropriate

The implementation should merge matcher intent deliberately instead of copying one file over the
other.

### Failure posture

When the proxy runs, HTML responses must continue to receive:

- a fresh nonce
- `x-nonce` on forwarded request headers
- a matching `Content-Security-Policy` response header

The implementation must not silently downgrade production behavior to the static CSP fallback from
`next.config.ts`.

## Files expected to change

- `frontend/src/proxy.ts`
- `frontend/src/middleware.ts` (delete)
- `frontend/next.config.ts` (comments/docs alignment if needed)
- `frontend/tests/...` for build/runtime regression coverage

## Testing

- add or update targeted frontend tests so the merged proxy behavior is covered
- verify the frontend build succeeds on Node 20 after removing the conflicting entrypoint
- preserve existing CSP nonce expectations and locale-routing behavior

## Out of scope

- changing the app’s CSP policy itself
- refactoring i18n structure beyond what is needed for proxy unification
- replacing `next-intl`
