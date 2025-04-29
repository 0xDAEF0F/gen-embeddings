import { getVectorStore } from "./getVectorStore";
import type { VectorStore } from "./vectorstore";

let vectorStore: VectorStore;

export const getInitializedVectorStore = async () => {
  if (vectorStore) {
    return vectorStore;
  }

  vectorStore = getVectorStore();

  await vectorStore.connect();

  return vectorStore;
};
