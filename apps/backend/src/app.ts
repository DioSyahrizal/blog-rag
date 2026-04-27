import cors from "@fastify/cors";
import Fastify from "fastify";
import { config } from "./config.js";
import { askRoutes } from "./routes/ask.js";
import { blogRoutes } from "./routes/blogs.js";
import { AskService } from "./services/ask.js";
import { OpenAIEmbeddingProvider } from "./services/embeddings.js";
import { IndexingService } from "./services/indexing.js";
import { BlogQdrantStore } from "./services/qdrant.js";

declare module "fastify" {
  interface FastifyInstance {
    askService: AskService;
    indexing: IndexingService;
  }
}

export async function buildApp() {
  const app = Fastify({ logger: true });
  const embeddings = new OpenAIEmbeddingProvider();
  const qdrant = new BlogQdrantStore();
  const askService = new AskService(embeddings, qdrant);
  const indexing = new IndexingService(embeddings, qdrant);

  app.decorate("askService", askService);
  app.decorate("indexing", indexing);

  await app.register(cors, {
    origin: config.FRONTEND_ORIGIN,
  });

  app.get("/health", async () => ({ ok: true }));
  await app.register(blogRoutes, { prefix: "/api" });
  await app.register(askRoutes, { prefix: "/api" });

  return app;
}

