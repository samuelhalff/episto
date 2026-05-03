# Storage Provisioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove automatic MinIO bucket bootstrapping from Compose startup while keeping S3-compatible storage required and clearly surfaced through backend readiness.

**Architecture:** The backend keeps its existing S3-compatible storage contract. Compose stops auto-running a one-shot setup container, and object-storage provisioning becomes an explicit operator step. Backend readiness treats missing bucket access as a hard dependency so the stack fails clearly instead of later in file flows.

**Tech Stack:** Docker Compose, MinIO, AWS SDK S3 client, Fastify, Vitest, Markdown docs

---

### Task 1: Add readiness regression coverage

**Files:**

- Modify: `backend/tests/health-routes.test.ts`
- Test: `backend/tests/health-routes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("fails readiness when object storage access fails", async () => {
  mocks.checkBucketAccess.mockRejectedValue(new Error("Bucket not found"));

  let readinessHandler:
    | ((req: unknown, reply: ReturnType<typeof makeReply>) => Promise<void>)
    | undefined;
  const app = {
    get: vi.fn((url: string, handler: typeof readinessHandler) => {
      if (url === "/readiness") {
        readinessHandler = handler;
      }
    }),
  };

  await healthRoutes(app as never);

  const reply = makeReply();
  await readinessHandler?.({}, reply);

  expect(reply.status).toHaveBeenCalledWith(503);
  expect(reply.send).toHaveBeenCalledWith(
    expect.objectContaining({
      status: "degraded",
      checks: expect.objectContaining({
        objectStorage: "fail",
      }),
    }),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w backend -- health-routes.test.ts`
Expected: FAIL because `healthRoutes` does not yet include an object-storage readiness check.

- [ ] **Step 3: Write minimal implementation**

```ts
import { checkBucketAccess } from "../modules/files/adapters/s3.adapter.js";

// ...

try {
  await checkBucketAccess();
  checks.objectStorage = "ok";
} catch {
  checks.objectStorage = "fail";
  allOk = false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w backend -- health-routes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/tests/health-routes.test.ts backend/src/routes/health.ts
git commit -m "test: cover object storage readiness"
```

### Task 2: Remove automatic startup provisioning

**Files:**

- Modify: `docker-compose.yml`
- Modify: `docker-compose.prod.yml`

- [ ] **Step 1: Write the failing expectation**

Use the regression from Task 1 as the safety net. The desired runtime expectation is: Compose no
longer starts a one-shot setup service during `up`, and backend readiness will stay degraded until
storage is provisioned.

- [ ] **Step 2: Run the targeted test baseline**

Run: `npm run test -w backend -- health-routes.test.ts`
Expected: PASS before editing Compose files, proving readiness behavior is covered.

- [ ] **Step 3: Remove the one-shot service and replace it with explicit manual provisioning**

```yaml
minio-provision:
  profiles: ["manual"]
  image: minio/mc:latest
  depends_on:
    minio:
      condition: service_healthy
  entrypoint: >
    /bin/sh -c "
    mc alias set local http://minio:9000 ${MINIO_ROOT_USER:-minioadmin} ${MINIO_ROOT_PASSWORD:-minioadmin};
    mc mb --ignore-existing local/${S3_BUCKET:-episto};
    "
```

Also remove:

```yaml
minio-setup: ...
```

and remove every:

```yaml
minio-setup:
  condition: service_completed_successfully
```

- [ ] **Step 4: Run the targeted test to confirm no backend regression**

Run: `npm run test -w backend -- health-routes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml docker-compose.prod.yml
git commit -m "refactor: make object storage provisioning explicit"
```

### Task 3: Document the provisioning workflow

**Files:**

- Modify: `docs/07-operations/deployment-and-ci-part-01.md`

- [ ] **Step 1: Update the docs**

Add the explicit provisioning command and remove references that imply startup auto-creation:

````md
Provision the local bucket once after MinIO is healthy:

```bash
docker compose run --rm minio-provision
```
````

If the bucket is missing, `/api/readiness` reports degraded object storage until provisioning is
completed.

````

- [ ] **Step 2: Review the doc for consistency**

Check that the service table, local compose outline, and operator instructions no longer refer to
`minio-setup` or automatic bucket creation.

- [ ] **Step 3: Commit**

```bash
git add docs/07-operations/deployment-and-ci-part-01.md
git commit -m "docs: document explicit storage provisioning"
````

### Task 4: Validate the full change

**Files:**

- Modify: `backend/src/routes/health.ts`
- Modify: `backend/tests/health-routes.test.ts`
- Modify: `docker-compose.yml`
- Modify: `docker-compose.prod.yml`
- Modify: `docs/07-operations/deployment-and-ci-part-01.md`

- [ ] **Step 1: Run targeted backend tests**

Run: `npm run test -w backend -- health-routes.test.ts admin-health.test.ts`
Expected: PASS

- [ ] **Step 2: Run repo validation**

Run: `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm run lint && NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm run typecheck && NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/health.ts backend/tests/health-routes.test.ts docker-compose.yml docker-compose.prod.yml docs/07-operations/deployment-and-ci-part-01.md
git commit -m "refactor: separate storage provisioning from runtime startup"
```
