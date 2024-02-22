import { drizzle } from "drizzle-orm/node-postgres";

import * as cache from "./entities/cache";

import * as messages from "./entities/messages";
import * as oposiciones from "./entities/oposiciones";
import { users } from "./entities/users";

import { embedding_subchunk } from "./entities/embedding_subchunk";

import pg, { PoolConfig } from "pg";

export const getDBConnection = async (options: Partial<PoolConfig> = {}) => {
  const conn = new pg.Pool({
    host: "educaia-main-postgres.postgres.database.azure.com",
    user: "educaia",
    password: process.env.DB_PASSWORD,
    port: 5432,
    ssl: true,
    max: 20,
    ...options,
  });

  return conn.connect();
};

const conn = await getDBConnection({
  database: "app_dev",
});

export const db = drizzle(conn, {
  schema: {
    ...messages,
    ...oposiciones,
    users,
    ...cache,
  },
});

const data_conn = await getDBConnection({
  database: "data_dev",
});

export const data_db = drizzle(data_conn, {
  schema: {
    embedding_subchunk,
  },
});
