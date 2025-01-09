import { FastifyInstance } from "fastify";
import { getInitializedVectorStore } from "../../utils/getInitializedVectorStore";



const ROUTE_SCHEMA = {
  schema: {
    description: 'Search using vector db search results',
    tags: ['search'],
    query: {
      type: 'object',
      properties: {
        searchText: { type: 'string', description: 'Text to search' },
        dbResultLimit: {
          type: 'integer',
          description: 'Limit of results from the database',
          default: 3,
        },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'Search Results',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'ID of the search result' },
                content: { type: 'string', description: 'Text of the search result' },
                path: { type: 'string', description: 'File path of the search result' },
                functionOrClassName: { type: 'string', description: 'The name of the function/class etc' },
                type: { type: 'string', description: 'The type of chunk, ex: function/class/interface' }
              }
            }
          },
        }
      }
    },
    config: {
      swagger: {
        exposeHeadRoute: true,
      }
    }
  }
};

export const dbSearchRoute = async (server: FastifyInstance) => {
  server.get(
    '/db-search',
    ROUTE_SCHEMA,
    async (request, reply) => {
      const { searchText, dbResultLimit } = request.query as {
        searchText: string;
        dbResultLimit?: number;
      };

      if (!searchText) {
        reply.code(400);

        return 'Please provide the searchText as a query parameter.';
      }

      const initializedVectorStore = await getInitializedVectorStore();
      const results = await initializedVectorStore.search(
        searchText,
        dbResultLimit
      );
      const items = Array.isArray(results) ? results : [results];

      return { items: items.map((item) => ({ type: item.metadata.type, ...item })) };
    }
  );
}