import type { AskCitation } from "../types.js";
import type { EmbeddingProvider } from "./embeddings.js";
import { BlogQdrantStore, type ScoredChunkPayload } from "./qdrant.js";

export class AskService {
  constructor(
    private readonly embeddings: EmbeddingProvider,
    private readonly qdrant: BlogQdrantStore,
  ) {}

  async ask(question: string, tags: string[]) {
    const questionVector = await this.embeddings.embed(question);
    const results = await this.qdrant.search(questionVector, tags, 6);

    const citations: AskCitation[] = results
      .map((result) => {
        const payload = result.payload as ScoredChunkPayload | undefined;
        if (!payload) {
          return null;
        }

        return {
          blogId: payload.blog_id,
          title: payload.title,
          name: payload.name,
          tags: payload.tags,
          snippet: payload.content_snippet,
          chunkIndex: payload.chunk_index,
          score: typeof result.score === "number" ? result.score : 0,
        };
      })
      .filter((item): item is AskCitation => item !== null);

    const highConfidence = citations.some((citation) => citation.score >= 0.35);
    if (!highConfidence) {
      return {
        answer: "I couldn't find enough grounded context in the published blogs to answer that confidently.",
        citations,
      };
    }

    const context = citations
      .map((citation, index) => {
        return `[Source ${index + 1}] ${citation.title} (${citation.name})\nTags: ${citation.tags.join(", ")}\n${citation.snippet}`;
      })
      .join("\n\n");

    const answer = await this.embeddings.answerQuestion({ question, context });
    return { answer, citations };
  }
}

