import { promises as fs } from "node:fs";

// Can throw if file doesn't exist
export const getFileAsString = async (filePath: string) => {
	const data = await fs.readFile(filePath, "utf-8");
	return data;
};
