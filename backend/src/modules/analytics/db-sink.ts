import type { AnalyticsSink, AnalyticsEvent } from "./index.js";
import { getDb, schema } from "../../db/index.js";
import { createLogger } from "../../shared/logging/index.js";

const logger = createLogger("analytics:db");

/** Events that should be persisted to the product_events table. */
const DB_EVENTS = new Set([
  "marketing_page_viewed",
  "draft_entry_started",
  "template_selected",
  "page_viewed",
  "feature_used",
  "render_failed",
  "ai_generation_requested",
  "ai_generation_completed",
  "step_entered",
  "step_completed",
  "step_idle",
  "step_abandoned",
  "step_error",
  "order_links_revoked",
  "checkout_started",
  // Without this the funnel ends at `checkout_started`: every order looks
  // abandoned, and a promotion that worked is indistinguishable from one nobody
  // completed. Recording the event without listing it here writes it nowhere.
  "payment_captured",
  "payment_failed",
  "review_blocked",
  "file_upload_failed",
]);

export class DbSink implements AnalyticsSink {
  record(event: AnalyticsEvent): void {
    if (!DB_EVENTS.has(event.event)) return;

    const e = event as Record<string, unknown> & { event: string };
    const db = getDb();
    db.insert(schema.productEvents)
      .values({
        eventName: event.event,
        sessionId: typeof e.sessionId === "string" ? e.sessionId : null,
        draftId: typeof e.draftId === "string" ? e.draftId : null,
        locale: typeof e.locale === "string" ? e.locale : null,
        route: typeof e.route === "string" ? e.route : null,
        source: typeof e.source === "string" ? e.source : null,
        templateSlug: typeof e.templateSlug === "string" ? e.templateSlug : null,
        surface: typeof e.surface === "string" ? e.surface : null,
        step: typeof e.step === "string" ? e.step : null,
        durationMs: typeof e.durationMs === "number" ? e.durationMs : null,
        errorFamily: typeof e.errorFamily === "string" ? e.errorFamily : null,
      })
      .execute()
      .catch((err) => {
        logger.warn({ event: event.event, err }, "Failed to persist product event");
      });
  }
}
