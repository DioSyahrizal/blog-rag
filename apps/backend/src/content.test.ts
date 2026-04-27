import { describe, expect, it } from "vitest";
import { htmlToText, normalizeTags } from "./services/content.js";

describe("content helpers", () => {
  it("normalizes tags", () => {
    expect(normalizeTags([" AI ", "rag", "AI"])).toEqual(["ai", "rag"]);
  });

  it("extracts visible text from html", () => {
    expect(htmlToText("<h1>Hello</h1><p>World</p>")).toContain("Hello");
    expect(htmlToText("<h1>Hello</h1><p>World</p>")).toContain("World");
  });
});
