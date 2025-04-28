import "dotenv/config";
import { createOpenAiEmbedding } from "./utils/createEmbedding";
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

	// clears up everything
	await vectorStore.createTables();
	await vectorStore.delete(undefined, undefined, true);

	const codeChunks = getChunkedCode(codebasePath);

	const codeChunksTemp = codeChunks.slice(0, 10);

	const embeddings = await Promise.all(
		codeChunksTemp.map(async (chunk) => {
			try {
				const embedding = await createOpenAiEmbedding(
					chunk.content,
					"text-embedding-3-small",
				);
				return { ...chunk, embedding };
			} catch {
				return null;
			}
		}),
	);
	const successfulEmbeddings = embeddings.filter(
		(chunk): chunk is (typeof codeChunks)[number] & { embedding: number[] } =>
			!!chunk,
	);

	await vectorStore.upsert(successfulEmbeddings);

	await vectorStore.disconnect();
};

main().catch(console.error);
