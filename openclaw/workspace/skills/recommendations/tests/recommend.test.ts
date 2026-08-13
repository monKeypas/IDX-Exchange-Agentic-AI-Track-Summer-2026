import { describe, expect, it } from "vitest";
import { calculateSimilarityScore } from "../src/hybridScore.js";
import { extractLikedDescription } from "../src/resolveTarget.js";
import { formatCompAssessment } from "../src/comps.js";
import { formatRecommendReply } from "../src/recommend.js";

describe("extractLikedDescription", () => {
  it("strips recommendation boilerplate", () => {
    expect(extractLikedDescription("I like 257 Fay Way in Mountain View, find me similar homes")).toBe(
      "257 Fay Way in Mountain View",
    );
  });

  it("keeps 'in City' for address resolution", () => {
    expect(extractLikedDescription("I like 257 Fay Way in Mountain View")).toContain("in Mountain View");
  });

  it("keeps descriptive cues", () => {
    expect(extractLikedDescription("Recommend homes like a charming craftsman")).toMatch(
      /charming craftsman/i,
    );
  });
});

describe("calculateSimilarityScore", () => {
  const target = {
    L_SystemPrice: 1_000_000,
    L_Keyword2: 3,
    L_City: "Irvine",
    LM_Int2_3: 1800,
  };

  it("scores a near-identical candidate near the structured max plus semantic", () => {
    const emb = [1, 0, 0];
    const score = calculateSimilarityScore(
      target,
      { ...target, L_SystemPrice: 1_020_000 },
      emb,
      emb,
    );
    // price <50k:20 + beds:15 + city:15 + sqft<300:10 + cosine1*40 = 100
    expect(score).toBe(100);
  });

  it("gives less structured credit for distant price/city", () => {
    const score = calculateSimilarityScore(
      target,
      {
        L_SystemPrice: 2_000_000,
        L_Keyword2: 2,
        L_City: "Oakland",
        LM_Int2_3: 3000,
      },
      [1, 0],
      [0, 1],
    );
    expect(score).toBe(0);
  });
});

describe("formatCompAssessment", () => {
  it("labels in-line comps", () => {
    expect(formatCompAssessment(12, 2)).toBe("In line with recent comps");
  });

  it("handles missing comps", () => {
    expect(formatCompAssessment(0, null)).toMatch(/Not enough/);
  });
});

describe("formatRecommendReply", () => {
  it("includes hybrid score and comps lines", () => {
    const reply = formatRecommendReply(
      {
        id: "t1",
        source: "semantic",
        address: "1 Main St, Irvine, 92602",
        city: "Irvine",
        price: 1_000_000,
        beds: 3,
        baths: 2,
        sqft: 1800,
      },
      [
        {
          id: "c1",
          score: 88.5,
          address: "2 Oak Ave, Irvine, 92602",
          city: "Irvine",
          zip: "92602",
          price: 990_000,
          beds: 3,
          baths: 2,
          sqft: 1750,
          photoCount: 10,
          comps: {
            compPrice: 970_000,
            listPrice: 990_000,
            compCount: 8,
            deltaPct: 2.1,
            assessment: "In line with recent comps",
          },
        },
      ],
    );
    expect(reply).toContain("Top 5 hybrid recommendations");
    expect(reply).toContain("hybrid score 88.5");
    expect(reply).toContain("In line with recent comps");
  });
});
