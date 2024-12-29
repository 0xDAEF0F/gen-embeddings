import 'dotenv/config';
import fastify from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { getVectorStore } from './utils/getVectorStore';
import { generateResponse } from './utils/generateResponse';
import { VectorStore } from './utils/vectorstore';

const PORT = parseInt(process.env.WEBSERVER_PORT || '', 10) || 3000;

const server = fastify({
  logger: true,
  ajv: {
    customOptions: {
      allErrors: true,
    },
  }
});

let vectorStore: VectorStore;
const getInitializedVectorStore = async () => {
  if (vectorStore) {
    return vectorStore;
  }

  vectorStore = getVectorStore();

  await vectorStore.connect();

  return vectorStore;
};

server.register(fastifySwagger, {
  swagger: {
    info: {
      title: 'My Fastify AI Search API',
      description: 'API documentation for AI search',
      version: '1.0.0',
    },
    host: 'localhost:' + PORT,
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
  },
});

server.register(async function () {
  server.get(
    '/ai-search',
    {
      schema: {
        description: 'Search using vector db search results with AI',
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
              answer: { type: 'string', description: 'Answer to the search query' },
            }
          }
        },
        config: {
          swagger: {
            exposeHeadRoute: true,
          }
        }
      }
    },
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
      const context = Array.isArray(results) ? results : [results];

      try {
        const response = await generateResponse(searchText, context);

        return { answer: response };
      } catch (error) {
        console.error('Error generating response:', error);
        reply.code(500);

        return 'Error generating response';
      }
    }
  );
});

server.register(fastifySwaggerUi, {
  routePrefix: '/docs',
});

const start = async () => {
  try {
    await server.listen({ port: PORT });
    server.swagger()
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};
start();