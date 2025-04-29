import type { FastifyInstance } from "fastify";
import { getDocumentStore } from "../../utils/getDocumentStore";

export const getFilesRoute = (server: FastifyInstance) => {
  server.get(
    "/files",
    {
      schema: {
        description: "Get all document file names",
        summary: "Retrieves a list of all document file names",
        tags: ["documents"],
        response: {
          200: {
            type: "array",
            items: { type: "string", description: "File name" },
          },
        },
      },
    },
    async (request, reply) => {
      const pgClient = getDocumentStore();
      try {
        await pgClient.connect();

        const query = "SELECT file_name FROM code_files";
        const result = await pgClient.query(query);

        const fileNames = result.rows.map((row) => row.file_name);
        return fileNames;
      } catch (error) {
        console.error("Error retrieving file names:", error);
        reply.code(500);
        return "Error retrieving file names";
      } finally {
        await pgClient.end();
      }
    },
  );
};
