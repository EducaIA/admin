import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { timeWrapped } from "~/utils/utils";

import {
  db,
  getExistingCacheGroups,
  getMessageTypes,
  getOposiciones,
  getTopics,
} from "../db";
import {
  cacheGroup,
  cacheGroupChunks,
  cacheGroupRelatedQuestions,
} from "../db/cache";
import { getChunkData } from "../db/data_db";
import { createEmbeddings } from "../openai";
import { getResponseByRegion } from "../retriever";
import { MicroservicesClient } from "../microservices";

const queries = {
  getChunkData: timeWrapped(getChunkData, "getChunkData"),
  getTopics: timeWrapped(getTopics),
  getOposiciones: timeWrapped(getOposiciones),
  getMessageTypes: timeWrapped(getMessageTypes),
  getQuestions: timeWrapped(
    async ({ input }) => await getExistingCacheGroups(input),
    "existingCacheGroups"
  ),
};

const mutations = router({
  saveCacheGroup: protectedProcedure
    .input(
      z.object({
        groupId: z.number().optional(),
        data: z.object({
          id: z.number().optional(),
          question: z.string(),
          response: z.record(z.string(), z.string()),
          similarChunks: z.record(z.string(), z.array(z.string())),
          relatedQuestions: z.array(z.number()),
          oposicion: z.string(),
          topics: z.array(z.string()),
        }),
      })
    )
    .mutation(async ({ input: { data }, ctx }) => {
      const questionEmbeddings = await createEmbeddings(data.question);

      let cacheGroupId = data?.id ?? 0;

      if (cacheGroupId === 0) {
        await ctx.db.transaction(async (trx) => {
          const res = await trx
            .insert(cacheGroup)
            .values({
              question: data.question,
              questionEmbeddings,
              answer: data.response,
              oposicion: data.oposicion,
              topics: data.topics,
            })
            .onConflictDoUpdate({
              target: [cacheGroup.question],
              set: {
                question: data.question,
                questionEmbeddings,
                answer: data.response,
                oposicion: data.oposicion,
                topics: data.topics,
              },
            })
            .returning({
              cacheGroupId: cacheGroup.id,
            })
            .execute();

          cacheGroupId = res[0].cacheGroupId;

          for (const [region, chunks] of Object.entries(data.similarChunks)) {
            await trx
              .insert(cacheGroupChunks)
              .values(
                chunks.map((chunk) => ({
                  group_id: cacheGroupId,
                  chunk_id: chunk,
                  region,
                }))
              )
              .execute();
          }

          if (data.relatedQuestions.length > 0) {
            await trx
              .insert(cacheGroupRelatedQuestions)
              .values(
                data.relatedQuestions.map((question) => ({
                  group_id: cacheGroupId,
                  message_data_id: question,
                }))
              )
              .execute();
          }
        });
      } else {
        await ctx.db.transaction(async (trx) => {
          const existingGroup = await db
            .select()
            .from(cacheGroup)
            .where(eq(cacheGroup.id, cacheGroupId))
            .execute();

          if (!existingGroup || existingGroup.length === 0) {
            throw new Error("Cache group not found");
          }

          const existingAnswer = existingGroup?.[0]?.answer ?? {};
          const fullAnswer = {
            ...existingAnswer,
            ...data.response,
          };

          await trx
            .update(cacheGroup)
            .set({
              question: data.question,
              questionEmbeddings,
              answer: fullAnswer,
              oposicion: data.oposicion,
              topics: data.topics,
            })
            .where(eq(cacheGroup.id, cacheGroupId))
            .execute();

          for (const [region, chunks] of Object.entries(data.similarChunks)) {
            await trx
              .delete(cacheGroupChunks)
              .where(eq(cacheGroupChunks.group_id, cacheGroupId))
              .execute();

            await trx
              .insert(cacheGroupChunks)
              .values(
                chunks.map((chunk) => ({
                  group_id: cacheGroupId,
                  chunk_id: chunk,
                  region,
                }))
              )
              .execute();
          }

          if (data.relatedQuestions.length > 0) {
            for (const question of data.relatedQuestions) {
              await trx
                .update(cacheGroupRelatedQuestions)
                .set({
                  group_id: cacheGroupId,
                  messge_data_id: question,
                })
                .execute();
            }
          }
        });
      }

      const questions = await db.execute(sql<{
        user_id: number;
        created_at: string;
        title: string;
        region: string;
      }>`
        SELECT user_id, messages.created_at, title, (select region from search_oposicion_by_topic_id(topic_id::int)) region FROM messages 
        JOIN topics on topics.id = messages.topic_id
        WHERE content = ${data.question} 
      `);

      for (const question of questions.rows) {
        const group = await db
          .select()
          .from(cacheGroup)
          .where(eq(cacheGroup.id, cacheGroupId))
          .execute();

        const regions = Object.keys(group[0].answer ?? {});

        let response = "";

        if (regions.includes(question.region as string)) {
          response = group[0]?.answer?.[question.region as string] ?? "";
        } else if (regions.includes("nacional")) {
          response = group[0]?.answer?.nacional ?? "";
        }

        if (response === "") {
          continue;
        }

        const datetime = new Date(question.created_at as string).toLocaleString(
          "es-ES",
          { weekday: "long", year: "numeric", month: "long", day: "numeric" }
        );

        try {
          await MicroservicesClient.post("/admin/notifications", {
            level: "warning",
            type: "la bot",
            message: `El ${datetime} hiciste la siguiente pregunta en el ${question.title}: 
          
**TU PREGUNTA**: ${data.question}
          
y te dimos una respuesta incorrecta o incompleta. Hemos revisado la respuesta y la correcta es:

\`\`\`
${response}
\`\`\`
          `,
            user_id: question.user_id,
          });
        } catch (e) {
          throw new Error(
            `Error sending notification: ${(e as Error).message}`
          );
        }
      }
    }),

  recreateResponse: protectedProcedure
    .input(
      z.object({
        question: z.string(),
        chunks: z.record(z.string(), z.array(z.string())),
      })
    )
    .mutation(async ({ input: { question, chunks } }) => {
      const responses: Record<string, string> = {};

      const responsePromises = Object.entries(chunks).map(
        async ([region, regionChunks]) => {
          const response = await getResponseByRegion(regionChunks, question);
          return [region, response];
        }
      );

      for (const promise of responsePromises) {
        try {
          await promise;
        } catch (e) {
          console.log(e);
        }
      }

      const responsesArray = await Promise.all(responsePromises);

      for (const [region, response] of responsesArray) {
        if (region && response) {
          responses[region] = response;
        }
      }

      return responses;
    }),
});
