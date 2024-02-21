import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

import { getDBConnection } from "./conn";
import { data_db_schema } from "./schema";
import { cachified } from "~/.server/cache";
import { FullChunkSelectorData } from "~/types";

const conn = await getDBConnection({
  database: "data_dev",
});

export const data_db = drizzle(conn, {
  schema: data_db_schema,
});

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
    END as nacional FROM region_data;`
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
