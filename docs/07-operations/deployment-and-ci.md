# Deployment and CI/CD

**Resolves:** GAP-13, IMPROV-6, IMPROV-7, IMPROV-8

This document specifies the containerization strategy, CI/CD pipeline, environment configuration, secret management, observability, and operational procedures for Swiss Mail.

---

## 1. Containerization Strategy

All services run in Docker containers. Production images must be minimal and reproducible.

### Multi-stage builds

Both `frontend` and `backend` use multi-stage Dockerfiles:

1. **`deps`** — install all dependencies
2. **`build`** — compile TypeScript, run Next.js build
3. **`runner`** — copy only production artifacts, run as non-root user

Base image for all services: `node:20-alpine`

### Dockerfile locations

| File | Service |
|---|---|
| `frontend/Dockerfile` | Next.js SSR + static |
| `backend/Dockerfile` | Node.js API + BullMQ worker (same image, different entrypoint) |

### Puppeteer / Chromium for PDF rendering

PDF generation uses Puppeteer, which requires a Chromium binary. Two valid approaches:

**Option A — Separate renderer service (recommended for production)**
- A dedicated `backend-renderer` container extends the backend image and adds Chromium.
- The API server delegates rendering jobs to the renderer via BullMQ queue.
- Keeps the API container small.

**Option B — Chromium in the backend image (simpler for MVP)**
- Install Chromium during the `deps` stage: `apk add --no-cache chromium`.
- Set `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser` and `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`.
- Increases image size (~200 MB), acceptable for early MVP.

Decision for production: Option A (separate renderer). Decision for MVP: Option B unless image size causes deployment friction.

### Docker Compose (local development)

`docker-compose.yml` at the repo root runs all services locally. See **Section 2** for the full service list.

---

## 2. Service Architecture

### Services

| Service | Image | Port | Purpose |
|---|---|---|---|
| `frontend` | `frontend/Dockerfile` | 3000 | Next.js SSR + static pages |
| `backend` | `backend/Dockerfile` | 4000 | Node.js REST API |
| `worker` | `backend/Dockerfile` | — | BullMQ async job processor (same image, `CMD ["node", "dist/worker.js"]`) |
| `postgres` | `postgres:16-alpine` | 5432 | Primary relational database |
| `redis` | `redis:7-alpine` | 6379 | BullMQ queue + rate limiting + session cache |
| `minio` | `minio/minio` | 9000 / 9001 | S3-compatible object storage (dev only) |

### Port ownership

To avoid port drift, treat these assignments as canonical:

| Port | Owner | Meaning |
|---|---|---|
| `80` / `443` | Public domain edge | Normal public HTTP/HTTPS for `ark-fid.ddns.net` and production domains |
| `5000` | Local Swiss Mail proxy handoff | Plain HTTP listener on the host for the upstream edge proxy to forward into |
| `3000` | Internal frontend service | Next.js app behind the local proxy only |
| `4000` | Internal backend service | Fastify API behind the local proxy only |

Rules:

- Public URLs must use the bare domain, not `:5000`.
- Local reverse-proxy handoff happens on `http://localhost:5000`.
- The local `5000` listener is plain HTTP because the upstream edge proxy already owns public HTTP/HTTPS.
- `frontend:3000` and `backend:4000` are implementation details and must not leak into public URLs, email links, sitemap URLs, or metadata.
- The upstream edge proxy that forwards into local `5000` must preserve `Host` and send `X-Forwarded-Proto`, `X-Forwarded-Host`, and `X-Forwarded-Port` for correct absolute URL generation.

### Local `docker-compose.yml` outline

```yaml
services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:4000
    depends_on: [backend]

  backend:
    build: ./backend
    ports: ["4000:4000"]
    environment:
      - DATABASE_URL=postgres://postgres:postgres@postgres:5432/swissmail
      - REDIS_URL=redis://redis:6379
      - S3_ENDPOINT=http://minio:9000
      # ... (see Section 3 for all env vars)
    depends_on: [postgres, redis, minio]

  worker:
    build: ./backend
    command: ["node", "dist/worker.js"]
    environment:
      - DATABASE_URL=postgres://postgres:postgres@postgres:5432/swissmail
      - REDIS_URL=redis://redis:6379
      - S3_ENDPOINT=http://minio:9000
    depends_on: [postgres, redis, minio]

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: swissmail
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    volumes: [redis_data:/data]

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports: ["9000:9000", "9001:9001"]
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes: [minio_data:/data]

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### Production hosting

Locked: **Infomaniak-centered production topology**.

- Compute: Infomaniak Public Cloud Managed Kubernetes for `frontend`, `backend`, and `worker`
- Database: PostgreSQL on Infomaniak-hosted private-network compute
- Redis: Redis on Infomaniak-hosted private-network compute
- Object storage: Infomaniak S3-compatible object storage for uploads and rendered PDFs
- CDN / TLS / ingress: Infomaniak-managed ingress/TLS first; add Cloudflare only by later explicit decision

> **Operational validation item:** Exact Infomaniak SKU names and whether a managed DB offering is
> mature enough for launch must be validated during provisioning. If not, run PostgreSQL and Redis
> on dedicated Infomaniak compute without changing application code.

### Infomaniak provisioning checklist

Before calling production infrastructure ready, verify:

1. Managed Kubernetes cluster exists with separate namespaces for staging and production
2. Ingress/TLS is configured for `swissmail.ch` and `api.swissmail.ch`
3. Object storage bucket exists with lifecycle/access policy suitable for short-lived content
4. PostgreSQL and Redis are reachable only on the intended private network path
5. Backup/restore path is documented and tested for the chosen PostgreSQL setup
6. Secrets injection path is decided and working end-to-end
7. Health checks, readiness probes, and rolling update behavior are validated in staging

If any of the above fails because a specific Infomaniak managed SKU is immature or missing, fall
back to dedicated Infomaniak compute for that service without reopening the hosting decision.

---

## 3. Environment Variables

All secrets and environment-specific values are injected as environment variables. No secrets in source code or Docker images.

### Backend (required in production)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@host:5432/swissmail` |
| `REDIS_URL` | Redis connection string | `redis://host:6379` |
| `S3_ENDPOINT` | Object storage endpoint URL | `https://s3.infomaniak.com` |
| `S3_BUCKET` | S3 bucket name | `swissmail-production` |
| `S3_ACCESS_KEY` | S3 access key ID | `AKIAIOSFODNN7EXAMPLE` |
| `S3_SECRET_KEY` | S3 secret access key | *(secret)* |
| `S3_REGION` | S3 region (if required by provider) | `eu-west-1` |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI / Azure model endpoint | `https://example-resource.openai.azure.com/` |
| `AZURE_OPENAI_API_KEY` | Azure API key | *(secret)* |
| `AZURE_OPENAI_API_VERSION` | Azure API version | `2024-10-21` |
| `AI_DRAFT_MODEL` | Draft/revision deployment name | `gpt-4.1` |
| `AI_CLASSIFY_MODEL` | Classification/extraction deployment name | `gpt-4.1-mini` |
| `AI_PROVIDER_MODE` | Azure execution mode | `azure_openai` or `azure_ai_project_agent` |
| `AZURE_AI_PROJECT_ENDPOINT` | Azure AI Project endpoint for agent-backed execution | `https://example.services.ai.azure.com/api/projects/my-project` |
| `AZURE_EXISTING_AGENT_ID` | Existing Azure AI Project agent reference in `<agent-name>:<version>` format | `swiss-mail:2` |
| `AZURE_AI_AGENT_NAME` | Azure AI Project agent name | `web-deep-search` |
| `AZURE_AI_AGENT_VERSION` | Azure AI Project agent version | `5` |
| `AZURE_TENANT_ID` | Optional Entra tenant for service-principal auth | *(secret / env-specific)* |
| `AZURE_CLIENT_ID` | Optional Entra client/application ID for service-principal auth | *(secret / env-specific)* |
| `AZURE_CLIENT_SECRET` | Optional Entra client secret for service-principal auth | *(secret)* |
| `SWISS_POST_API_BASE_URL` | Swiss Post API base URL | `https://api.post.ch/...` |
| `SWISS_POST_CLIENT_ID` | Swiss Post OAuth client ID | *(secret)* |
| `SWISS_POST_CLIENT_SECRET` | Swiss Post OAuth client secret | *(secret)* |
| `SWISS_POST_SCOPE` | Swiss Post OAuth scope string if required by onboarding docs | `digital-commerce` |
| `SESSION_SECRET` | Secret for cookie signing and related HMAC use, if enabled by the session implementation | 64-char random hex string |
| `BASE_URL` | Public-facing URL | `https://swissmail.ch` |
| `RESEND_API_KEY` | Resend transactional email API key | *(secret)* |
| `ADMIN_SESSION_SECRET` | HMAC secret for admin session and OAuth state cookies | 64-char random string |
| `ADMIN_SESSION_TTL_HOURS` | Admin session lifetime after Microsoft login | `12` |
| `ADMIN_MICROSOFT_CLIENT_ID` | Microsoft app registration client ID for admin login. Must come from the dedicated WestBay admin app registration, not the temporary AI `AZURE_*` app. | *(secret / env-specific)* |
| `ADMIN_MICROSOFT_CLIENT_SECRET` | Microsoft app registration client secret for admin login | *(secret)* |
| `ADMIN_MICROSOFT_TENANT_ID` | WestBay tenant ID — must be an explicit tenant, never `"common"` | *(secret / env-specific)* |
| `ADMIN_MICROSOFT_REDIRECT_URI` | Fallback backend callback URL for admin Microsoft login. Runtime prefers the current request origin when constructing the OAuth callback, but the Azure app registration must still allow the public and local callback URLs you use. | `https://ark-fid.ddns.net/api/v1/admin/auth/microsoft/callback` |
| `NODE_ENV` | Runtime environment | `production` / `development` / `test` |
| `PORT` | HTTP port (backend) | `4000` |
| `LOG_LEVEL` | Pino log level | `info` |
| `SENTRY_DSN` | Sentry DSN for error tracking | `https://...@sentry.io/...` |

### Frontend (build-time and runtime)

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL (exposed to browser) | `https://api.swissmail.ch` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_live_...` |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for frontend | `https://...@sentry.io/...` |
| `NEXT_PUBLIC_APP_ENV` | App environment label | `production` |

### Notes

- `NEXT_PUBLIC_*` variables are embedded at build time. They must not contain secrets.
- `DATABASE_URL`, `STRIPE_SECRET_KEY`, and `SESSION_SECRET` are the highest-sensitivity variables. Rotate immediately if compromised.
- Use separate values for staging and production for every variable.

---

## 4. CI Pipeline (GitHub Actions)

### Trigger summary

| Trigger | Jobs run |
|---|---|
| Pull request (any branch → `main`) | `lint`, `typecheck`, `test-shared`, `test-frontend`, `test-backend`, `build-check` |
| Merge to `main` | All PR jobs + `docker-build` + `docker-push` |
| Tag `v*` | All main jobs + `deploy-production` |

### Job definitions

```yaml
# .github/workflows/ci.yml

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
    tags: ['v*']

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci --workspaces
      - run: npm run lint --workspaces

  typecheck:
    runs-on: ubuntu-latest
    needs: []
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci --workspaces
      - run: npm run typecheck --workspaces

  test-shared:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci --workspace=shared
      - run: npm test --workspace=shared

  test-frontend:
    runs-on: ubuntu-latest
    needs: [test-shared]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci --workspaces
      - run: npm test --workspace=frontend

  test-backend:
    runs-on: ubuntu-latest
    needs: [test-shared]
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: swissmail_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgres://postgres:postgres@localhost:5432/swissmail_test
      REDIS_URL: redis://localhost:6379
      NODE_ENV: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci --workspaces
      - run: npm run db:migrate --workspace=backend
      - run: npm test --workspace=backend

  build-check:
    runs-on: ubuntu-latest
    needs: [lint, typecheck]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci --workspaces
      - run: npm run build --workspace=shared
      - run: npm run build --workspace=backend
      - run: npm run build --workspace=frontend

  docker-build:
    runs-on: ubuntu-latest
    needs: [test-frontend, test-backend, build-check]
    if: github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/v')
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - name: Build frontend image
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: false
          tags: swissmail/frontend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - name: Build backend image
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: false
          tags: swissmail/backend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  docker-push:
    runs-on: ubuntu-latest
    needs: [docker-build]
    if: github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/v')
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Push frontend image
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/frontend:${{ github.sha }}
            ghcr.io/${{ github.repository }}/frontend:latest
      - name: Push backend image
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/backend:${{ github.sha }}
            ghcr.io/${{ github.repository }}/backend:latest

  deploy-production:
    runs-on: ubuntu-latest
    needs: [docker-push]
    if: startsWith(github.ref, 'refs/tags/v')
    environment: production
    steps:
      - name: Deploy to production
        run: |
          # Platform-specific deployment command
          # e.g., SSH to host and pull new image, or Infomaniak API call
          echo "Deploy ${{ github.ref_name }} to production"
```

### Parallelism

`lint`, `typecheck`, `test-shared` run in parallel. `test-frontend` and `test-backend` both depend only on `test-shared`, so they run in parallel. `build-check` runs in parallel with tests after lint/typecheck pass.

---

## 5. Database Migrations

### Tooling

Migrations are managed with **Drizzle Kit** (`drizzle-kit`).

```
backend/
  src/
    db/
      schema/        # Drizzle schema definitions
      migrations/    # Generated SQL migration files
      migrate.ts     # Migration runner (called at startup)
```

### Migration runner

`migrate.ts` uses `drizzle-orm/node-postgres`'s `migrate()` function. It is called as a separate step before the app server starts:

```
"scripts": {
  "db:migrate": "node dist/db/migrate.js",
  "start": "npm run db:migrate && node dist/server.js"
}
```

In Docker, the entrypoint sequence is:

```
migrate → start api server
migrate → start worker
```

Both `backend` and `worker` run migrations at startup. Migrations are idempotent (Drizzle tracks applied migrations in `__drizzle_migrations` table).

### Rollback

Each forward migration must have a corresponding reverse migration. Drizzle Kit does not auto-generate rollbacks; they are written manually alongside each migration file.

Rollback procedure:
1. Apply the reverse migration SQL manually or via a rollback script.
2. Roll back the application to the previous Docker image tag.
3. Verify health endpoint.

### Expand-contract pattern

All schema changes to production must be backward-compatible. The pattern:

1. **Expand**: add new columns/tables (nullable, with defaults). Deploy app that writes to both old and new.
2. **Migrate data**: backfill data in the new shape.
3. **Contract**: remove old columns/tables once no code reads them.

This ensures zero-downtime migrations (old containers keep running while new ones start).

---

## 6. Staging vs Production

### Environment parity

Staging is identical to production in infrastructure. Differences are configuration-only:

| Aspect | Staging | Production |
|---|---|---|
| Database | Separate DB, same schema | Production DB |
| Stripe | Test mode (`sk_test_...`) | Live mode (`sk_live_...`) |
| Postal provider | Chosen provider sandbox or explicitly non-production adapter | Chosen production provider |
| Email | Real delivery to test addresses | Real delivery |
| Domain | `staging.swissmail.ch` (prod staging), `ark-fid.ddns.net` (dev staging) | `swissmail.ch` |
| Sentry environment | `staging` | `production` |
| `NODE_ENV` | `production` (same runtime) | `production` |

### Feature flags (MVP)

Feature flags for MVP are environment-based: enabled by the presence of an env var or a known env name. No runtime toggle UI in MVP.

```ts
// Example: feature flag pattern
const ENABLE_EPOST_DISPATCH = process.env.ENABLE_EPOST_DISPATCH === 'true';
```

Runtime feature flag systems (LaunchDarkly, Unleash, etc.) are a post-MVP concern.

---

## 7. Secret Management

### Rules

- Secrets are **never** committed to version control.
- Secrets are **never** in Dockerfiles or Docker images.
- Secrets are **never** logged (see Section 9).

### CI secrets

All CI secrets are stored in **GitHub Actions encrypted secrets** (Settings → Secrets and variables → Actions).

Required CI secrets:

| Secret name | Used in |
|---|---|
| `GITHUB_TOKEN` | Docker push to GHCR (auto-provided) |
| `PRODUCTION_DEPLOY_KEY` | SSH key for production deployment |
| `STAGING_DEPLOY_KEY` | SSH key for staging deployment |
| Stripe, S3, DB, etc. | `test-backend` job environment |

### Production secrets

For the Infomaniak-centered deployment:

- Preferred: **platform-level environment variable injection** through the chosen Infomaniak control plane or Kubernetes secret mechanism.
- If operating multiple clusters/services, consider **HashiCorp Vault** (community edition) for centralized secret management.
- Minimum: secrets in a `.env` file at `/etc/swissmail/production.env`, not in the repo, not readable by the www user.

### Secret rotation procedure

| Secret | Rotation steps |
|---|---|
| `SESSION_SECRET` | 1. Generate new value. 2. Update production env. 3. Restart app. 4. If cookie signing depends on this secret, expect existing browser cookies to stop working. |
| `STRIPE_SECRET_KEY` | 1. Generate new key in Stripe dashboard. 2. Update env. 3. Restart. 4. Revoke old key. |
| `STRIPE_WEBHOOK_SECRET` | 1. Roll webhook endpoint in Stripe dashboard. 2. Update `STRIPE_WEBHOOK_SECRET`. 3. Restart. |
| `DATABASE_URL` password | 1. Create new DB user/password. 2. Update `DATABASE_URL`. 3. Restart all services. 4. Drop old user. |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | 1. Create new credentials in storage provider. 2. Update env. 3. Restart. 4. Revoke old credentials. |
| `AZURE_OPENAI_API_KEY` | 1. Generate/rotate key in Azure. 2. Update env. 3. Restart. 4. Revoke old key. |
| `SWISS_POST_CLIENT_SECRET` | 1. Rotate Swiss Post client secret. 2. Update env. 3. Restart backend and worker. 4. Revoke old secret. |
| `RESEND_API_KEY` | 1. Create new Resend API key. 2. Update env. 3. Restart backend and worker. 4. Revoke old key. |
| `ADMIN_SESSION_SECRET` | 1. Generate new 64-char random secret. 2. Update env. 3. Restart backend (existing admin sessions are invalidated). |
| `ADMIN_MICROSOFT_CLIENT_SECRET` | 1. Rotate secret in Azure app registration. 2. Update env. 3. Restart backend. 4. Revoke old secret. |

---

## 8. Zero-Downtime Deployment

### Rolling update strategy

1. Start new container(s) with new image.
2. Wait for new container health check to pass (`GET /api/health` → 200).
3. Route traffic to new container.
4. Stop old container(s).

On Infomaniak Managed Kubernetes: use rolling updates with readiness probes and one extra replica
before draining old pods.

If PostgreSQL/Redis are self-hosted on Infomaniak compute, deploy them separately from application
pods and keep restart windows explicit.

### Health check endpoint

```
GET /api/health
→ 200 OK
{
  "status": "ok",
  "version": "1.2.3",
  "env": "production"
}
```

- Must respond within 5 seconds.
- Does not check external dependencies (Stripe, postal provider) — those have their own monitoring.
- Database connectivity check: optional, but if included, must not block traffic on transient DB hiccups.

Docker healthcheck:
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1
```

### Graceful shutdown

On `SIGTERM`:

1. Stop accepting new HTTP connections.
2. Wait for in-flight HTTP requests to complete (timeout: 30 seconds).
3. Signal BullMQ worker to stop picking up new jobs.
4. Wait for active jobs to finish (timeout: 60 seconds) or checkpoint and re-queue.
5. Close DB connection pool.
6. Exit.

```ts
// backend/src/server.ts
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, starting graceful shutdown');
  server.close(async () => {
    await worker.close(); // BullMQ worker
    await db.end();       // pg pool
    logger.info('Graceful shutdown complete');
    process.exit(0);
  });
});
```

### Expand-contract for migrations

All database migrations run before new app containers start. Old containers must still function with the new schema during the overlap window. See Section 5 (expand-contract pattern).

---

## 9. Monitoring and Observability

**Resolves IMPROV-6.**

### Structured logging

All logging uses **pino** (Node.js) in JSON format. No `console.log` in production code.

```ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'backend', env: process.env.NODE_ENV },
  redact: {
    paths: ['email', 'body.email', 'body.content', 'body.address', '*.email'],
    censor: '[REDACTED]',
  },
});
```

### Log fields (standard per request)

| Field | Description |
|---|---|
| `timestamp` | ISO 8601 |
| `level` | `trace` / `debug` / `info` / `warn` / `error` |
| `requestId` | UUID per HTTP request |
| `sessionId` | Session ID (opaque) |
| `module` | e.g., `payments`, `dispatch`, `rendering` |
| `message` | Human-readable event description |
| `error` | Error name + message + stack (on errors only) |
| `durationMs` | Request or job duration |

### PII in logs — NEVER log

The following must **never** appear in log output:

- Email addresses
- Letter content (body, subject, address)
- File content or file data
- Recipient or sender name
- Physical addresses

Log only: IDs (sessionId, draftId, paymentId, dispatchId), state transitions, error codes.

### Correlation IDs

Every HTTP request gets a `requestId` (UUID v4). It is:
- Set by middleware if not present in `X-Request-ID` header.
- Passed to all logger calls in that request context.
- Propagated to BullMQ job data so queue jobs log with the originating `requestId`.

### Error tracking

**Sentry** for both frontend and backend (recommended).

```ts
// backend/src/instrument.ts (loaded first)
import * as Sentry from '@sentry/node';
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Strip PII from events before sending
    delete event.user?.email;
    return event;
  },
});
```

Frontend: `@sentry/nextjs` with source maps uploaded at build time.

Sentry must be configured to **not** capture letter body content, attachment data, or email addresses.

### Metrics to track

| Metric | Why |
|---|---|
| HTTP request latency (p50, p95, p99) | Performance baseline |
| HTTP error rate (5xx) | Service health |
| Queue depth (BullMQ) | Backlog detection |
| Queue job failure rate | Worker health |
| Payment success rate | Business health |
| Payment failure rate by error code | Stripe issue detection |
| Dispatch submission rate | Postal integration health |
| Dispatch rejection rate | Postal integration issues |
| PDF rendering latency | UX health |
| File upload success/failure rate | Storage health |

### Alerting

Alert on:

- Error rate (5xx) > 1% over 5 minutes
- Queue depth > 100 jobs for > 10 minutes
- Payment failure rate > 10% over 1 hour
- Dispatch rejection rate > 5% over 1 hour
- Health endpoint not responding for > 2 minutes

Alerting channel: email (MVP), Slack or PagerDuty (post-MVP).

### Health status page

A simple internal status page at `/{locale}/admin/health` shows:

- API server: up/down
- Database: connected/unreachable
- Redis: connected/unreachable
- Object storage: reachable/unreachable
- Queue depth: current count
- Last successful dispatch: timestamp
- Last payment: timestamp

This is admin-only (admin auth gated, see Section 11).

---

## 10. Backup Strategy

### Database backups

- **Frequency:** Daily automated backups.
- **Retention:** 30 days for backups unless operations policy changes; this is infrastructure-backup retention, not application-content retention. See `docs/05-architecture/data-model.md`.
- **Mechanism:** Managed backup feature if the chosen Infomaniak PostgreSQL SKU supports it, or
  `pg_dump` cron job to object storage if self-managed.
- **Restore test:** Monthly manual restore test to a temporary database; verify row counts and migration state.
- **Point-in-time recovery:** Enabled if the hosting provider supports WAL archiving.

### Object storage

- Provider-level redundancy is the primary protection for MVP.
- No additional cross-provider backup for MVP.
- Post-MVP: evaluate cross-region replication if provider supports it.

### Configuration and infrastructure

- All configuration is in version control (`.env.example` with all keys, no values).
- Docker Compose files, Dockerfiles, CI workflows, and nginx config are all in the repository.
- No snowflake infrastructure: any deployment should be reproducible from the repository.

---

## 11. Admin Auth

**Resolves IMPROV-8.**

### Backend-managed Microsoft SSO (tenant-only)

The admin UI is served from `/{locale}/admin/...`, while backend admin API routes remain under
`/admin/*`.

Admin operator authentication uses backend-managed Microsoft OAuth over TLS. No Basic Auth fallback
exists.

- Microsoft login flows through `/api/v1/admin/auth/microsoft/login` and
  `/api/v1/admin/auth/microsoft/callback`
- Successful login mints a signed HTTP-only admin session cookie using `ADMIN_SESSION_SECRET`
- Access is authorized by `ADMIN_MICROSOFT_TENANT_ID` (the WestBay tenant); any identity from a
  different tenant is rejected with `access_denied`. `ADMIN_MICROSOFT_TENANT_ID` must be set to an
  explicit tenant ID — never `"common"`
- Protected admin API routes accept only a valid admin session cookie
- Only the auth bootstrap endpoints remain reachable without a pre-existing admin session
- Never accessible without TLS (nginx must redirect HTTP → HTTPS before reaching the app)

---

## 12. Security Headers

**Resolves IMPROV-7.**

> **Canonical source for header values:**
> [`docs/07-operations/security-and-privacy.md` § Security headers](security-and-privacy.md#security-headers--locked-improv-7)
>
> Do not duplicate header values here. The security-and-privacy doc defines all required headers
> including the full Content Security Policy (with Stripe domains).

All security headers are set by the backend (Fastify `@fastify/helmet` plugin) and/or nginx.
Frontend Next.js adds headers via `next.config.js` for static/SSR responses.

### CORS policy

Frontend and backend are served on the same domain in production (`swissmail.ch` and
`api.swissmail.ch`). CORS is configured via `@fastify/cors`:

```ts
// backend/src/plugins/cors.ts
import cors from '@fastify/cors';

await app.register(cors, {
  origin: process.env.BASE_URL, // e.g., https://swissmail.ch
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
});
```

No wildcard origins. No cross-origin access from unknown domains.
See also: [`security-and-privacy.md` § CORS policy](security-and-privacy.md#cors-policy--locked).

### Rate limiting headers

Backend returns rate limiting headers on all API responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1710541200
```

Implementation via `@fastify/rate-limit` with Redis store.

### Backend Fastify plugin registration (order matters)

```ts
await app.register(helmet);           // Sets most security headers
await app.register(cors, corsOpts);   // CORS
await app.register(rateLimit, rlOpts); // Rate limiting
await app.addHook('onRequest', requestIdHook); // Correlation IDs
// ... route registration
app.setErrorHandler(errorHandler);    // Canonical error mapping
```

### nginx config additions

```nginx
# nginx/nginx.conf — defense-in-depth; Fastify sets these too
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

---

## Appendix: Resolved items

| ID | Description | Section |
|---|---|---|
| GAP-13 | No deployment or CI/CD specification existed | Entire document |
| IMPROV-6 | Structured logging and observability not defined | Section 9 |
| IMPROV-7 | Security headers not specified | Section 12 |
| IMPROV-8 | Admin auth not specified | Section 11 |
