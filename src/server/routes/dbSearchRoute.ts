import type { FastifyInstance } from "fastify";
import { getInitializedVectorStore } from "../../utils/getInitializedVectorStore";

// TODO: validate properly
export const dbSearchRoute = async (server: FastifyInstance) => {
  server.get("/db-search", async (request, reply) => {
    const { searchText, maxTokens = "5000" } = request.query as {
      searchText: string;
      maxTokens?: string;
    };

    if (!searchText) {
      reply.code(400);

      return "Please provide the searchText as a query parameter.";
    }

    const initializedVectorStore = await getInitializedVectorStore();
    const results = await initializedVectorStore.search(
      searchText,
      10000,
      undefined,
      Number(maxTokens),
    );
    const items = Array.isArray(results) ? results : [results];

    return items.map((item) => item.content);
  });
};
