-- Keep normalized provider status diagnostics for safe reconciliation and
-- operator case review. Raw provider request/response payloads are never stored.
ALTER TABLE "dispatch_attempts"
  ADD COLUMN "provider_diagnostics" jsonb;
