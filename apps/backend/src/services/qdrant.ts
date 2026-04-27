import { QdrantClient } from "@qdrant/js-client-rest";
import { config } from "../config.js";
import type { BlogChunk, BlogRecord } from "../types.js";

export interface ScoredChunkPayload {
  blog_id: string;
  name: string;
  title: string;
  tags: string[];
  chunk_index: number;
  content_snippet: string;
  status: string;
}

export class BlogQdrantStore {
  private client = new QdrantClient({ url: config.QDRANT_URL });
  private collection = config.QDRANT_COLLECTION;
  private vectorSize: number | null = null;

  async ensureCollection(vectorSize: number) {
    this.vectorSize = vectorSize;
    const collections = await this.client.getCollections();
    const exists = collections.collections.some((item) => item.name === this.collection);

    if (exists) {
      return;
    }

    await this.client.createCollection(this.collection, {
      vectors: {
        size: vectorSize,
        distance: "Cosine",
      },
    });
  }

  async replaceBlogChunks(blog: BlogRecord, chunks: BlogChunk[], vectors: number[][]) {
    if (!this.vectorSize && vectors[0]) {
      await this.ensureCollection(vectors[0].length);
    }

    await this.deleteBlog(blog.id);

    if (chunks.length === 0) {
      return;
    }

    await this.client.upsert(this.collection, {
      wait: true,
      points: chunks.map((chunk, index) => ({
        id: chunk.id,
        vector: vectors[index],
        payload: {
          blog_id: blog.id,
          name: blog.name,
          title: blog.title,
          tags: blog.tags,
          chunk_index: chunk.chunkIndex,
          content_snippet: chunk.text,
          status: "published",
        },
      })),
    });
  }

  async deleteBlog(blogId: string) {
    await this.client.delete(this.collection, {
      wait: true,
      filter: {
        must: [
          {
            key: "blog_id",
            match: {
              value: blogId,
            },
          },
        ],
      },
    }).catch((error: unknown) => {
      if (
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        error.status === 404
      ) {
        return;
      }

      if (error instanceof Error && error.message.includes("doesn't exist")) {
        return;
      }

      throw error;
    });
  }

  async search(questionVector: number[], tags: string[], limit = 6) {
    if (!this.vectorSize) {
      await this.ensureCollection(questionVector.length);
    }

    const must = [
      {
        key: "status",
        match: {
          value: "published",
        },
      },
    ];

    if (tags.length > 0) {
      must.push({
        key: "tags",
        match: {
          any: tags,
        },
      } as never);
    }

    return this.client.search(this.collection, {
      vector: questionVector,
      limit,
      with_payload: true,
      filter: {
        must,
      },
    });
  }
}
