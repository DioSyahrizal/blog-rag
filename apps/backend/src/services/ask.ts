import type { AskCitation } from "../types.js";
import type { EmbeddingProvider } from "./embeddings.js";
import { BlogQdrantStore, type ScoredChunkPayload } from "./qdrant.js";

interface ChunkHit {
  blogId: string;
  title: string;
  name: string;
  tags: string[];
  snippet: string;
  chunkIndex: number;
  score: number;
}

export class AskService {
  constructor(
    private readonly embeddings: EmbeddingProvider,
    private readonly qdrant: BlogQdrantStore,
  ) {}

  async ask(question: string, tags: string[]) {
    const questionVector = await this.embeddings.embed(question);
    const results = await this.qdrant.search(questionVector, tags, 6);

    const chunkHits: ChunkHit[] = results
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
      .filter((item): item is ChunkHit => item !== null);

    const grouped = new Map<
      string,
      {
        title: string;
        name: string;
        tags: string[];
        topScore: number;
        bestSnippet: string;
        chunks: ChunkHit[];
      }
    >();

    for (const hit of chunkHits) {
      const existing = grouped.get(hit.blogId);
      if (!existing) {
        grouped.set(hit.blogId, {
          title: hit.title,
          name: hit.name,
          tags: hit.tags,
          topScore: hit.score,
          bestSnippet: hit.snippet,
          chunks: [hit],
        });
        continue;
      }

      existing.chunks.push(hit);
      if (hit.score > existing.topScore) {
        existing.topScore = hit.score;
        existing.bestSnippet = hit.snippet;
      }
    }

    const rankedBlogs = [...grouped.entries()]
      .map(([blogId, value]) => ({
        blogId,
        title: value.title,
        name: value.name,
        tags: value.tags,
        score: value.topScore,
        snippet: value.bestSnippet,
        chunkCount: value.chunks.length,
        chunks: value.chunks.sort((left, right) => right.score - left.score).slice(0, 2),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);

    const citations: AskCitation[] = rankedBlogs.map((blog) => ({
      blogId: blog.blogId,
      title: blog.title,
      name: blog.name,
      tags: blog.tags,
      snippet: blog.snippet,
      score: blog.score,
      chunkCount: blog.chunkCount,
    }));

    const highConfidence = citations.some((citation) => citation.score >= 0.35);
    if (!highConfidence) {
      return {
        answer: "I couldn't find enough grounded context in the published blogs to answer that confidently.",
        citations,
      };
    }

    const context = rankedBlogs
      .map((blog, index) => {
        const snippets = blog.chunks
          .map((chunk, chunkIndex) => `Snippet ${chunkIndex + 1}: ${chunk.snippet}`)
          .join("\n");

        return `[Source ${index + 1}] ${blog.title} (${blog.name})\nTags: ${blog.tags.join(", ")}\n${snippets}`;
      })
      .join("\n\n");

    const answer = await this.embeddings.answerQuestion({ question, context });
    return { answer, citations };
  }
}
