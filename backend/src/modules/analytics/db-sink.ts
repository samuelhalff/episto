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
]);

export class DbSink implements AnalyticsSink {
  record(event: AnalyticsEvent): void {
    if (!DB_EVENTS.has(event.event)) return;

    const db = getDb();
    db.insert(schema.productEvents)
      .values({
        eventName: event.event,
        sessionId: "sessionId" in event ? (event as { sessionId: string }).sessionId : null,
        locale: "locale" in event ? (event as { locale: string }).locale : null,
        route: "route" in event ? (event as { route: string }).route : null,
        source: "source" in event ? (event as { source: string }).source : null,
        templateSlug: "templateSlug" in event ? (event as { templateSlug: string }).templateSlug : null,
        surface: "surface" in event ? (event as { surface: string }).surface : null,
        durationMs: "durationMs" in event ? (event as { durationMs: number }).durationMs : null,
        errorFamily: "errorFamily" in event ? (event as { errorFamily: string }).errorFamily : null,
      })
      .execute()
      .catch((err) => {
        logger.warn({ event: event.event, err }, "Failed to persist product event");
      });
  }
}
