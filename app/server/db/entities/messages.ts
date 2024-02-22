import { relations } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { cacheGroupRelatedQuestions } from "./cache";
import { topics } from "./oposiciones";

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  topic_id: integer("topic_id").references(() => topics.id),
  content: text("content"),
  user_id: integer("user_id"),
  created_at: timestamp("created_at"),
  updated_at: timestamp("updated_at"),
  type: text("type"),
  api_type: text("api_type"),
});

export const messagesRelations = relations(messages, ({ one, many }) => ({
  topic: one(topics, {
    fields: [messages.topic_id],
    references: [topics.id],
    relationName: "topic",
  }),
  cacheGroups: many(cacheGroupRelatedQuestions),
  data: many(messageData),
}));

export const messageData = pgTable("message_data", {
  id: serial("id").primaryKey(),
  question_id: integer("question_id").references(() => messages.id),
  response_id: integer("response_id").references(() => messages.id),
  data: jsonb("data").$type<{
    oposicion_slug: string;
    cache: {
      hit: boolean;
    };
  }>(),
  created_at: timestamp("created_at"),
  updated_at: timestamp("updated_at"),
});

export const messageDataRelations = relations(messageData, ({ one, many }) => ({
  question: one(messages, {
    fields: [messageData.question_id],
    references: [messages.id],
    relationName: "question",
  }),
  response: one(messages, {
    fields: [messageData.response_id],
    references: [messages.id],
    relationName: "response",
  }),
  cacheGroups: many(cacheGroupRelatedQuestions),
}));
