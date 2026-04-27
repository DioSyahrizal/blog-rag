import crypto from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import {
  deleteBlog,
  getBlogById,
  getBlogByName,
  insertBlog,
  listBlogs,
  markIndexState,
  updateBlog,
} from "../db.js";
import { blogInputSchema } from "../schemas.js";
import { ensurePublishable, htmlToText, normalizeTags } from "../services/content.js";

export const blogRoutes: FastifyPluginAsync = async (app) => {
  app.get("/blogs", async () => {
    return { blogs: await listBlogs() };
  });

  app.get<{ Params: { id: string } }>("/blogs/:id", async (request, reply) => {
    const blog = await getBlogById(request.params.id);
    if (!blog) {
      return reply.code(404).send({ message: "Blog not found" });
    }

    return { blog };
  });

  app.post("/blogs", async (request, reply) => {
    const parsed = blogInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: parsed.error.flatten() });
    }

    const tags = normalizeTags(parsed.data.tags);
    const contentText = htmlToText(parsed.data.contentHtml);
    if (parsed.data.status === "published" && !ensurePublishable(contentText, parsed.data.title)) {
      return reply.code(400).send({ message: "Published blogs need title and content." });
    }

    const existing = await getBlogByName(parsed.data.name);
    if (existing) {
      return reply.code(409).send({ message: "Blog name already exists" });
    }

    const indexStatus = parsed.data.status === "published" ? "pending" : "idle";
    const blog = await insertBlog({
      id: crypto.randomUUID(),
      name: parsed.data.name,
      title: parsed.data.title,
      contentHtml: parsed.data.contentHtml,
      contentText,
      status: parsed.data.status,
      tags,
      indexStatus,
    });

    if (blog.status === "published") {
      app.indexing.enqueue(blog.id);
    }

    return reply.code(201).send({ blog });
  });

  app.put<{ Params: { id: string } }>("/blogs/:id", async (request, reply) => {
    const parsed = blogInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: parsed.error.flatten() });
    }

    const current = await getBlogById(request.params.id);
    if (!current) {
      return reply.code(404).send({ message: "Blog not found" });
    }

    const byName = await getBlogByName(parsed.data.name);
    if (byName && byName.id !== current.id) {
      return reply.code(409).send({ message: "Blog name already exists" });
    }

    const tags = normalizeTags(parsed.data.tags);
    const contentText = htmlToText(parsed.data.contentHtml);
    if (parsed.data.status === "published" && !ensurePublishable(contentText, parsed.data.title)) {
      return reply.code(400).send({ message: "Published blogs need title and content." });
    }

    const nextIndexStatus = parsed.data.status === "published" ? "pending" : "idle";
    const blog = await updateBlog(current.id, {
      name: parsed.data.name,
      title: parsed.data.title,
      contentHtml: parsed.data.contentHtml,
      contentText,
      status: parsed.data.status,
      tags,
      indexStatus: nextIndexStatus,
      indexError: null,
    });

    if (!blog) {
      return reply.code(404).send({ message: "Blog not found" });
    }

    if (blog.status === "published") {
      app.indexing.enqueue(blog.id);
    } else {
      await app.indexing.removeBlog(blog.id);
      await markIndexState(blog.id, { status: "idle", error: null });
    }

    return { blog };
  });

  app.delete<{ Params: { id: string } }>("/blogs/:id", async (request, reply) => {
    const blog = await deleteBlog(request.params.id);
    if (!blog) {
      return reply.code(404).send({ message: "Blog not found" });
    }

    await app.indexing.removeBlog(blog.id);
    return reply.code(204).send();
  });
};

