import * as fs from "fs/promises";
import * as path from "path";

export const getAllFiles = async (dirPath: string): Promise<string[]> => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getAllFiles(fullPath))); // Recursively get files from subdirectories
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}