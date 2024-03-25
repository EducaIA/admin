import { and, desc, eq, ilike, isNotNull, or, sql } from "drizzle-orm";

import { alias } from "drizzle-orm/pg-core";

import { cacheGroup } from "./entities/cache";

import { distinct } from "~/utils/utils";
import { data_db, db } from ".";
import { messageData, messages } from "./entities/messages";
import { oposiciones, topics } from "./entities/oposiciones";
import { users } from "./entities/users";

import { cachified } from "~/.server/cache";
import { FullChunkSelectorData } from "~/types";

export const getOposiciones = async () => db.query.oposiciones.findMany({});

export const getTopics = async () =>
  db.query.topics.findMany({
    where: eq(topics.kb_folder_id, 5),
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
    limit: 50,
    offset: page * 50,
    extras: {
      type: sql`'cached'`.as("type"),
    },
  });
};

export const getUserQuestions = async (
  onlyLegislative: boolean,
  page = 0,
  type = "qa",
) => {
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
    oposicion_slug: sql<string>`CASE WHEN questions.api_type = 'unidades_didacticas' THEN (SELECT distinct split_part(oposicion_slug, '_', 2) FROM unidades_didacticas where id = ${messages.topic_id}) ELSE (SELECT split_part(pinecone_id, '_', 2) FROM search_oposicion_by_topic_id (${messages.topic_id}::int)) END`.as("oposicion_slug"),
    created_at: messageData.created_at,
    updated_at: messageData.updated_at,
    api_type: questions.api_type,
    type: sql`'question'`.as("type"),
    legislative:
      sql`(${messageData.data}->>'classified_question') not ilike '%N/A%'`.as(
        "legislative",
      ),
  })
  .from(messageData)
  .innerJoin(messages, eq(messageData.question_id, messages.id))
  .leftJoin(topics, eq(messages.topic_id, topics.id))
  .innerJoin(answers, eq(messageData.response_id, answers.id))
  .innerJoin(questions, eq(messageData.question_id, questions.id))
  .innerJoin(users, eq(questions.user_id, users.id))
  .where(
    and(
      sql`COALESCE(("message_data"."data" -> 'cache' ->> 'hit')::boolean, FALSE) IS NOT TRUE`,
      sql`trim(${questions.content}) NOT IN (SELECT DISTINCT TRIM(question) FROM ${cacheGroup})`,
      or(isNotNull(questions.content), isNotNull(answers.content)),
      onlyLegislative
        ? sql`(${messageData.data}->>'classified_question') not ilike '%N/A%'`
        : undefined,
      type ? eq(messages.api_type, type) : undefined
    ),
  )
  .orderBy(desc(messageData.id))
  .limit(50)
  .offset(page * 50)
};

export type UserQuestion = Awaited<ReturnType<typeof getUserQuestions>>[number];

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

export const getChunkData = async () => {
  const { rows } = await data_db.execute<{
    id: string;
    document: string;
    title: string;
    subtitle: string;
    chunk: string;
    oposicion: string;
    region: string;
    text: string;
    nacional: boolean;
  }>(
    sql`SELECT *, CASE
      WHEN document_id IN (SELECT document_id FROM national_documents)
      THEN true
      ELSE false
      END as nacional FROM region_data;`,
  );

  return rows.reduce<FullChunkSelectorData>((acc, row) => {
    const { document, title, subtitle, chunk, text, id, nacional, region } =
      row;
    const regionOrNacional = nacional ? "nacional" : region;

    acc[regionOrNacional] = acc[regionOrNacional] || {};
    acc[regionOrNacional][document] = acc[regionOrNacional][document] || {};
    acc[regionOrNacional][document][title] = acc[regionOrNacional][document][
      title
    ] || {
      subtitle,
      chunks: [],
    };
    acc[regionOrNacional][document][title].chunks.push({
      id,
      chunk,
      text: text.slice(0, 50),
    });

    return acc;
  }, {});
};

export const getCachedChunkedData = cachified({
  key: "chunkedData",
  ttl: 1000 * 60 * 60 * 24, // 24 hours
  async getFreshValue() {
    console.log(" - MISS chunkedData");
    return getChunkData();
  },
});
