import { ActionFunction } from "@remix-run/node";
import { z } from "zod";
import { getResponseByRegion } from "~/server/retriever";
import { stringToJSONSchema } from "~/utils/utils";

const createResponsesSchema = z.object({
  question: z.string(),
  chunks: stringToJSONSchema.pipe(z.record(z.array(z.string()))),
  topics: z.string().optional(),
});

export const action: ActionFunction = async ({ request }) => {
  const body = await request.formData();

  const res = await createResponsesSchema.safeParseAsync(
    Object.fromEntries(body),
  );

  if (!res.success) {
    return { success: false, error: res.error };
  }

  const { question, chunks, topics } = res.data;

  let topicsArray: string[] = [];

  if (topics !== undefined && topics !== "") {
    topicsArray = topics.split(",");
  }

  const responses: Record<string, string> = {};

  try {
    const responsesArray = await Promise.all(
      Object.entries(chunks).map(async ([region, regionChunks]) => {
        const response = await getResponseByRegion(
          regionChunks,
          question,
          topicsArray ?? [],
        );
        return [region, response];
      }),
    );

    for (const [region, response] of responsesArray) {
      if (region && response) {
        responses[region] = response;
      }
    }
  } catch (e) {
    console.log(e);

    return {
      success: false,
      error: `An error occurred while generating the response: ${
        (e as Error).message
      }`,
    };
  }

  return {
    success: true,
    response: responses,
  };
};
