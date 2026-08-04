import { describe, expect, it } from "vitest";
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  getEmbedding,
  getEmbeddingProvider,
} from "../src/embeddings.js";

describe("local embeddings", () => {
  it("defaults to local MiniLM with 384 dims", () => {
    expect(getEmbeddingProvider()).toBe("local");
    expect(EMBEDDING_MODEL).toBe("Xenova/all-MiniLM-L6-v2");
    expect(EMBEDDING_DIMENSIONS).toBe(384);
  });

  it(
    "embeds a query to a finite 384-d vector",
    async () => {
      const vector = await getEmbedding("charming craftsman with mountain views");
      expect(vector).toHaveLength(384);
      expect(vector.every(Number.isFinite)).toBe(true);
    },
    120_000,
  );
});
