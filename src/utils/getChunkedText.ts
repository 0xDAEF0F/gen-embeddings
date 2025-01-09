import { v4 as uuidv4 } from "uuid";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";

interface TextChunk {
  id: string;
  content: string;
  metadata: {
    type: "paragraph" | "heading" | "list_item" | "other";
    headingLevel?: number;
  };
  path: string;
  startLine: number;
  endLine: number;
  embedding?: number[];
}

export const getChunkedText = async (
  textString: string,
  sourceIdentifier?: string
): Promise<TextChunk[]> => {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
    separators: ["\n\n", "\n", "```", "/*", "*/", "//", " ", ""],
    keepSeparator: true,
  });

  const document = new Document({
    pageContent: textString,
    metadata: { source: sourceIdentifier || "unknown" },
  });

  const chunks: TextChunk[] = [];
  const langchainChunks = await textSplitter.splitDocuments([document]);

  let currentLine = 1;
  langchainChunks.forEach((chunk, index) => {
    const lines = chunk.pageContent.split("\n");
    const startLine = currentLine;
    const endLine = startLine + lines.length - 1;

    let type: TextChunk["metadata"]["type"] = "other";
    const firstLine = lines[0].trim();

    if (firstLine.match(/^#+\s/)) {
      type = "heading";
    } else if (firstLine.match(/^[\-\*]\s/)) {
      type = "list_item";
    } else if (firstLine.length > 0) {
      type = "paragraph";
    }

    chunks.push({
      id: uuidv4(),
      content: chunk.pageContent,
      metadata: { type },
      path: sourceIdentifier || "unknown",
      startLine,
      endLine,
    });

    currentLine = endLine + 1;
  });

  return chunks;
};
