import { eq, sql } from "drizzle-orm";
import { redirectWithError, redirectWithSuccess } from "remix-toast";
import { z } from "zod";
import { db } from "~/server/db";
import { cacheGroup, cacheGroupChunks } from "~/server/db/entities/cache";
import { MicroservicesClient } from "~/server/microservices";
import { createEmbeddings } from "~/server/openai";

import { stringToJSONSchema } from "~/utils/utils";

const createQuestionSchema = z.object({
  id: z.coerce.number(),
  type: z.string(),
  pregunta: z.string(),
  chunks: stringToJSONSchema.pipe(z.record(z.array(z.string()))),
  oposicion: z.string().default("infantil"),
  topics: stringToJSONSchema.pipe(z.array(z.string())),
  answer: z.record(z.string()),
});

export const runEditQuestionAction = async (formData: FormData) => {
  try {
    const fullBody = Object.fromEntries(formData);
    const answer = Object.entries(fullBody).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        if (key.startsWith("respuesta-")) {
          acc[key.replace("respuesta-", "") as string] = value as string;
        }

        return acc;
      },
      {},
    );

    const data = createQuestionSchema.safeParse({
      ...fullBody,
      answer,
    });

    if (!data.success) {
      const errors = data.error.errors.map((error) => error.message).join(", ");
      return redirectWithError("/", {
        message: `Error en el formulario: ${errors}`,
      });
    }

    const {
      pregunta: question,
      chunks: regionalChunks,
      oposicion,
      topics,
      id,
    } = data.data;

    const questionEmbeddings = await createEmbeddings(question);

    await db.transaction(async (trx) => {
      const existingGroup = await db
        .select()
        .from(cacheGroup)
        .where(eq(cacheGroup.id, id))
        .execute();

      const existingAnswer = existingGroup?.[0]?.answer ?? {};
      const fullAnswer = {
        ...existingAnswer,
        ...answer,
      };

      await trx
        .update(cacheGroup)
        .set({
          question: question,
          questionEmbeddings,
          answer: fullAnswer,
          oposicion: oposicion,
          topics: topics,
        })
        .where(eq(cacheGroup.id, id))
        .execute();

      for (const [region, chunks] of Object.entries(regionalChunks)) {
        await trx
          .delete(cacheGroupChunks)
          .where(eq(cacheGroupChunks.group_id, id))
          .execute();

        await trx
          .insert(cacheGroupChunks)
          .values(
            chunks.map((chunk) => ({
              group_id: id,
              chunk_id: chunk,
              region,
            })),
          )
          .execute();
      }
    });

    const originalQuestion = question;

    const questions = await db.execute(sql<{
      user_id: number;
      created_at: string;
      title: string;
      region: string;
    }>`
    SELECT user_id, messages.created_at, title, (select region from search_oposicion_by_topic_id(topic_id::int)) region FROM messages 
    JOIN topics on topics.id = messages.topic_id
    WHERE content = ${originalQuestion} 
  `);

    for (const question of questions.rows) {
      const group = await db
        .select()
        .from(cacheGroup)
        .where(eq(cacheGroup.id, id))
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
        { weekday: "long", year: "numeric", month: "long", day: "numeric" },
      );

      try {
        await MicroservicesClient.post("/admin/notifications", {
          level: "warning",
          type: "la bot",
          message: `El ${datetime} hiciste la siguiente pregunta en el ${question.title}: 
      
**TU PREGUNTA**: ${originalQuestion}
      
y te dimos una respuesta incorrecta o incompleta. Hemos revisado la respuesta y la correcta es:

\`\`\`
${response}
\`\`\`
      `,
          user_id: question.user_id,
        });

        console.log("Notification sent");
      } catch (e) {
        throw new Error(`Error sending notification: ${(e as Error).message}`);
      }
    }

    return redirectWithSuccess("/", {
      message: "Pregunta editada correctamente",
    });
  } catch (error) {
    return redirectWithError("/", {
      message: (error as Error).message,
    });
  }
};
