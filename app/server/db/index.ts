import { and, desc, eq, ilike, isNotNull, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { alias } from "drizzle-orm/pg-core";

import { cacheGroup } from "./cache";
import { getDBConnection } from "./conn";
import { messageData, messages } from "./messages";
import { oposiciones, topics } from "./oposiciones";
import { schema } from "./schema";
import { users } from "./user";
import { distinct } from "~/utils/utils";

const conn = await getDBConnection({
  database: "app_dev",
});

export const db = drizzle(conn, {
  schema,
});

export const getOposiciones = async () => db.query.oposiciones.findMany({});

export const getTopics = async () =>
  db.query.topics.findMany({
    where: eq(schema.topics.kb_folder_id, 5),
  });

export const getMessageTypes = async () => {
  const { rows: messageTypes } = await db.execute<{
    api_type: string;
  }>(sql`SELECT DISTINCT api_type FROM messages;`);

  return messageTypes
    .map(({ api_type }) => api_type)
    .sort((a, b) => a.localeCompare(b));
};

export type CacheGroup = Awaited<
  ReturnType<typeof getExistingCacheGroups>
>[number];

export const getExistingCacheGroups = async ({
  search,
  page = 0,
}: {
  search?: string;
  page?: number;
}) => {
  return db.query.cacheGroup.findMany({
    columns: {
      questionEmbeddings: false,
    },
    with: {
      chunks: true,
      related_questions: {
        with: {
          question: {
            with: {
              question: true,
            },
          },
        },
      },
    },
    where: and(search ? ilike(cacheGroup.question, `%${search}%`) : undefined),
    orderBy: desc(cacheGroup.id),
    limit: 10,
    offset: page * 10,
    extras: {
      type: sql`'cached'`.as("type"),
    },
  });
};

export const getUserQuestions = async (onlyLegislative: boolean, page = 0) => {
  const questions = alias(messages, "questions");
  const answers = alias(messages, "answers");

  return db
    .selectDistinct({
      id: messageData.id,
      question_id: questions.id,
      response_id: answers.id,
      question: questions.content,
      response: answers.content,
      userEmail: users.email,
      cached: sql<boolean>`false`.as("cached"),
      topic_id: topics.title,
      oposicion_slug:
        sql<string>`(SELECT split_part(pinecone_id, '_', 2) FROM search_oposicion_by_topic_id(${messages.topic_id}::int))`.as(
          "oposicion_slug"
        ),
      created_at: messageData.created_at,
      updated_at: messageData.updated_at,
      type: sql`'question'`.as("type"),
      legislative:
        sql`(${messageData.data}->>'classified_question') ilike '%N/A%'`.as(
          "legislative"
        ),
    })
    .from(messageData)
    .innerJoin(messages, eq(messageData.question_id, messages.id))
    .innerJoin(topics, eq(messages.topic_id, topics.id))
    .innerJoin(answers, eq(messageData.response_id, answers.id))
    .innerJoin(questions, eq(messageData.question_id, questions.id))
    .innerJoin(users, eq(questions.user_id, users.id))
    .where(
      and(
        sql`(${messageData.data}->'cache'->>'hit')::boolean IS NOT TRUE`,
        sql`${messageData.id} NOT IN (SELECT DISTINCT id FROM ${cacheGroup})`,
        or(isNotNull(questions.content), isNotNull(answers.content)),
        onlyLegislative
          ? sql`(${messageData.data}->>'classified_question') ilike '%N/A%'`
          : undefined
      )
    )
    .orderBy(desc(messageData.id))
    .limit(10)
    .offset(page * 10);
};

export type UserQuestion = Awaited<ReturnType<typeof getUserQuestions>>[number];

export const getAvailableRegionsForParentOposicion = async (
  parentOposicion: string
) => {
  const res = await db.query.oposiciones.findMany({
    where: ilike(oposiciones.pinecone_id, `%${parentOposicion}%`),
  });

  return distinct(res.map((oposicion) => oposicion.pinecone_id.split("_")[1]));
};

export const getLastIds = async () => {
  const questions = await db.query.messages.findMany({
    orderBy: desc(messages.id),
    limit: 1,
  });

  const cacheGroups = await db.query.cacheGroup.findMany({
    orderBy: desc(cacheGroup.id),
    limit: 1,
  });

  return {
    questions: questions.length > 0 ? questions[0].id : 0,
    cacheGroups: cacheGroups.length > 0 ? cacheGroups[0].id : 0,
  };
};
