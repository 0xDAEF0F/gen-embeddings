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

server.register(async function () {
  server.get(
    '/db-search',
    {
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
      const items = Array.isArray(results) ? results : [results];

      return { items: items.map((item) => ({ type: item.metadata.type, ...item })) };
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