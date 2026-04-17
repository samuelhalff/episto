# Storage Provisioning Design

**Status:** approved for implementation

## Problem

The Compose stack currently uses a one-shot `minio-setup` container to create the object-storage
bucket on every startup. That makes `docker compose ps -a` look noisy, couples provisioning to
runtime startup, and blurs the boundary between application behavior and infrastructure setup.

## Decision

Keep S3-compatible object storage as the application contract, keep MinIO available as the default
local object-storage implementation, and remove automatic bucket creation from the runtime stack.

Bucket provisioning moves to an explicit operator action instead of an always-on startup dependency.

## Design

### Architecture boundary

- The application continues to depend on S3-compatible storage only.
- MinIO remains an infrastructure choice, not a domain concern.
- Bucket creation is treated as provisioning, not application logic.

### Runtime behavior

- Remove the `minio-setup` service from `docker-compose.yml` and `docker-compose.prod.yml`.
- Remove backend startup dependencies on that one-shot service.
- Keep object storage as a hard readiness dependency because uploads, rendered PDFs, and retention
  flows depend on the configured bucket existing.

### Provisioning flow

- Provide an explicit manual provisioning path for MinIO instead of running it automatically during
  `docker compose up`.
- The provisioning command should be runnable on demand and should not leave a long-lived exited
  container behind.

### Failure mode

- When the configured bucket does not exist or object storage is inaccessible, the backend
  readiness endpoint must report degraded status.
- This makes the missing provisioning step visible immediately instead of failing later during file
  upload or rendering.

## Files expected to change

- `docker-compose.yml`
- `docker-compose.prod.yml`
- `backend/src/routes/health.ts`
- `backend/tests/health-routes.test.ts`
- `docs/07-operations/deployment-and-ci-part-01.md`

## Testing

- Add a readiness regression test that fails when object storage access fails.
- Run targeted backend tests for readiness behavior.
- Run repo validation after the implementation is complete.
