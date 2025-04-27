import { Client } from "pg";
import { createEmbedding } from "./createEmbedding";

interface CodeChunk {
	id: string;
	content: string;
	metadata: {
		type:
			| "function"
			| "class"
			| "interface"
			| "other"
			| "variable"
			| "expression"
			| "import"
			| "export"
			| "type"
			| "enum";
		functionOrClassName?: string;
	};
	path: string;
	startLine: number;
	endLine: number;
	embedding?: number[];
}

interface DatabaseSettings {
	connectionString: string;
}

interface VectorStoreSettings {
	embeddingDimensions: number;
	tableName: string;
}

interface MetadataFilter {
	[key: string]: string | number | boolean; // Metadata values can be strings, numbers, or booleans
}

class VectorStore {
	private client: Client;
	private settings: {
		database: DatabaseSettings;
		vectorStore: VectorStoreSettings;
	};

	constructor(
		dbSettings: DatabaseSettings,
		vectorStoreSettings: VectorStoreSettings,
	) {
		this.settings = {
			database: dbSettings,
			vectorStore: vectorStoreSettings,
		};

		this.client = new Client({
			connectionString: dbSettings.connectionString,
		});
	}

	async connect(): Promise<void> {
		await this.client.connect();
		// console.log("Connected to database");
	}

	async createTables(): Promise<void> {
		const createTableQuery = `
        CREATE EXTENSION IF NOT EXISTS vector;
        CREATE TABLE IF NOT EXISTS ${this.settings.vectorStore.tableName} (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            path TEXT NOT NULL,
            start_line INTEGER NOT NULL,
            end_line INTEGER NOT NULL,
            metadata JSONB,
            content TEXT NOT NULL,
            embedding vector(${this.settings.vectorStore.embeddingDimensions})
        );
        `;
		try {
			await this.client.query(createTableQuery);
			console.log(
				`Table ${this.settings.vectorStore.tableName} created successfully.`,
			);
		} catch (error) {
			console.error("Error creating table:", error);
		}
	}

	async createIndex(): Promise<void> {
		const createIndexQuery = `
        CREATE INDEX IF NOT EXISTS idx_embedding ON ${this.settings.vectorStore.tableName} 
        USING hnsw (embedding vector_cosine_ops);
        `;

		try {
			await this.client.query(createIndexQuery);
			console.log("Index on embedding column created successfully.");
		} catch (error) {
			console.error("Error creating index:", error);
		}
	}

	async dropIndex(): Promise<void> {
		const dropIndexQuery = `
        DROP INDEX IF EXISTS idx_embedding;
        `;

		try {
			await this.client.query(dropIndexQuery);
			console.log("Index on embedding column dropped successfully.");
		} catch (error) {
			console.error("Error dropping index:", error);
		}
	}

	async upsert(chunks: CodeChunk[]): Promise<void> {
		const insertQuery = `
      INSERT INTO ${this.settings.vectorStore.tableName} (id, path, start_line, end_line, metadata, content, embedding)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        path = EXCLUDED.path,
        start_line = EXCLUDED.start_line,
        end_line = EXCLUDED.end_line,
        metadata = EXCLUDED.metadata,
        content = EXCLUDED.content,
        embedding = EXCLUDED.embedding;
    `;

		try {
			for (const chunk of chunks) {
				// Format the embedding before storing it
				const formattedEmbedding = chunk.embedding
					? `[${chunk.embedding.join(",")}]`
					: null;

				const values = [
					chunk.id,
					chunk.path,
					chunk.startLine,
					chunk.endLine,
					chunk.metadata,
					chunk.content,
					formattedEmbedding, // Store the formatted embedding
				];
				await this.client.query(insertQuery, values);
			}
			console.log(`Upserted ${chunks.length} records`);
		} catch (error) {
			console.error("Error upserting data:", error);
		}
	}

	async search(
		queryText: string,
		limit = 5,
		metadataFilter: MetadataFilter | MetadataFilter[] | null = null,
	): Promise<CodeChunk[]> {
		const queryEmbedding = await createEmbedding(queryText);

		// Format the embedding for pgvector
		const formattedQueryEmbedding = `[${queryEmbedding.join(",")}]`;

		let whereClause = "";
		if (metadataFilter) {
			const conditions: string[] = [];
			if (!Array.isArray(metadataFilter)) {
				// biome-ignore lint:
				metadataFilter = [metadataFilter];
			}

			for (const filterDict of metadataFilter) {
				const condition = Object.entries(filterDict)
					.map(([key, value]) => {
						if (typeof value === "string") {
							return `metadata->>'${key}' = '${value}'`;
						}
						return `metadata->>'${key}' = ${value}`;
					})
					.join(" AND ");
				conditions.push(`(${condition})`);
			}
			whereClause = `WHERE ${conditions.join(" OR ")}`;
		}

		const query = `
      SELECT id, path, start_line, end_line, metadata, content, embedding <-> $1::vector as distance
      FROM ${this.settings.vectorStore.tableName}
      ${whereClause}
      ORDER BY embedding <-> $1::vector
      LIMIT ${limit};
    `;

		const startTime = Date.now();
		try {
			const result = await this.client.query(query, [formattedQueryEmbedding]);
			const elapsedTime = (Date.now() - startTime) / 1000;
			// console.log(`Vector search completed in ${elapsedTime.toFixed(3)} seconds`);
			return result.rows.map((row) => ({
				id: row.id,
				path: row.path,
				startLine: row.start_line,
				endLine: row.end_line,
				metadata: row.metadata,
				content: row.content,
				embedding: row.embedding,
				distance: row.distance,
			}));
		} catch (error) {
			console.error("Error during vector search:", error);
			return [];
		}
	}

	async delete(
		ids?: string[],
		metadataFilter?: object,
		deleteAll?: boolean,
	): Promise<void> {
		if ((ids ? 1 : 0) + (metadataFilter ? 1 : 0) + (deleteAll ? 1 : 0) !== 1) {
			throw new Error(
				"Provide exactly one of: ids, metadataFilter, or deleteAll",
			);
		}

		try {
			if (deleteAll) {
				const deleteQuery = `TRUNCATE TABLE ${this.settings.vectorStore.tableName};`;
				await this.client.query(deleteQuery);
				console.log(
					`Deleted all records from ${this.settings.vectorStore.tableName}`,
				);
			} else if (ids) {
				const deleteQuery = `DELETE FROM ${this.settings.vectorStore.tableName} WHERE id = ANY($1);`;
				await this.client.query(deleteQuery, [ids]);
				console.log(
					`Deleted records with specified IDs from ${this.settings.vectorStore.tableName}`,
				);
			} else if (metadataFilter) {
				const whereClause = Object.entries(metadataFilter)
					.map(([key, value]) => `metadata->>'${key}' = '${value}'`)
					.join(" AND ");
				const deleteQuery = `DELETE FROM ${this.settings.vectorStore.tableName} WHERE ${whereClause};`;
				await this.client.query(deleteQuery);
				console.log(
					`Deleted records matching metadata filter from ${this.settings.vectorStore.tableName}`,
				);
			}
		} catch (error) {
			console.error("Error deleting records:", error);
		}
	}

	async deleteFile(filePath: string): Promise<void> {
		try {
			const deleteQuery = `DELETE FROM ${this.settings.vectorStore.tableName} WHERE path = $1`;
			await this.client.query(deleteQuery, [filePath]);
			console.log(
				`Deleted records with path '${filePath}' from ${this.settings.vectorStore.tableName}`,
			);
		} catch (error) {
			console.error("Error deleting file records:", error);
		}
	}

	async disconnect(): Promise<void> {
		await this.client.end();
		// console.log("Disconnected from database");
	}
}

export {
	VectorStore,
	type CodeChunk,
	type DatabaseSettings,
	type VectorStoreSettings,
	type MetadataFilter,
};
