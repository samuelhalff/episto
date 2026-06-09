# Deployment and CI/CD — Part 1

> Split from [deployment-and-ci.md](deployment-and-ci.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- 1. Containerization Strategy
- 2. Service Architecture
- 3. Environment Variables
- 4. CI Pipeline (GitHub Actions)
- 5. Database Migrations

## 1. Containerization Strategy

All services run in Docker containers. Production images must be minimal and reproducible.

### Multi-stage builds

Both `frontend` and `backend` use multi-stage Dockerfiles:

1. **`deps`** — install all dependencies
2. **`build`** — compile TypeScript, run Next.js build
3. **`runner`** — copy only production artifacts, run as non-root user

Base image for all services: `node:20-alpine`

### Dockerfile locations

| File                  | Service                                                        |
| --------------------- | -------------------------------------------------------------- |
| `frontend/Dockerfile` | Next.js SSR + static                                           |
| `backend/Dockerfile`  | Node.js API + BullMQ worker (same image, different entrypoint) |

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

| Service    | Image                 | Port        | Purpose                                                                   |
| ---------- | --------------------- | ----------- | ------------------------------------------------------------------------- |
| `frontend` | `frontend/Dockerfile` | 3000        | Next.js SSR + static pages                                                |
| `backend`  | `backend/Dockerfile`  | 4000        | Node.js REST API                                                          |
| `worker`   | `backend/Dockerfile`  | —           | BullMQ async job processor (same image, `CMD ["node", "dist/worker.js"]`) |
| `postgres` | `postgres:16-alpine`  | 5432        | Primary relational database                                               |
| `redis`    | `redis:7-alpine`      | 6379        | BullMQ queue + rate limiting + session cache                              |
| `minio`    | `minio/minio`         | 9000 / 9001 | S3-compatible object storage (dev only)                                   |

Local bucket provisioning is explicit. The stack does **not** auto-create the bucket during
`docker compose up`; run the manual provisioning command after MinIO is healthy.

### Port ownership

To avoid port drift, treat these assignments as canonical:

| Port         | Owner                      | Meaning                                                                     |
| ------------ | -------------------------- | --------------------------------------------------------------------------- |
| `80` / `443` | Public domain edge         | Public HTTP/HTTPS for the configured production domain                      |
| `5000`       | Local Episto proxy handoff | Plain HTTP listener on the host for the upstream edge proxy to forward into |
| `3000`       | Internal frontend service  | Next.js app behind the local proxy only                                     |
| `4000`       | Internal backend service   | Fastify API behind the local proxy only                                     |

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
      - NEXT_PUBLIC_API_URL=/api
      - API_URL=http://backend:4000
    depends_on: [backend]
    restart: unless-stopped

  backend:
    build: ./backend
    ports: ["4000:4000"]
    environment:
      - DATABASE_URL=postgres://postgres:postgres@postgres:5432/episto
      - REDIS_URL=redis://redis:6379
      - S3_ENDPOINT=http://minio:9000
      # ... (see Section 3 for all env vars)
    depends_on: [postgres, redis, minio]
    restart: unless-stopped

  worker:
    build: ./backend
    command: ["node", "dist/worker.js"]
    environment:
      - DATABASE_URL=postgres://postgres:postgres@postgres:5432/episto
      - REDIS_URL=redis://redis:6379
      - S3_ENDPOINT=http://minio:9000
    depends_on: [postgres, redis, minio]
    restart: unless-stopped

  proxy:
    image: nginx:alpine
    ports: ["5000:5000"]
    volumes:
      - ./nginx/dev-proxy.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on: [frontend, backend]
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: episto
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes: [postgres_data:/var/lib/postgresql/data]
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes: [redis_data:/data]
    restart: unless-stopped

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports: ["9000:9000", "9001:9001"]
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes: [minio_data:/data]
    restart: unless-stopped

  minio-provision:
    profiles: ["manual"]
    image: minio/mc
    depends_on: [minio]
    entrypoint:
      - /bin/sh
      - -c
      - mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" && mc mb --ignore-existing "local/$S3_BUCKET"

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

Long-lived local services should use `restart: unless-stopped` so the dev `5000` handoff never comes
back without its upstream `frontend`, `backend`, and infrastructure containers after a host restart.

Provision the local bucket once after MinIO becomes healthy:

```bash
docker compose run --rm minio-provision
```

If the bucket is missing, `/api/readiness` reports degraded `objectStorage` until provisioning is
completed.

### Production hosting

Current deployment target: **standalone VPS + `docker-compose.prod.yml`**.

- Public HTTPS terminates in the `proxy` container on `80`/`443`
- The public frontend host(s) route to `frontend:3000`
- The public API path/host routes to `backend:4000`, driven by the production env file
- Local `5000` remains available as a plain-http handoff when an upstream edge proxy forwards into
  the host instead of terminating directly in Docker
- `docker-compose.prod.yml` renders its nginx config from `nginx/render-prod-proxy.sh` using
  `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`, optional `PUBLIC_FRONTEND_SERVER_NAMES`, and
  optional `PUBLIC_TLS_CERT_NAME`

Before calling production infrastructure ready, verify:

1. The VPS has valid DNS for the hostnames referenced by `NEXT_PUBLIC_SITE_URL`,
   `NEXT_PUBLIC_API_URL`, and `PUBLIC_FRONTEND_SERVER_NAMES`
2. TLS files exist under `/etc/letsencrypt/live/<PUBLIC_TLS_CERT_NAME or NEXT_PUBLIC_SITE_URL host>/`
3. `EPISTO_ENV_FILE=/etc/episto/production.env docker compose --env-file /etc/episto/production.env -f docker-compose.prod.yml up -d --build`
   brings up healthy `frontend`, `backend`, `worker`, `zefix-proxy`, and `proxy` containers
4. If MinIO is the configured object-storage provider, run `EPISTO_ENV_FILE=/etc/episto/production.env docker compose --env-file /etc/episto/production.env -f docker-compose.prod.yml run --rm minio-provision`
   once to create the bucket before expecting backend readiness to go green
5. Public `443` serves the frontend and the configured same-host `/api/*` path or API host serves backend routes
6. The local upstream handoff on `5000` responds when the edge proxy forwards `Host`,
   `X-Forwarded-Proto`, `X-Forwarded-Host`, and `X-Forwarded-Port`
7. `frontend:3000` and `backend:4000` stay internal-only and are not exposed as public entry points

---

## 3. Environment Variables

All secrets and environment-specific values are injected as environment variables. No secrets in source code or Docker images.

### Backend (required in production)

| Variable                            | Description                                                                                                                                                                                                                           | Example                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `DATABASE_URL`                      | PostgreSQL connection string                                                                                                                                                                                                          | `postgres://user:pass@host:5432/episto`                         |
| `REDIS_URL`                         | Redis connection string                                                                                                                                                                                                               | `redis://host:6379`                                             |
| `S3_ENDPOINT`                       | Object storage endpoint URL                                                                                                                                                                                                           | `https://s3.infomaniak.com`                                     |
| `S3_BUCKET`                         | S3 bucket name                                                                                                                                                                                                                        | `episto-production`                                             |
| `S3_ACCESS_KEY`                     | S3 access key ID                                                                                                                                                                                                                      | `AKIAIOSFODNN7EXAMPLE`                                          |
| `S3_SECRET_KEY`                     | S3 secret access key                                                                                                                                                                                                                  | _(secret)_                                                      |
| `S3_REGION`                         | S3 region (if required by provider)                                                                                                                                                                                                   | `eu-west-1`                                                     |
| `STRIPE_SECRET_KEY`                 | Stripe secret key                                                                                                                                                                                                                     | `sk_live_...`                                                   |
| `STRIPE_WEBHOOK_SECRET`             | Stripe webhook signing secret                                                                                                                                                                                                         | `whsec_...`                                                     |
| `AZURE_OPENAI_ENDPOINT`             | Azure OpenAI / Azure model endpoint                                                                                                                                                                                                   | `https://example-resource.openai.azure.com/`                    |
| `AZURE_OPENAI_API_KEY`              | Azure API key                                                                                                                                                                                                                         | _(secret)_                                                      |
| `AZURE_OPENAI_API_VERSION`          | Azure API version                                                                                                                                                                                                                     | `2024-10-21`                                                    |
| `AI_DRAFT_MODEL`                    | Draft/revision deployment name                                                                                                                                                                                                        | `gpt-4.1`                                                       |
| `AI_CLASSIFY_MODEL`                 | Classification/extraction deployment name                                                                                                                                                                                             | `gpt-4.1-mini`                                                  |
| `AI_PROVIDER_MODE`                  | Azure execution mode                                                                                                                                                                                                                  | `azure_openai` or `azure_ai_project_agent`                      |
| `AZURE_AI_PROJECT_ENDPOINT`         | Azure AI Project endpoint for agent-backed execution                                                                                                                                                                                  | `https://example.services.ai.azure.com/api/projects/my-project` |
| `AZURE_EXISTING_AGENT_ID`           | Existing Azure AI Project agent reference in `<agent-name>:<version>` format                                                                                                                                                          | `web-deep-search:5`                                             |
| `AZURE_AI_AGENT_NAME`               | Azure AI Project agent name                                                                                                                                                                                                           | `web-deep-search`                                               |
| `AZURE_AI_AGENT_VERSION`            | Azure AI Project agent version                                                                                                                                                                                                        | `5`                                                             |
| `AZURE_TENANT_ID`                   | Optional Entra tenant for service-principal auth                                                                                                                                                                                      | _(secret / env-specific)_                                       |
| `AZURE_CLIENT_ID`                   | Optional Entra client/application ID for service-principal auth                                                                                                                                                                       | _(secret / env-specific)_                                       |
| `AZURE_CLIENT_SECRET`               | Optional Entra client secret for service-principal auth                                                                                                                                                                               | _(secret)_                                                      |
| `ADDRESS_SEARCH_PROVIDER`           | Address autocomplete backend provider                                                                                                                                                                                                 | `none` or `geo_admin`                                           |
| `ADDRESS_SEARCH_TIMEOUT_MS`         | Timeout for backend address autocomplete calls                                                                                                                                                                                        | `8000`                                                          |
| `GEO_ADMIN_API_BASE_URL`            | geo.admin.ch search API base URL                                                                                                                                                                                                      | `https://api3.geo.admin.ch`                                     |
| `SWISS_POST_API_BASE_URL`           | Swiss Post API base URL                                                                                                                                                                                                               | `https://api.post.ch/...`                                       |
| `SWISS_POST_CLIENT_ID`              | Swiss Post OAuth client ID                                                                                                                                                                                                            | _(secret)_                                                      |
| `SWISS_POST_CLIENT_SECRET`          | Swiss Post OAuth client secret                                                                                                                                                                                                        | _(secret)_                                                      |
| `SWISS_POST_SCOPE`                  | Swiss Post OAuth scope string if required by onboarding docs                                                                                                                                                                          | `digital-commerce`                                              |
| `SESSION_SECRET`                    | Secret for cookie signing and related HMAC use, if enabled by the session implementation                                                                                                                                              | 64-char random hex string                                       |
| `BASE_URL`                          | Public-facing URL                                                                                                                                                                                                                     | `https://episto.ch`                                             |
| `RESEND_API_KEY`                    | Resend transactional email API key                                                                                                                                                                                                    | _(secret)_                                                      |
| `ADMIN_SESSION_SECRET`              | HMAC secret for admin session and OAuth state cookies                                                                                                                                                                                 | 64-char random string                                           |
| `ADMIN_SESSION_TTL_HOURS`           | Admin session lifetime after Microsoft login                                                                                                                                                                                          | `12`                                                            |
| `ADMIN_MICROSOFT_CLIENT_ID`         | Microsoft app registration client ID for admin login. Must come from the dedicated WestBay admin app registration, not the temporary AI `AZURE_*` app.                                                                                | _(secret / env-specific)_                                       |
| `ADMIN_MICROSOFT_CLIENT_SECRET`     | Microsoft app registration client secret for admin login                                                                                                                                                                              | _(secret)_                                                      |
| `ADMIN_MICROSOFT_TENANT_ID`         | WestBay tenant ID — must be an explicit tenant, never `"common"`                                                                                                                                                                      | _(secret / env-specific)_                                       |
| `ADMIN_MICROSOFT_REDIRECT_URI`      | Fallback backend callback URL for admin Microsoft login. Runtime prefers the current request origin when constructing the OAuth callback, but the Azure app registration must still allow the public and local callback URLs you use. | `http://localhost:5000/api/v1/admin/auth/microsoft/callback`    |
| `DISPATCH_RATE_MATRIX_REFRESH_CRON` | Daily cron for refreshing the stored dispatch rate matrix used by non-checkout pricing displays                                                                                                                                       | `5 6 * * *`                                                     |
| `NODE_ENV`                          | Runtime environment                                                                                                                                                                                                                   | `production` / `development` / `test`                           |
| `PORT`                              | HTTP port (backend)                                                                                                                                                                                                                   | `4000`                                                          |
| `LOG_LEVEL`                         | Pino log level                                                                                                                                                                                                                        | `info`                                                          |
| `SENTRY_DSN`                        | Sentry DSN for error tracking                                                                                                                                                                                                         | `https://...@sentry.io/...`                                     |

### Frontend (build-time and runtime)

| Variable                             | Description                          | Example                     |
| ------------------------------------ | ------------------------------------ | --------------------------- |
| `NEXT_PUBLIC_API_URL`                | Backend API URL (exposed to browser) | `/api`                      |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key               | `pk_live_...`               |
| `NEXT_PUBLIC_SENTRY_DSN`             | Sentry DSN for frontend              | `https://...@sentry.io/...` |
| `NEXT_PUBLIC_APP_ENV`                | App environment label                | `production`                |

### Public proxy routing (production compose)

| Variable                       | Description                                                  | Example                   |
| ------------------------------ | ------------------------------------------------------------ | ------------------------- |
| `PUBLIC_FRONTEND_SERVER_NAMES` | Optional nginx `server_name` list for frontend hosts         | `episto.ch www.episto.ch` |
| `PUBLIC_TLS_CERT_NAME`         | Optional LetsEncrypt live directory name for proxy TLS files | `episto.ch`               |

### Notes

- `NEXT_PUBLIC_*` variables are embedded at build time. They must not contain secrets.
- The production compose stack expects the same external env file to drive both Compose interpolation
  and container runtime injection. Keep it outside the repo, e.g. `/etc/episto/production.env`.
- Leave `PUBLIC_FRONTEND_SERVER_NAMES` and `PUBLIC_TLS_CERT_NAME` empty unless the proxy should
  serve additional frontend aliases or the certificate directory name differs from the
  `NEXT_PUBLIC_SITE_URL` host.
- `DATABASE_URL`, `STRIPE_SECRET_KEY`, and `SESSION_SECRET` are the highest-sensitivity variables. Rotate immediately if compromised.
- Use separate values for staging and production for every variable.

### Stored pricing refresh operations

- `DISPATCH_RATE_MATRIX_REFRESH_CRON` controls the daily BullMQ sentinel that refreshes the stored
  dispatch rate matrix for public and draft display pricing.
- Production and staging should run the API and worker with the same cron value so the stored
  matrix refresh path stays predictable.
- After deployment, repair, or matrix-loss recovery, seed the stored matrix manually with:

```bash
npm run dispatch:refresh-rates --workspace=backend
```

- For the dev Docker stack used behind the `:5000` local proxy handoff, run the same seed path inside
  the backend container:

```bash
docker compose exec -T backend npm run dispatch:refresh-rates -w backend
```

- The manual seed command uses the same backend sync service as the scheduled worker and prints the
  resulting matrix version metadata for operator confirmation.
- A healthy seed leaves exactly one active `provider_rate_matrix_versions` row for `epost` and 20
  `provider_rate_matrix_entries` rows for that version. Public pricing should then report `sync`
  metadata instead of `PRICING_UNAVAILABLE`.
- With the default 24-hour matrix TTL and daily cron, `sync.freshness` may briefly read as `stale`
  while the next 06:05 refresh is still running. That is expected: the last successful active
  matrix remains available for display pricing until the replacement version finishes.

---

## 4. CI Pipeline (GitHub Actions)

### Trigger summary

| Trigger                            | Jobs run                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| Pull request (any branch → `main`) | `lint`, `typecheck`, `test-shared`, `test-frontend`, `test-backend`, `build-check` |
| Merge to `main`                    | All PR jobs + `docker-build` + `docker-push` + `deploy-production`                 |
| Tag `v*`                           | All main jobs + image build/push checks                                            |

### Job definitions

```yaml
# .github/workflows/ci.yml

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
    tags: ["v*"]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci --workspaces
      - run: npm run lint --workspaces

  typecheck:
    runs-on: ubuntu-latest
    needs: []
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci --workspaces
      - run: npm run typecheck --workspaces

  test-shared:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci --workspace=shared
      - run: npm test --workspace=shared

  test-frontend:
    runs-on: ubuntu-latest
    needs: [test-shared]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci --workspaces
      - run: npm test --workspace=frontend

  test-backend:
    runs-on: ubuntu-latest
    needs: [test-shared]
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: episto_test
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
      DATABASE_URL: postgres://postgres:postgres@localhost:5432/episto_test
      REDIS_URL: redis://localhost:6379
      NODE_ENV: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci --workspaces
      - run: npm run db:migrate --workspace=backend
      - run: npm test --workspace=backend

  build-check:
    runs-on: ubuntu-latest
    needs: [lint, typecheck]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
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
          tags: episto/frontend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - name: Build backend image
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: false
          tags: episto/backend:${{ github.sha }}
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
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Install production deploy key
        env:
          PRODUCTION_DEPLOY_KEY: ${{ secrets.PRODUCTION_DEPLOY_KEY }}
          PROD_HOST: ${{ secrets.PRODUCTION_HOST }}
        run: |
          install -m 700 -d ~/.ssh
          printf '%s\n' "$PRODUCTION_DEPLOY_KEY" > ~/.ssh/id_deploy_to_prod
          chmod 600 ~/.ssh/id_deploy_to_prod
          ssh-keyscan -H "$PROD_HOST" >> ~/.ssh/known_hosts
      - name: Write production env file
        env:
          PRODUCTION_ENV_FILE: ${{ secrets.PRODUCTION_ENV_FILE }}
        run: |
          printf '%s\n' "$PRODUCTION_ENV_FILE" > .env.production
          chmod 600 .env.production
      - name: Deploy to production
        env:
          PROD_HOST: ${{ secrets.PRODUCTION_HOST }}
          SSH_KEY: ~/.ssh/id_deploy_to_prod
        run: ./scripts/deploy.sh
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
