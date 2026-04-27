import { z } from "zod";

const namePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const blogInputSchema = z.object({
  name: z.string().min(2).max(80).regex(namePattern, "Use lowercase slug format"),
  title: z.string().trim().min(1).max(160),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  contentHtml: z.string().default(""),
  status: z.enum(["draft", "published"]).default("draft"),
});

export const askSchema = z.object({
  question: z.string().trim().min(3).max(2000),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
});

export type BlogInput = z.infer<typeof blogInputSchema>;
export type AskInput = z.infer<typeof askSchema>;

