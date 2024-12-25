interface OllamaEmbeddingResponse {
  embedding: number[];
}

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'mxbai-embed-large';

export const createEmbedding = async (
  prompt: string,
  model: string = OLLAMA_EMBEDDING_MODEL,
  llmBaseUrl: string = OLLAMA_BASE_URL,
  options?: object,
): Promise<number[]> => {
  const url = `${llmBaseUrl}/api/embeddings`;

  const body = {
    model: model,
    prompt: prompt,
    options: options,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Ollama API request failed with status ${response.status}: ${errorText}`,
    );
  }

  const data: OllamaEmbeddingResponse = await response.json();

  return data.embedding;
}
