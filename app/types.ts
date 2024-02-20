import { z } from "zod";

export type FullChunkSelectorData = {
  [region: string]: {
    [document: string]: {
      [title: string]: {
        subtitle: string;
        chunks: {
          id: string;
          chunk: string;
          text: string;
        }[];
      };
    };
  };
};

export type RegionChunkSelectorData = FullChunkSelectorData[string];

const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

type Literal = z.infer<typeof literalSchema>;

type Json = Literal | { [key: string]: Json } | Json[];

const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)])
);

export const json = () => jsonSchema;
