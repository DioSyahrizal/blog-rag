import OpenAI from "openai";
import { config } from "../config.js";

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedMany(texts: string[]): Promise<number[][]>;
  answerQuestion(input: { question: string; context: string }): Promise<string>;
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private client = new OpenAI({ apiKey: config.OPENAI_API_KEY });

  async embed(text: string): Promise<number[]> {
    const result = await this.client.embeddings.create({
      model: config.OPENAI_EMBEDDING_MODEL,
      input: text,
    });

    return result.data[0].embedding;
  }

  async embedMany(texts: string[]): Promise<number[][]> {
    const result = await this.client.embeddings.create({
      model: config.OPENAI_EMBEDDING_MODEL,
      input: texts,
    });

    return result.data.map((item) => item.embedding);
  }

  async answerQuestion(input: { question: string; context: string }) {
    const response = await this.client.responses.create({
      model: config.OPENAI_CHAT_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "Answer only from the provided context. If the context is insufficient, say that clearly. Cite blog titles naturally in the answer when useful.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Question:\n${input.question}\n\nContext:\n${input.context}`,
            },
          ],
        },
      ],
    });

    return response.output_text.trim();
  }
}

