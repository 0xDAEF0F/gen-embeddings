import type { FastifyInstance } from "fastify";
import { getDocumentStore } from "../../utils/getDocumentStore";

export const getFileRoute = (server: FastifyInstance) => {
  server.get(
    "/files/:fileName",
    {
      schema: {
        description: "Get the text content of a document",
        summary: "Retrieves the content of a document by file name",
        tags: ["documents"],
        params: {
          type: "object",
          properties: {
            fileName: {
              type: "string",
              description: "The name of the file to retrieve",
            },
          },
          required: ["fileName"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              content: {
                type: "string",
                description: "The text content of the file",
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { fileName } = request.params as { fileName: string };

      const pgClient = getDocumentStore();
      try {
        await pgClient.connect();

        const query = `
          SELECT encode(file_data, 'escape') AS file_data_string 
          FROM code_files
          WHERE file_name = $1
        `;
        const result = await pgClient.query(query, [fileName]);

        if (result.rows.length === 0) {
          reply.code(404);
          return "Document not found";
        }

        const fileContent = result.rows[0].file_data_string;
        return { content: fileContent };
      } catch (error) {
        console.error("Error retrieving document:", error);
        reply.code(500);
        return "Error retrieving document";
      } finally {
        await pgClient.end();
      }
    },
  );
};
