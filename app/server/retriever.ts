import { inArray } from "drizzle-orm";
import lodash from "lodash";

import {
  PROMPTS,
  chatCompletion,
  createCompletion,
  getPromptWithReplacements,
} from "./openai";
import { data_db, db } from "./db";
import {
  EmbeddingSubchunk,
  embedding_subchunk,
} from "./db/entities/embedding_subchunk";

export async function summarizeByDocument(
  query: string,
  documentId: string,
  chunks: EmbeddingSubchunk[]
) {
  const summarizedByChunk = await Promise.all(
    chunks.map((c) => {
      return createCompletion(
        getPromptWithReplacements("SUMMARIZE_CHUNKS", {
          content_docs: `${c.item_identifier.document_id} ${c.item_identifier.title} ${c.item_identifier.subtitle} \n\n ${c.text}`,
          q: query,
        }),
        0.5
      );
    })
  );

  return [documentId, summarizedByChunk.join("\n")] as const;
}

export async function extractiveSummarization(
  validChunks: EmbeddingSubchunk[],
  query: string
) {
  return Promise.all(
    Object.values(
      lodash.groupBy(validChunks, (chunk) => chunk.item_identifier.document_id)
    ).map((chunks) =>
      summarizeByDocument(query, chunks[0].item_identifier.document_id, chunks)
    )
  );
}

export async function getResponseByRegion(
  chunks: string[],
  question: string,
  topicsArray: string[]
) {
  const embeddingsChunks = await data_db.query.embedding_subchunk.findMany({
    where: inArray(embedding_subchunk.id, chunks),
  });

  if (!embeddingsChunks) {
    return "";
  }

  const summarizedByRegion = await extractiveSummarization(
    embeddingsChunks,
    question
  );

  let datosRelevantes = `DATOS RELEVANTES\n### MARCO LEGAL \n ${summarizedByRegion}`;

  if (topicsArray.length === 1) {
    const topic = await db.query.topics.findFirst({
      where: (topics, { eq, and }) =>
        and(eq(topics.title, topicsArray[0]), eq(topics.kb_folder_id, 5)),
    });

    if (topic?.summary) {
      datosRelevantes = `### RESUMEN DEL TEMA \n ${topic.summary}`;
    }
  }

  const askChatResponse = await chatCompletion(
    [
      { role: "system", content: PROMPTS.QA_LEGAL_WITH_CONTEXT },
      {
        role: "user",
        content: datosRelevantes,
      },
      { role: "user", content: question },
    ],
    "gpt-4-1106-preview"
  );

  return askChatResponse;
}
