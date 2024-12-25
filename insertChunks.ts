import 'dotenv/config'
import { createEmbedding } from "./utils/createEmbedding";
import { getChunkedCode } from "./utils/getChunkedCode";
import { getVectorStore } from "./utils/getVectorStore";

const main = async () => {
  const codebasePath = process.argv[2];

  if (!codebasePath) {
    console.error("Please provide the codebase directory path as an argument.");
    process.exit(1);
  }

  const vectorStore = getVectorStore();
  await vectorStore.connect();
  await vectorStore.createTables();
  await vectorStore.createIndex();

  const codeChunks = getChunkedCode(codebasePath);
  for (const chunk of codeChunks) {
    chunk.embedding = await createEmbedding(chunk.content);
  }

  await vectorStore.upsert(codeChunks);

  await vectorStore.disconnect();
};

main().catch(console.error);
