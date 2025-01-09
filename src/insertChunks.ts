import 'dotenv/config'
import { createEmbedding } from "./utils/createEmbedding";
import { getVectorStore } from "./utils/getVectorStore";
import { saveFileToDatabase } from './utils/saveFileToDatabase';
import { getDocumentStore } from './utils/getDocumentStore';
import { getChunkedCode } from './utils/getChunkedCode';
import { getCodeFiles } from './utils/getCodeFiles';
import { createCodeFilesTable } from './utils/createCodeFilesTable';

const main = async () => {
  const codebasePath = process.argv[2];

  if (!codebasePath) {
    console.error("Please provide the codebase directory path as an argument.");
    process.exit(1);
  }

  const pgClient = getDocumentStore();
  await pgClient.connect();

  await createCodeFilesTable(pgClient);

  const vectorStore = getVectorStore();
  await vectorStore.connect();
  await vectorStore.createTables();
  await vectorStore.createIndex();

  const codeFiles = getCodeFiles(codebasePath);
  await Promise.all(codeFiles.map(async (sourceFile) => {
    const fileContent = sourceFile.getFullText();

    const fileBuffer = Buffer.from(fileContent, 'utf-8');
    await saveFileToDatabase(pgClient, sourceFile.getFilePath(), fileBuffer);
  }));

  await pgClient.end();

  const codeChunks = getChunkedCode(codebasePath);
  for (const chunk of codeChunks) {
    chunk.embedding = await createEmbedding(chunk.content);
  }

  await vectorStore.upsert(codeChunks);

  await vectorStore.disconnect();
};

main().catch(console.error);
