import { Ollama } from "ollama";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || "llama3.2";

const SYSTEM_PROMPT = `
# Role and Purpose
You are an AI assistant for a developer code search program. Your task is to synthesize a coherent and helpful answer 
based on the given question and relevant context retrieved from a knowledge database.

# Guidelines:
1. Provide a clear and concise answer to the question.
2. Use only the information from the relevant context to support your answer.
3. The context is retrieved based on cosine similarity, so some information might be missing or irrelevant.
4. Be transparent when there is insufficient information to fully answer the question.
5. Do not make up or infer information not present in the provided context.
6. If you cannot answer the question based on the given context, clearly state that.
7. Maintain a helpful and professional tone appropriate for customer service.
8. Adhere strictly to company guidelines and policies by using only the provided knowledge base.
9. Ignore test files as main points of reference and don't use them for context unless there are no other results.

Review the question from the user:
`;

export const generateResponse = async (
	question: string,
	// biome-ignore lint:
	context: any[],
): Promise<string> => {
	const contextStr = JSON.stringify(context, null, 2);

	const messages = [
		{ role: "system", content: SYSTEM_PROMPT },
		{ role: "user", content: `# User question:\n${question}` },
		{ role: "assistant", content: `# Retrieved information:\n${contextStr}` },
		{ role: "assistant", content: "" },
	];

	const ollama = new Ollama({ host: OLLAMA_BASE_URL });
	try {
		const response = await ollama.chat({
			model: OLLAMA_CHAT_MODEL,
			messages: messages,
			stream: false,
		});

		return response.message.content;
	} catch (error) {
		console.error("Error in generateResponse:", error);
		throw error; // Re-throw the error to be handled by the caller
	}
};
