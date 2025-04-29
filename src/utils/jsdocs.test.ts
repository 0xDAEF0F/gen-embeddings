import { describe, expect, test } from "bun:test";
import { Project } from "ts-morph";
import { processSourceFile } from "./getChunkedCode";

/**
 * @description This is a function that sums two numbers
 * @param a - The first number to sum
 * @param b - The second number to sum
 * @returns The sum of the two numbers
 * @internal
 */
function sumExampleInternal(a: number, b: number) {
  return a + b;
}

/**
 * @description This is a function that sums two numbers
 * @param a - The first number to sum
 * @param b - The second number to sum
 * @returns The sum of the two numbers
 */
function sumExamplePublic(a: number, b: number) {
  return a + b;
}

describe("jsDocs", () => {
  const project = new Project({
    tsConfigFilePath: `${process.cwd()}/tsconfig.json`,
  });
  const files = project.getSourceFiles();

  const thisFile = files.find((file) =>
    file.getFilePath().includes("jsdocs.test.ts"),
  );

  if (!thisFile) {
    throw new Error("This file not found");
  }

  test("sumExample internal jsDocs", () => {
    const codeChunks = processSourceFile(thisFile);

    const hasPublicChunk = codeChunks.some(
      (chunk) => chunk.metadata.functionOrClassName === "sumExamplePublic",
    );

    expect(hasPublicChunk).toBe(true);

    for (const chunk of codeChunks) {
      if (chunk.metadata.functionOrClassName === "sumExampleInternal") {
        throw new Error("Chunk should not be created");
      }
    }
  });
});
