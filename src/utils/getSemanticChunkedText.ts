import { v4 as uuidv4 } from "uuid";

interface TextChunk {
	id: string;
	content: string;
	metadata: {
		type: "paragraph" | "heading" | "list_item" | "other";
		headingLevel?: number;
	};
	path: string; // You might repurpose this for a source identifier
	startLine: number;
	endLine: number;
	embedding?: number[];
}

export const getSemanticChunkedText = async (
	textString: string,
	sourceIdentifier?: string,
): Promise<TextChunk[]> => {
	const chunks: TextChunk[] = [];
	// @ts-ignore
	const { chunkit } = await import("semantic-chunking");

	const results = await chunkit(
		[
			{
				document_name: sourceIdentifier || "unknown",
				document_text: textString,
			},
		],
		{
			maxTokens: 500,
		},
	);

	let currentLine = 1;
	for (const chunk of results) {
		const lines = chunk.text.split("\n");
		const startLine = currentLine;
		const endLine = startLine + lines.length - 1;

		chunks.push({
			id: uuidv4(),
			content: chunk.text,
			metadata: { type: "paragraph" },
			path: sourceIdentifier || "unknown",
			startLine,
			endLine,
		});

		currentLine = endLine + 1;
	}

	return chunks;
};
