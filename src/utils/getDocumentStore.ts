import { Client } from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:password@127.0.0.1:5432/postgres";

new Client({
  connectionString: DATABASE_URL,
});

export const getDocumentStore = () => {
  return new Client({
    connectionString: DATABASE_URL,
  });
};
