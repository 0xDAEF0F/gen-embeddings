import "dotenv/config";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
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

server.register(dbSearchRoute);
// server.register(aiSearchRoute);
// server.register(getFilesRoute);
// server.register(getFileRoute);
// server.register(deleteFileRoute);
