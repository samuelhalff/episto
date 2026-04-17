# Next.js Proxy Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the frontend request-time runtime into a single `proxy.ts` entrypoint so the Next.js 16 build succeeds without regressing locale routing or per-request CSP nonce behavior.

**Architecture:** Keep `frontend/src/proxy.ts` as the only runtime boundary and move the CSP nonce plumbing behind a focused helper so `proxy.ts` stays orchestration-only. The implementation lands in two stages: first teach `proxy.ts` to forward nonce/CSP state correctly, then remove `frontend/src/middleware.ts` and prove the build blocker is gone.

**Tech Stack:** Next.js 16, next-intl, TypeScript, Vitest, Prettier

---

## File structure

- Create: `frontend/src/lib/proxy-security.ts` — pure helper(s) for nonce generation and request/response header wiring
- Modify: `frontend/src/proxy.ts` — compose next-intl routing with the proxy-security helper
- Delete: `frontend/src/middleware.ts` — remove the deprecated competing runtime entrypoint
- Modify: `frontend/next.config.ts` — align CSP comments with the new proxy-owned runtime behavior
- Modify: `frontend/src/lib/csp.ts` — update doc comments if they still mention `middleware.ts`
- Create: `frontend/tests/proxy-runtime.test.ts` — regression test for forwarded nonce/CSP behavior through `proxy.ts`
- Create: `frontend/tests/proxy-entrypoint.test.ts` — regression test for “proxy only, no middleware” build contract

### Task 1: Add the merged proxy runtime regression test

**Files:**

- Create: `frontend/tests/proxy-runtime.test.ts`
- Test: `frontend/tests/proxy-runtime.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const handleI18nRouting = vi.fn((request: NextRequest) =>
  NextResponse.next({ request: { headers: request.headers } }),
);

vi.mock("next-intl/middleware", () => ({
  default: () => handleI18nRouting,
}));

import proxy from "../src/proxy";

describe("proxy runtime", () => {
  beforeEach(() => {
    handleI18nRouting.mockClear();
  });

  it("forwards a nonce upstream and mirrors the CSP on the response", () => {
    const request = new NextRequest("https://example.test/de-CH/pricing");

    const response = proxy(request);

    expect(handleI18nRouting).toHaveBeenCalledOnce();

    const forwardedRequest = handleI18nRouting.mock.calls[0][0] as NextRequest;
    const nonce = forwardedRequest.headers.get("x-nonce");
    const forwardedCsp = forwardedRequest.headers.get("content-security-policy");

    expect(nonce).toBeTruthy();
    expect(forwardedCsp).toContain(`'nonce-${nonce}'`);
    expect(response.headers.get("Content-Security-Policy")).toContain(`'nonce-${nonce}'`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w frontend -- proxy-runtime.test.ts`
Expected: FAIL because the current `frontend/src/proxy.ts` only delegates to `next-intl` and does not yet inject the CSP nonce contract.

- [ ] **Step 3: Write minimal implementation support**

Create `frontend/src/lib/proxy-security.ts` with the smallest helper that makes the runtime contract testable:

```ts
import type { NextResponse } from "next/server";

import { buildContentSecurityPolicy } from "./csp";

export type ProxySecurityContext = {
  nonce: string;
  csp: string;
  requestHeaders: Headers;
};

export function createProxySecurityContext(
  requestHeaders: Headers,
  isDevelopment: boolean,
): ProxySecurityContext {
  const nonce = crypto.randomUUID();
  const csp = buildContentSecurityPolicy(isDevelopment, nonce);
  const forwardedHeaders = new Headers(requestHeaders);

  forwardedHeaders.set("x-nonce", nonce);
  forwardedHeaders.set("content-security-policy", csp);

  return {
    nonce,
    csp,
    requestHeaders: forwardedHeaders,
  };
}

export function attachProxySecurityHeaders(
  response: NextResponse,
  context: ProxySecurityContext,
): NextResponse {
  const existing = response.headers.get("x-middleware-override-headers");

  response.headers.set(
    "x-middleware-override-headers",
    existing ? `${existing},x-nonce` : "x-nonce",
  );
  response.headers.set("x-middleware-request-x-nonce", context.nonce);
  response.headers.set("Content-Security-Policy", context.csp);

  return response;
}
```

- [ ] **Step 4: Run test to verify it still fails for the right reason**

Run: `npm run test -w frontend -- proxy-runtime.test.ts`
Expected: FAIL, but now because `frontend/src/proxy.ts` has not yet been wired to use `createProxySecurityContext()` and `attachProxySecurityHeaders()`.

- [ ] **Step 5: Commit**

```bash
git add frontend/tests/proxy-runtime.test.ts frontend/src/lib/proxy-security.ts
git commit -m "test: add proxy runtime security contract" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 2: Merge CSP nonce behavior into `frontend/src/proxy.ts`

**Files:**

- Modify: `frontend/src/proxy.ts`
- Test: `frontend/tests/proxy-runtime.test.ts`

- [ ] **Step 1: Write the minimal runtime implementation**

Update `frontend/src/proxy.ts` so it keeps next-intl routing while forwarding nonce/CSP state:

```ts
import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";

import { routing } from "./i18n/routing";
import {
  attachProxySecurityHeaders,
  createProxySecurityContext,
} from "./lib/proxy-security";

const handleI18nRouting = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const context = createProxySecurityContext(
    request.headers,
    process.env.NODE_ENV !== "production",
  );

  const modifiedRequest = new NextRequest(request.url, {
    headers: context.requestHeaders,
  });
  const response = handleI18nRouting(modifiedRequest);

  return attachProxySecurityHeaders(response, context);
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|_vercel|favicon.ico|manifest.json|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
```

- [ ] **Step 2: Run the targeted test to verify it passes**

Run: `npm run test -w frontend -- proxy-runtime.test.ts`
Expected: PASS

- [ ] **Step 3: Extend the targeted security checks**

Run: `npm run test -w frontend -- proxy-runtime.test.ts security-headers.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/proxy.ts frontend/tests/proxy-runtime.test.ts frontend/src/lib/proxy-security.ts
git commit -m "feat: merge CSP nonce handling into proxy" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 3: Remove the deprecated middleware entrypoint

**Files:**

- Create: `frontend/tests/proxy-entrypoint.test.ts`
- Delete: `frontend/src/middleware.ts`
- Modify: `frontend/next.config.ts`
- Modify: `frontend/src/lib/csp.ts`
- Test: `frontend/tests/proxy-entrypoint.test.ts`

- [ ] **Step 1: Write the failing entrypoint regression test**

```ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(testDir, "..");

describe("frontend runtime entrypoints", () => {
  it("keeps proxy.ts as the only Next.js runtime entrypoint", () => {
    expect(fs.existsSync(path.join(frontendRoot, "src", "proxy.ts"))).toBe(true);
    expect(fs.existsSync(path.join(frontendRoot, "src", "middleware.ts"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w frontend -- proxy-entrypoint.test.ts`
Expected: FAIL because `frontend/src/middleware.ts` still exists.

- [ ] **Step 3: Remove the competing entrypoint and align comments**

Delete `frontend/src/middleware.ts`.

Then align comments so the codebase references `proxy.ts` as the request-time CSP owner:

```ts
// frontend/next.config.ts
// Security headers — values locked in docs/07-operations/security-and-privacy.md §Security headers
// The CSP is set per-request by `src/proxy.ts` so a fresh nonce can be attached to `script-src`
// on every HTML response. The builder lives in `src/lib/csp.ts` and is re-exported here for
// legacy test imports.
```

```ts
// frontend/src/lib/csp.ts
 * The CSP is set per-request from `src/proxy.ts` so that a fresh nonce can be
 * attached to `script-src` on every HTML response.
```

- [ ] **Step 4: Run the targeted tests to verify they pass**

Run: `npm run test -w frontend -- proxy-entrypoint.test.ts proxy-runtime.test.ts security-headers.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/tests/proxy-entrypoint.test.ts frontend/next.config.ts frontend/src/lib/csp.ts frontend/src/proxy.ts
git rm frontend/src/middleware.ts
git commit -m "fix: remove deprecated middleware entrypoint" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 4: Prove the production build is clean

**Files:**

- Modify: `frontend/src/proxy.ts`
- Modify: `frontend/src/lib/proxy-security.ts`
- Modify: `frontend/tests/proxy-runtime.test.ts`
- Modify: `frontend/tests/proxy-entrypoint.test.ts`
- Modify: `frontend/next.config.ts`
- Modify: `frontend/src/lib/csp.ts`

- [ ] **Step 1: Run the focused frontend verification**

Run: `npm run test -w frontend -- proxy-runtime.test.ts proxy-entrypoint.test.ts security-headers.test.ts marketing-seo.test.ts`
Expected: PASS

- [ ] **Step 2: Run the frontend build on Node 20**

Run: `npx -y -p node@20.19.0 -c 'cd /home/sam/dev/swiss-mail && export NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test && npm run build -w frontend'`
Expected: PASS

- [ ] **Step 3: Run repo-level validation on Node 20**

Run: `npx -y -p node@20.19.0 -c 'cd /home/sam/dev/swiss-mail && export NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test && npm run lint && npm run typecheck && npm test && npm run build'`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/proxy-security.ts frontend/src/proxy.ts frontend/tests/proxy-runtime.test.ts frontend/tests/proxy-entrypoint.test.ts frontend/next.config.ts frontend/src/lib/csp.ts
git commit -m "fix: unify frontend proxy runtime" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
