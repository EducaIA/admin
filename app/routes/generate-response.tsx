import { ActionFunction } from "@remix-run/node";
import { z } from "zod";
import { getResponseByRegion } from "~/server/retriever";
import { stringToJSONSchema } from "~/utils/utils";

const createResponsesSchema = z.object({
  question: z.string(),
  chunks: stringToJSONSchema.pipe(z.record(z.array(z.string()))),
});

export const action: ActionFunction = async ({ request }) => {
  const body = await request.formData();

  const res = await createResponsesSchema.safeParseAsync(
    Object.fromEntries(body),
  );

  if (!res.success) {
    return { success: false, error: res.error };
  }

  const { question, chunks } = res.data;

  const responses: Record<string, string> = {};

  const responsePromises = Object.entries(chunks).map(
    async ([region, regionChunks]) => {
      const response = await getResponseByRegion(regionChunks, question);
      return [region, response];
    },
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

  return {
    success: true,
    response: responses,
  };
};
