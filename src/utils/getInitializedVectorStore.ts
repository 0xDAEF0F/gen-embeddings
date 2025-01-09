import { getVectorStore } from "./getVectorStore";
import { VectorStore } from "./vectorstore";

let vectorStore: VectorStore;

export const getInitializedVectorStore = async () => {
  if (vectorStore) {
    return vectorStore;
  }

  vectorStore = getVectorStore();

  await vectorStore.connect();

  return vectorStore;
};