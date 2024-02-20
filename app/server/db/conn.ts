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
