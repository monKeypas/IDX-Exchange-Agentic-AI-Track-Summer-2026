import { describe, expect, it } from "vitest";
import { cosineSimilarity, rankByCosineSimilarity } from "../src/cosine.js";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("handles mismatched lengths as 0", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });
});

describe("rankByCosineSimilarity", () => {
  it("returns top_k ids by descending score", () => {
    const query = [1, 0];
    const ranked = rankByCosineSimilarity(
      query,
      [
        { id: "a", embedding: [0.9, 0.1] },
        { id: "b", embedding: [0.1, 0.9] },
        { id: "c", embedding: [1, 0] },
      ],
      2,
    );
    expect(ranked.map((r) => r.id)).toEqual(["c", "a"]);
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });
});
