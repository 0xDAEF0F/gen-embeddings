export const createCodeFilesTable = async (pgClient: any) => {
	const tableExistsQuery = `
    SELECT EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_name = 'code_files'
    );
  `;
	const result = await pgClient.query(tableExistsQuery);
	if (!result.rows[0].exists) {
		const createTableQuery = `
      CREATE TABLE code_files (
        id SERIAL PRIMARY KEY,
        file_name TEXT NOT NULL,
        file_data BYTEA NOT NULL
      );
    `;
		await pgClient.query(createTableQuery);
		console.log("Table 'code_files' created successfully.");
	}
};
