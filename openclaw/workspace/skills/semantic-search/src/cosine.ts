/** Cosine similarity in [-1, 1]. Returns 0 for zero-length vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function rankByCosineSimilarity(
  queryVec: number[],
  items: Array<{ id: string; embedding: number[] }>,
  topK = 5,
): Array<{ id: string; score: number }> {
  const scored = items.map((item) => ({
    id: item.id,
    score: cosineSimilarity(queryVec, item.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(1, topK));
}
