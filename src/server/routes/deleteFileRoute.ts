import { FastifyInstance } from "fastify";
import { getDocumentStore } from "../../utils/getDocumentStore";
import { getVectorStore } from "../../utils/getVectorStore";

export const deleteFileRoute = (server: FastifyInstance) => {
  server.delete(
    "/files/:fileName",
    {
      schema: {
        description: "Delete a document by file name",
        summary: "Deletes a document from the server",
        tags: ['documents'],
        params: {
          type: "object",
          properties: {
            fileName: {
              type: "string",
              description: "The name of the file to delete",
            },
          },
          required: ["fileName"],
        },
      },
    },
    async (request, reply) => {
      const { fileName } = request.params as { fileName: string };

      const pgClient = getDocumentStore();
      const vectorStore = getVectorStore();

      try {
        await pgClient.connect();
        await vectorStore.connect();

        const deleteDocumentQuery = `DELETE FROM code_files WHERE file_name = $1`;
        await pgClient.query(deleteDocumentQuery, [fileName]);

        await vectorStore.deleteFile(fileName);

        return { message: "Document deleted successfully" };
      } catch (error) {
        console.error("Error deleting document:", error);
        reply.code(500);
        return "Error deleting document";
      } finally {
        await pgClient.end();
        await vectorStore.disconnect();
      }
    }
  );
};