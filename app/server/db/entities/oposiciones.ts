import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const oposiciones = pgTable("oposiciones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  pinecone_id: text("pinecone_id").notNull(),
});

export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  kb_folder_id: integer("kb_folder_id").references(() => kbFolders.id),
  detail: text("detail"),
  summary: text("summary"),
  created_at: timestamp("created_at"),
  updated_at: timestamp("updated_at"),
});

export const kbFolders = pgTable("kb_folders", {
  id: serial("id").primaryKey(),
  title: text("title"),
  oposicion_id: integer("oposicion_id").references(() => oposiciones.id),
  kb_folder_id: integer("kb_folder_id"),
  created_at: timestamp("created_at"),
  updated_at: timestamp("updated_at"),
});
