import type { FastifyPluginAsync } from "fastify";
import { askSchema } from "../schemas.js";
import { normalizeTags } from "../services/content.js";

export const askRoutes: FastifyPluginAsync = async (app) => {
  app.post("/ask", async (request, reply) => {
    const parsed = askSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: parsed.error.flatten() });
    }

    const result = await app.askService.ask(parsed.data.question, normalizeTags(parsed.data.tags));
    return result;
  });
};

