import { relations } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { vector } from "pgvector/drizzle-orm";

import { messageData } from "./messages";

export const cacheGroup = pgTable("cache_group", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  questionEmbeddings: vector("question_embeddings", {
    dimesions: 1536,
  }).notNull(),
  answer: jsonb("answer").$type<Record<string, string>>(),
  status: varchar("status").notNull().default("enabled"),
  oposicion: varchar("oposicion").notNull(),
  topics: varchar("topics").array().default([]).notNull(),
  created_at: timestamp("created_at"),
  updated_at: timestamp("updated_at"),
});

export const cacheGroupRelations = relations(cacheGroup, ({ many }) => ({
  related_questions: many(cacheGroupRelatedQuestions),
  chunks: many(cacheGroupChunks),
}));

export const cacheGroupChunks = pgTable("cache_group_chunks", {
  id: serial("id").primaryKey(),
  group_id: integer("group_id").references(() => cacheGroup.id),
  chunk_id: varchar("chunk_id").notNull(),
  region: varchar("region").notNull(),
  created_at: timestamp("created_at"),
  updated_at: timestamp("updated_at"),
});

export const cacheGroupChunksRelations = relations(
  cacheGroupChunks,
  ({ one }) => ({
    group: one(cacheGroup, {
      fields: [cacheGroupChunks.group_id],
      references: [cacheGroup.id],
    }),
  })
);

export const cacheGroupRelatedQuestions = pgTable(
  "cache_group_related_questions",
  {
    id: serial("id").primaryKey(),
    group_id: integer("group_id").references(() => cacheGroup.id),
    messge_data_id: integer("message_data_id"),
    created_at: timestamp("created_at"),
    updated_at: timestamp("updated_at"),
  }
);

export const cacheGroupRelatedQuestionsRelations = relations(
  cacheGroupRelatedQuestions,
  ({ one }) => ({
    group: one(cacheGroup, {
      fields: [cacheGroupRelatedQuestions.group_id],
      references: [cacheGroup.id],
    }),
    question: one(messageData, {
      fields: [cacheGroupRelatedQuestions.messge_data_id],
      references: [messageData.id],
    }),
  })
);
