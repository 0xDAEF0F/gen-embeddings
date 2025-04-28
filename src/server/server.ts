import "dotenv/config";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastify from "fastify";
import { aiSearchRoute } from "./routes/aiSearchRoute";
import { dbSearchRoute } from "./routes/dbSearchRoute";
import { deleteFileRoute } from "./routes/deleteFileRoute";
import { getFileRoute } from "./routes/getFileRoute";
import { getFilesRoute } from "./routes/getFilesRoute";

const PORT = Number.parseInt(process.env.WEBSERVER_PORT || "", 10) || 3000;
const HOST = process.env.WEBSERVER_HOST || "0.0.0.0";

export const server = fastify({
	logger: true,
	ajv: {
		customOptions: {
			allErrors: true,
		},
	},
});

server.register(cors);
server.register(multipart);
server.register(fastifySwagger, {
	swagger: {
		info: {
			title: "LLM Typescript Codebase Embeddings AI Search API",
			description: "API documentation for AI search",
			version: "1.0.0",
		},
		host: `${HOST}:${PORT}`,
		schemes: ["http"],
		consumes: ["application/json"],
		produces: ["application/json"],
		externalDocs: {
			url: "https://github.com/paulb896/llm-typescript-codebase-embeddings",
			description:
				"Parse and Load Typescript Codebase into Postges Vector DB which can be used as part of a RAG setup.",
		},
	},
});

server.register(aiSearchRoute);
server.register(dbSearchRoute);
server.register(getFilesRoute);
server.register(getFileRoute);
server.register(deleteFileRoute);
server.register(fastifySwaggerUi, {
	routePrefix: "/docs",
});
