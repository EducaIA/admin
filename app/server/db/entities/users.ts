import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email"),
  passwordDigest: text("password_digest"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  timeZone: text("time_zone"),
  location: text("location"),
  language: text("language"),
  currency: text("currency"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  pushCalendarId: integer("push_calendar_id"),
  subscribed: boolean("subscribed").default(false),
  role: text("role").default("regular"),
});
