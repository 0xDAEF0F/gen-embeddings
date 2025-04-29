import { writeFileSync } from "node:fs";
import { server } from "./server/server";

/**
 * Generate a swagger file based on the server swagger configs.
 */
server.ready(() => {
  const yaml = server.swagger({ yaml: true });
  writeFileSync("./swagger.yml", yaml);
});
