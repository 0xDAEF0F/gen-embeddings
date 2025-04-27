import "dotenv/config";
import { generateResponse } from "./utils/generateResponse";
import { getVectorStore } from "./utils/getVectorStore";

async function main() {
	const searchText = process.argv[2];

	if (!searchText) {
		console.error("Please provide the searchText as an argument.");
		process.exit(1);
	}

	const vectorStore = getVectorStore();

	await vectorStore.connect();
	// const metadata_filter: MetadataFilter = {}; // TODO: Pass in type filter
	const results = await vectorStore.search(searchText, 3);
	const context = Array.isArray(results) ? results : [results];

	try {
		const response = await generateResponse(searchText, context);
		console.log(response);
	} catch (error) {
		console.error("Error generating response:", error);
	}

	await vectorStore.disconnect();
}

main().catch(console.error);
