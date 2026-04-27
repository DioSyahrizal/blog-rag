import { findPublishedBlogsNeedingIndex, getBlogById, markIndexState } from "../db.js";
import { chunkBlog } from "./chunking.js";
import type { EmbeddingProvider } from "./embeddings.js";
import { BlogQdrantStore } from "./qdrant.js";

export class IndexingService {
  private queue = new Set<string>();
  private running = false;

  constructor(
    private readonly embeddings: EmbeddingProvider,
    private readonly qdrant: BlogQdrantStore,
  ) {}

  async bootstrap() {
    const blogs = await findPublishedBlogsNeedingIndex();
    for (const blog of blogs) {
      this.enqueue(blog.id);
    }
  }

  enqueue(blogId: string) {
    this.queue.add(blogId);
    void this.drain();
  }

  async removeBlog(blogId: string) {
    this.queue.delete(blogId);
    await this.qdrant.deleteBlog(blogId);
  }

  private async drain() {
    if (this.running) {
      return;
    }

    this.running = true;
    try {
      while (this.queue.size > 0) {
        const [blogId] = this.queue;
        this.queue.delete(blogId);
        await this.processBlog(blogId);
      }
    } finally {
      this.running = false;
    }
  }

  private async processBlog(blogId: string) {
    const blog = await getBlogById(blogId);
    if (!blog) {
      await this.qdrant.deleteBlog(blogId);
      return;
    }

    if (blog.status !== "published") {
      await this.qdrant.deleteBlog(blogId);
      await markIndexState(blog.id, { status: "idle", error: null });
      return;
    }

    try {
      await markIndexState(blog.id, { status: "processing", error: null });
      const chunks = chunkBlog(blog.id, blog.content_text);
      const vectors = chunks.length > 0 ? await this.embeddings.embedMany(chunks.map((chunk) => chunk.text)) : [];
      await this.qdrant.replaceBlogChunks(blog, chunks, vectors);
      await markIndexState(blog.id, { status: "ready", error: null, indexed: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown indexing error";
      await markIndexState(blog.id, { status: "failed", error: message });
    }
  }
}

