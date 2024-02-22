import { vector } from "pgvector/drizzle-orm";

import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const embedding_subchunk = pgTable("embeddings_subchunking", {
  id: text("id").notNull().primaryKey(),
  type: text("type"),
  text: text("text").notNull(),
  parent_id: text("parent_id"),
  pgvector_embeddings: vector("pgvector_embeddings"),
  item_identifier: jsonb("item_identifier").notNull().$type<{
    document_id: string;
    title: string;
    subtitle: string;
  }>(),
  created_at: timestamp("created_at"),
  updated_at: timestamp("updated_at"),
});

export type EmbeddingSubchunk = typeof embedding_subchunk.$inferSelect;
