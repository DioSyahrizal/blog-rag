import crypto from "node:crypto";
import type { BlogChunk } from "../types.js";

const TARGET_CHUNK_LENGTH = 700;
const OVERLAP_LENGTH = 120;

export function chunkBlog(blogId: string, text: string): BlogChunk[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return [];
  }

  const chunks: BlogChunk[] = [];
  let current = "";

  function pushChunk(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    chunks.push({
      id: crypto.createHash("sha1").update(`${blogId}:${chunks.length}:${trimmed}`).digest("hex"),
      blogId,
      chunkIndex: chunks.length,
      text: trimmed,
    });
  }

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= TARGET_CHUNK_LENGTH) {
      current = candidate;
      continue;
    }

    if (current) {
      pushChunk(current);
      const overlap = current.slice(Math.max(0, current.length - OVERLAP_LENGTH));
      current = `${overlap}\n\n${paragraph}`.trim();
      continue;
    }

    const slices = paragraph.match(new RegExp(`.{1,${TARGET_CHUNK_LENGTH}}`, "g")) ?? [paragraph];
    for (const slice of slices) {
      pushChunk(slice);
    }
    current = "";
  }

  if (current) {
    pushChunk(current);
  }

  return chunks;
}

