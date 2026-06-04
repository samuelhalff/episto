import { index, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, pk, ts, updatedAt } from "./helpers.js";

export const sessionTypeEnum = pgEnum("session_type", ["guest"]);

export const localeEnum = pgEnum("locale_enum", ["de-CH", "fr-CH", "it-CH", "en-CH"]);

export const sessions = pgTable(
  "sessions",
  {
    id: pk(),
    type: sessionTypeEnum("type").default("guest").notNull(),
    email: text("email"),
    phoneE164: text("phone_e164"),
    phoneVerifiedAt: ts("phone_verified_at"),
    resumeTokenHash: text("resume_token_hash").notNull().unique(),
    resumeTokenExpiresAt: ts("resume_token_expires_at").notNull(),
    locale: localeEnum("locale").default("de-CH").notNull(),
    ipAddress: text("ip_address"),
    expiresAt: ts("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    expiresAtIdx: index("sessions_expires_at_idx").on(table.expiresAt),
  }),
);
