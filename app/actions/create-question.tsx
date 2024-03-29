import { redirectWithError, redirectWithSuccess } from "remix-toast";
import { z } from "zod";
import { db } from "~/server/db";
import { cacheGroup, cacheGroupChunks } from "~/server/db/entities/cache";
import { createEmbeddings } from "~/server/openai";

import { stringToJSONSchema } from "~/utils/utils";

const createQuestionSchema = z.object({
  pregunta: z.string(),
  chunks: stringToJSONSchema.pipe(z.record(z.array(z.string())).optional()),
  oposicion: z.string().default("infantil"),
  topics: stringToJSONSchema.pipe(z.array(z.string())),
  answer: z.record(z.string()),
});

export const runCreateQuestionAction = async (formData: FormData) => {
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
      chunks: fullBody.chunks ?? "{}",
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
    } = data.data;

    const questionEmbeddings = await createEmbeddings(question);

    await db.transaction(async (trx) => {
      const res = await trx
        .insert(cacheGroup)
        .values({
          question: question,
          questionEmbeddings,
          answer: answer,
          oposicion: oposicion,
          topics: topics,
        })
        .onConflictDoUpdate({
          target: [cacheGroup.question],
          set: {
            question: question,
            questionEmbeddings,
            answer: answer,
            oposicion: oposicion,
            topics: topics,
          },
        })
        .returning({
          cacheGroupId: cacheGroup.id,
        })
        .execute();

      const cacheGroupId = res[0].cacheGroupId;

      if (!cacheGroupId) {
        throw new Error("No se ha podido crear el grupo de cache");
      }

      if (typeof regionalChunks !== "undefined") {
        for (const [region, chunks] of Object.entries(regionalChunks)) {
          await trx
            .insert(cacheGroupChunks)
            .values(
              chunks.map((chunk) => ({
                group_id: cacheGroupId,
                chunk_id: chunk,
                region,
              })),
            )
            .execute();
        }
      }
    });

    return redirectWithSuccess("/", {
      message: "Grupo de cache creado correctamente",
    });
  } catch (error) {
    return redirectWithError("/", {
      message: (error as Error).message,
    });
  }
};
