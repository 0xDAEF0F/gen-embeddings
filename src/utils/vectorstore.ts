import { Client } from "pg";
import { createOpenAiEmbedding } from "./createEmbedding";

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
		console.log("Connected to database");
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
		maxTokens = 5000,
	): Promise<CodeChunk[]> {
		const queryEmbedding = await createOpenAiEmbedding(
			queryText,
			"text-embedding-3-small",
		);

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

		// Implement token-aware retrieval
		const batchSize = Math.min(limit, 10); // Start with a reasonable batch size
		let offset = 0;
		let currentTokenCount = 0;
		const resultChunks: CodeChunk[] = [];

		while (currentTokenCount < maxTokens) {
			const query = `
        SELECT id, path, start_line, end_line, metadata, content, embedding <-> $1::vector as distance
        FROM ${this.settings.vectorStore.tableName}
        ${whereClause}
        ORDER BY embedding <-> $1::vector
        LIMIT ${batchSize} OFFSET ${offset};
      `;

			try {
				const result = await this.client.query(query, [
					formattedQueryEmbedding,
				]);

				if (result.rows.length === 0) {
					break;
				}

				for (const row of result.rows) {
					const chunk = {
						id: row.id,
						path: row.path,
						startLine: row.start_line,
						endLine: row.end_line,
						metadata: row.metadata,
						content: row.content,
						embedding: row.embedding,
						distance: row.distance,
					};

					// Calculate tokens for this chunk and add to total
					const chunkTokens = this.roughTokenCount(row.content);

					console.log(`Chunk tokens: ${chunkTokens}`);

					// Add to results if we haven't exceeded maxTokens
					resultChunks.push(chunk);
					currentTokenCount += chunkTokens;

					if (currentTokenCount >= maxTokens) {
						break;
					}
				}

				offset += batchSize;

				if (result.rows.length < batchSize || resultChunks.length >= limit) {
					console.log({
						resultRowLength: result.rows.length,
						resultChunksLength: resultChunks.length,
						batchSize,
						maxTokens,
					});
					break;
				}
			} catch (error) {
				console.error("Error during vector search:", error);
				break;
			}
		}

		return resultChunks;
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
		console.log("Disconnected from database");
	}

	// Fast. Just a heuristic. Not exact.
	roughTokenCount(text: string) {
		const chars = text.length;
		return Math.ceil(chars / 4);
	}
}

export {
	VectorStore,
	type CodeChunk,
	type DatabaseSettings,
	type VectorStoreSettings,
	type MetadataFilter,
};
