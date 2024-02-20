import { inArray } from "drizzle-orm";
import lodash from "lodash";

import { data_db } from "./db/data_db";
import { EmbeddingSubchunk, embedding_subchunk } from "./db/embedding_subchunk";
import {
  PROMPTS,
  chatCompletion,
  createCompletion,
  getPromptWithReplacements,
} from "./openai";

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

export async function getResponseByRegion(chunks: string[], question: string) {
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

  const askChatResponse = await chatCompletion(
    [
      { role: "system", content: PROMPTS.QA_LEGAL_WITH_CONTEXT },
      {
        role: "system",
        content: `DATOS RELEVANTES
                          ${summarizedByRegion}`,
      },
      { role: "user", content: question },
    ],
    "gpt-4-1106-preview"
  );

  return askChatResponse;
}
