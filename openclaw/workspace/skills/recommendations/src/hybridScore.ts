import { cosineSimilarity } from "../../semantic-search/src/cosine.js";

/** Structured listing fields used by the handbook hybrid scorer. */
export interface HybridListingFields {
  L_SystemPrice: number | null;
  L_Keyword2: number | null;
  L_City: string | null;
  LM_Int2_3: number | null;
}

/**
 * Hybrid similarity: structured cues (~60 pts max) + embedding cosine (~40 pts max).
 * Mirrors the Week 7 handbook formula (without sklearn).
 */
export function calculateSimilarityScore(
  target: HybridListingFields,
  candidate: HybridListingFields,
  targetEmb: number[],
  candidateEmb: number[],
): number {
  let score = 0;

  if (target.L_SystemPrice != null && candidate.L_SystemPrice != null) {
    const priceDiff = Math.abs(target.L_SystemPrice - candidate.L_SystemPrice);
    if (priceDiff < 50_000) score += 20;
    else if (priceDiff < 150_000) score += 12;
    else if (priceDiff < 300_000) score += 5;
  }

  if (
    target.L_Keyword2 != null &&
    candidate.L_Keyword2 != null &&
    target.L_Keyword2 === candidate.L_Keyword2
  ) {
    score += 15;
  }

  if (
    target.L_City &&
    candidate.L_City &&
    target.L_City.trim().toLowerCase() === candidate.L_City.trim().toLowerCase()
  ) {
    score += 15;
  }

  if (target.LM_Int2_3 != null && candidate.LM_Int2_3 != null) {
    const sqftDiff = Math.abs(target.LM_Int2_3 - candidate.LM_Int2_3);
    if (sqftDiff < 300) score += 10;
    else if (sqftDiff < 700) score += 5;
  }

  const semSim = cosineSimilarity(targetEmb, candidateEmb);
  score += semSim * 40;

  return Math.round(score * 100) / 100;
}
