# Deployment and CI/CD — Part 2

> Split from [deployment-and-ci.md](deployment-and-ci.md) to keep repository markdown files within the documented size limits.

## Sections in this part

- 6. Staging vs Production
- 7. Secret Management
- 8. Zero-Downtime Deployment
- 9. Monitoring and Observability
- 10. Backup Strategy
- 11. Admin Auth
- 12. Security Headers
- Appendix: Resolved items

## 6. Staging vs Production

### Environment parity

Staging is identical to production in infrastructure. Differences are configuration-only:

| Aspect             | Staging                                                             | Production                 |
| ------------------ | ------------------------------------------------------------------- | -------------------------- |
| Database           | Separate DB, same schema                                            | Production DB              |
| Stripe             | Test mode (`sk_test_...`)                                           | Live mode (`sk_live_...`)  |
| Postal provider    | Chosen provider sandbox or explicitly non-production adapter        | Chosen production provider |
| Email              | Real delivery to test addresses                                     | Real delivery              |
| Domain             | `staging.swissmail.ch` (prod staging), `localhost:5000` (local dev) | `swissmail.ch`             |
| Sentry environment | `staging`                                                           | `production`               |
| `NODE_ENV`         | `production` (same runtime)                                         | `production`               |

### Feature flags (MVP)

Feature flags for MVP are environment-based: enabled by the presence of an env var or a known env name. No runtime toggle UI in MVP.

```ts
// Example: feature flag pattern
const ENABLE_EPOST_DISPATCH = process.env.ENABLE_EPOST_DISPATCH === "true";
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

| Secret name             | Used in                             |
| ----------------------- | ----------------------------------- |
| `GITHUB_TOKEN`          | Docker push to GHCR (auto-provided) |
| `PRODUCTION_DEPLOY_KEY` | SSH key for production deployment   |
| `STAGING_DEPLOY_KEY`    | SSH key for staging deployment      |
| Stripe, S3, DB, etc.    | `test-backend` job environment      |

### Production secrets

For the VPS deployment:

- Secrets live in `/etc/swissmail/production.env`, outside the repo, readable only by the deploy user.
- `docker-compose.prod.yml` injects this file into all containers via `env_file`.
- Do not store secrets in Docker images, Dockerfiles, or version control.

### Secret rotation procedure

| Secret                            | Rotation steps                                                                                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SESSION_SECRET`                  | 1. Generate new value. 2. Update production env. 3. Restart app. 4. If cookie signing depends on this secret, expect existing browser cookies to stop working. |
| `STRIPE_SECRET_KEY`               | 1. Generate new key in Stripe dashboard. 2. Update env. 3. Restart. 4. Revoke old key.                                                                         |
| `STRIPE_WEBHOOK_SECRET`           | 1. Roll webhook endpoint in Stripe dashboard. 2. Update `STRIPE_WEBHOOK_SECRET`. 3. Restart.                                                                   |
| `DATABASE_URL` password           | 1. Create new DB user/password. 2. Update `DATABASE_URL`. 3. Restart all services. 4. Drop old user.                                                           |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | 1. Create new credentials in storage provider. 2. Update env. 3. Restart. 4. Revoke old credentials.                                                           |
| `AZURE_OPENAI_API_KEY`            | 1. Generate/rotate key in Azure. 2. Update env. 3. Restart. 4. Revoke old key.                                                                                 |
| `SWISS_POST_CLIENT_SECRET`        | 1. Rotate Swiss Post client secret. 2. Update env. 3. Restart backend and worker. 4. Revoke old secret.                                                        |
| `RESEND_API_KEY`                  | 1. Create new Resend API key. 2. Update env. 3. Restart backend and worker. 4. Revoke old key.                                                                 |
| `ADMIN_SESSION_SECRET`            | 1. Generate new 64-char random secret. 2. Update env. 3. Restart backend (existing admin sessions are invalidated).                                            |
| `ADMIN_MICROSOFT_CLIENT_SECRET`   | 1. Rotate secret in Azure app registration. 2. Update env. 3. Restart backend. 4. Revoke old secret.                                                           |

---

## 8. Zero-Downtime Deployment

### Rolling update strategy

1. Start new container(s) with new image.
2. Wait for new container health check to pass (`GET /api/health` → 200).
3. Route traffic to new container.
4. Stop old container(s).

On the VPS with docker-compose: use `docker compose -f docker-compose.prod.yml up -d --build` which
recreates changed containers while keeping healthy ones running. The proxy container handles
in-flight requests during the brief restart window.

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
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, starting graceful shutdown");
  server.close(async () => {
    await worker.close(); // BullMQ worker
    await db.end(); // pg pool
    logger.info("Graceful shutdown complete");
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
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "backend", env: process.env.NODE_ENV },
  redact: {
    paths: ["email", "body.email", "body.content", "body.address", "*.email"],
    censor: "[REDACTED]",
  },
});
```

### Log fields (standard per request)

| Field        | Description                                   |
| ------------ | --------------------------------------------- |
| `timestamp`  | ISO 8601                                      |
| `level`      | `trace` / `debug` / `info` / `warn` / `error` |
| `requestId`  | UUID per HTTP request                         |
| `sessionId`  | Session ID (opaque)                           |
| `module`     | e.g., `payments`, `dispatch`, `rendering`     |
| `message`    | Human-readable event description              |
| `error`      | Error name + message + stack (on errors only) |
| `durationMs` | Request or job duration                       |

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
import * as Sentry from "@sentry/node";
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

| Metric                               | Why                       |
| ------------------------------------ | ------------------------- |
| HTTP request latency (p50, p95, p99) | Performance baseline      |
| HTTP error rate (5xx)                | Service health            |
| Queue depth (BullMQ)                 | Backlog detection         |
| Queue job failure rate               | Worker health             |
| Payment success rate                 | Business health           |
| Payment failure rate by error code   | Stripe issue detection    |
| Dispatch submission rate             | Postal integration health |
| Dispatch rejection rate              | Postal integration issues |
| PDF rendering latency                | UX health                 |
| File upload success/failure rate     | Storage health            |

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
- **Mechanism:** `pg_dump` cron job to object storage.
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

The production topology serves the API under `/api` on the same origin as the frontend.
CORS is configured via `@fastify/cors`:

```ts
// backend/src/plugins/cors.ts
import cors from "@fastify/cors";

await app.register(cors, {
  origin: process.env.BASE_URL, // e.g., https://swissmail.ch
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
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
await app.register(helmet); // Sets most security headers
await app.register(cors, corsOpts); // CORS
await app.register(rateLimit, rlOpts); // Rate limiting
await app.addHook("onRequest", requestIdHook); // Correlation IDs
// ... route registration
app.setErrorHandler(errorHandler); // Canonical error mapping
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

| ID       | Description                                      | Section         |
| -------- | ------------------------------------------------ | --------------- |
| GAP-13   | No deployment or CI/CD specification existed     | Entire document |
| IMPROV-6 | Structured logging and observability not defined | Section 9       |
| IMPROV-7 | Security headers not specified                   | Section 12      |
| IMPROV-8 | Admin auth not specified                         | Section 11      |
