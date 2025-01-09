import {
  VectorStore,
  DatabaseSettings,
  VectorStoreSettings,
} from "./vectorstore";

const TIMESCALE_SERVICE_URL = process.env.TIMESCALE_SERVICE_URL || "postgres://postgres:password@127.0.0.1:5432/postgres";
const VECTOR_DATABASE_EMBEDDING_DIMENSIONS = parseInt(process.env.VECTOR_DATABASE_EMBEDDING_DIMENSIONS || '', 10) || 1024;
const VECTOR_DATABASE_EMBEDDING_TABLE_NAME = process.env.VECTOR_DATABASE_EMBEDDING_TABLE_NAME || "code_chunks";

export const getVectorStore = () => {
  const dbSettings: DatabaseSettings = {
    connectionString: TIMESCALE_SERVICE_URL
  };

  const vectorStoreSettings: VectorStoreSettings = {
    embeddingDimensions: VECTOR_DATABASE_EMBEDDING_DIMENSIONS,
    tableName: VECTOR_DATABASE_EMBEDDING_TABLE_NAME
  };

  return new VectorStore(dbSettings, vectorStoreSettings);
};
