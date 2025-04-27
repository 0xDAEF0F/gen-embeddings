import { FastifyInstance } from "fastify";
import { getInitializedVectorStore } from "../../utils/getInitializedVectorStore";
import { generateResponse } from "../../utils/generateResponse";

const ROUTE_SCHEMA = {
	schema: {
		description: "Search using vector db search results with AI",
		tags: ["search"],
		query: {
			type: "object",
			properties: {
				searchText: { type: "string", description: "Text to search" },
				dbResultLimit: {
					type: "integer",
					description: "Limit of results from the database",
					default: 3,
				},
			},
		},
		response: {
			200: {
				type: "object",
				properties: {
					answer: { type: "string", description: "Answer to the search query" },
				},
			},
		},
	},
};

export const aiSearchRoute = (server: FastifyInstance) => {
	server.get("/ai-search", ROUTE_SCHEMA, async (request, reply) => {
		const { searchText, dbResultLimit } = request.query as {
			searchText: string;
			dbResultLimit?: number;
		};

		if (!searchText) {
			reply.code(400);

			return "Please provide the searchText as a query parameter.";
		}

		const initializedVectorStore = await getInitializedVectorStore();
		const results = await initializedVectorStore.search(
			searchText,
			dbResultLimit,
		);
		const context = Array.isArray(results) ? results : [results];

		try {
			const response = await generateResponse(searchText, context);

			return { answer: response };
		} catch (error) {
			console.error("Error generating response:", error);
			reply.code(500);

			return "Error generating response";
		}
	});
};
