import type { Client } from "pg";

export const saveFileToDatabase = async (
	pgClient: Client,
	fileName: string,
	fileBuffer: Buffer,
) => {
	const query = "INSERT INTO code_files (file_name, file_data) VALUES ($1, $2)";

	await pgClient.query(query, [fileName, fileBuffer]);
};
