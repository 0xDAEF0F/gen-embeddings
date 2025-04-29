import "dotenv/config";
import { getVectorStore } from "./utils/getVectorStore";

const main = async () => {
  const searchText = process.argv[2];

  if (!searchText) {
    console.error("Please provide the searchText as an argument.");
    process.exit(1);
  }

  const vectorStore = getVectorStore();
  await vectorStore.connect();

  const searchResults = await vectorStore.search(
    searchText,
    100000,
    undefined,
    1000,
  );
  const results_ = searchResults.map((res) => {
    return res.content;
  });
  console.log(JSON.stringify(results_, null, 2));

  await vectorStore.disconnect();
};

main().catch(console.error);
