import { timestamp, uuid } from "drizzle-orm/pg-core";

export const pk = () => uuid("id").defaultRandom().primaryKey();

export const ts = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });

export const createdAt = () => ts("created_at").defaultNow().notNull();

export const updatedAt = () => ts("updated_at").defaultNow().notNull();
