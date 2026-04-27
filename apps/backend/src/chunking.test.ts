import { describe, expect, it } from "vitest";
import { chunkBlog } from "./services/chunking.js";

describe("chunkBlog", () => {
  it("splits long content into multiple chunks", () => {
    const text = new Array(12).fill("This is a paragraph with enough text to create a useful retrieval chunk.").join("\n\n");
    const chunks = chunkBlog("blog-1", text);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.text.length).toBeGreaterThan(20);
  });
});

