ALTER TABLE "dispatch_attempts" DROP COLUMN IF EXISTS "provider_payload";
ALTER TABLE "dispatch_status_events" DROP COLUMN IF EXISTS "provider_event_data";
