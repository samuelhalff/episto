import { index, integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { sessions } from "./auth.js";
import { draftLetters } from "./drafting.js";
import { createdAt, pk } from "./helpers.js";

export const supportEvents = pgTable(
  "support_events",
  {
    id: pk(),
    sessionId: uuid("session_id").references(() => sessions.id),
    draftId: uuid("draft_id").references(() => draftLetters.id),
    eventType: text("event_type").notNull(),
    actor: text("actor").notNull(),
    details: jsonb("details"),
    createdAt: createdAt(),
  },
  (table) => ({
    sessionIdIdx: index("support_events_session_id_idx").on(table.sessionId),
    draftIdIdx: index("support_events_draft_id_idx").on(table.draftId),
    eventTypeCreatedAtIdx: index("support_events_event_type_created_at_idx").on(
      table.eventType,
      table.createdAt,
    ),
  }),
);

export const productEvents = pgTable(
  "product_events",
  {
    id: pk(),
    eventName: text("event_name").notNull(),
    sessionId: uuid("session_id"),
    draftId: uuid("draft_id"),
    locale: text("locale"),
    route: text("route"),
    source: text("source"),
    templateSlug: text("template_slug"),
    surface: text("surface"),
    step: text("step"),
    durationMs: integer("duration_ms"),
    errorFamily: text("error_family"),
    createdAt: createdAt(),
  },
  (table) => ({
    eventNameTimeIdx: index("product_events_event_name_time_idx").on(
      table.eventName,
      table.createdAt,
    ),
    sessionIdx: index("product_events_session_idx").on(table.sessionId, table.createdAt),
    stepTimeIdx: index("product_events_step_time_idx").on(table.step, table.createdAt),
    draftIdx: index("product_events_draft_id_idx").on(table.draftId),
  }),
);
